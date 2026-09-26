import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AlertTriangle, Play, Square, Users, ArrowLeft } from 'lucide-react';

// Subcomponents
import DynamicVisuals from '../components/study/DynamicVisuals';
import ParticipantsGrid from '../components/study/ParticipantsGrid';
import AmbientAudio from '../components/study/AmbientAudio';
import JotterPanel from '../components/study/JotterPanel';
import PostSprintChat from '../components/study/PostSprintChat';
import WelcomeBountyModal from '../components/study/WelcomeBountyModal';

const ROOM_ID = 'global-study-room'; // Replace with dynamic ID for private rooms
const PENALTY_THRESHOLD_MS = 30000; // 30 seconds hidden = failed

export default function StudyRoom() {
  const { currentUser } = useOutletContext() || {};
  const navigate = useNavigate();
  
  // -- State: Core Timer & Anti-Cheat --
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('idle'); // 'idle' | 'running' | 'failed' | 'completed'
  const [taskIntent, setTaskIntent] = useState("Getting work done");
  
  // -- State: Multiplayer Presence --
  const [participants, setParticipants] = useState({});
  const channelRef = useRef(null);
  
  // -- Refs for Anti-Cheat Mechanics --
  const hiddenTimestampRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const currentSessionIdRef = useRef(null); // Track the active row in `study_sessions`

  // ==========================================
  // 1. SUPABASE REALTIME PRESENCE
  // ==========================================
  useEffect(() => {
    if (!currentUser?.id) return;

    // Initialize the channel for this specific room
    const roomChannel = supabase.channel(`room:${ROOM_ID}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });
    
    channelRef.current = roomChannel;

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        setParticipants(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`${key} joined the room!`);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`${key} left the room.`);
      })
      // Listen for custom "Cheer" broadcasts
      .on('broadcast', { event: 'cheer' }, (payload) => {
        if (payload.payload.targetUserId === currentUser.id) {
          console.log(`Received a ${payload.payload.emoji} from ${payload.payload.fromName}!`);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the local user's state
          await roomChannel.track({
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            intent: taskIntent,
            status: isTimerRunning ? 'focusing' : 'idle',
            joined_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [currentUser, taskIntent, isTimerRunning]);


  // ==========================================
  // 2. ANTI-CHEAT: PAGE VISIBILITY API
  // ==========================================
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!isTimerRunning) return;

      if (document.hidden) {
        // User switched tabs. Start the penalty clock.
        hiddenTimestampRef.current = Date.now();
        console.warn("User switched tabs. Anti-cheat countdown started.");
      } else {
        // User came back. Check if they were gone too long.
        if (hiddenTimestampRef.current) {
          const timeAway = Date.now() - hiddenTimestampRef.current;
          
          if (timeAway >= PENALTY_THRESHOLD_MS) {
            // CHEAT DETECTED
            handleCheatDetected();
          } else {
            console.log(`User returned safely within ${timeAway}ms`);
          }
          hiddenTimestampRef.current = null; // Reset
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTimerRunning]);

  const handleCheatDetected = async () => {
    setIsTimerRunning(false);
    setSessionStatus('failed');
    
    // Update Supabase to flag the failed session
    if (currentSessionIdRef.current) {
      await supabase.from('study_sessions').update({ 
        status: 'failed', 
        failed_reason: 'tab_switched' 
      }).eq('id', currentSessionIdRef.current);
    }

    // Update Presence to show failure
    if (channelRef.current) {
      await channelRef.current.track({
        ...currentUser,
        status: 'failed'
      });
    }

    alert("🚨 Session Failed: You left the tab for more than 30 seconds! Focus means focus.");
  };


  // ==========================================
  // 3. TIMER ENGINE & RPC REWARDS
  // ==========================================
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      // SPRINT COMPLETED!
      handleSprintComplete();
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, timeLeft]);

  const handleSprintComplete = async () => {
    setIsTimerRunning(false);
    setSessionStatus('completed');
    
    // Call the secure RPC to calculate and award C-Coins
    if (currentSessionIdRef.current) {
      const { data, error } = await supabase.rpc('complete_study_session', { 
        p_session_id: currentSessionIdRef.current 
      });
      
      if (!error) {
        console.log("Earned coins:", data.awarded_coins);
      }
    }
  };

  const startSprint = async () => {
    if (!currentUser?.id) return;
    
    // Instantiate the session in DB
    const { data, error } = await supabase.from('study_sessions').insert({
      user_id: currentUser.id,
      room_id: ROOM_ID,
      intended_minutes: 25,
      task_intent: taskIntent,
      status: 'active'
    }).select().single();

    if (!error && data) {
      currentSessionIdRef.current = data.id;
      setIsTimerRunning(true);
      setSessionStatus('running');
    } else {
      // Fallback if DB fails or offline, start timer locally
      setIsTimerRunning(true);
      setSessionStatus('running');
    }
  };


  // ==========================================
  // UI RENDER 
  // ==========================================
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      
      <WelcomeBountyModal />

      {/* 1. Dynamic Visuals (Background) */}
      <DynamicVisuals isTimerRunning={isTimerRunning} timeLeft={timeLeft} totalTime={25 * 60} />

      {/* Realtime Participants Grid */}
      <ParticipantsGrid participants={participants} currentUser={currentUser} />

      {/* 2. Top Header & Task Input */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-900/60 rounded-full hover:bg-slate-800 transition">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Deep Work Room</h1>
            {isTimerRunning ? (
              <div className="mt-2 text-indigo-400 font-medium">🎯 {taskIntent}</div>
            ) : (
              <input 
                type="text" 
                value={taskIntent}
                onChange={(e) => setTaskIntent(e.target.value)}
                className="mt-2 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-indigo-500"
                placeholder="What are you working on?"
              />
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-full border border-slate-800">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">{Object.keys(participants).length} Focusing</span>
        </div>
      </div>

      {/* 3. Center Timer Engine */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        <div className="text-[100px] sm:text-[140px] font-black tracking-tighter tabular-nums drop-shadow-2xl">
          {formatTime(timeLeft)}
        </div>
        
        <div className="mt-8 flex gap-4">
          {!isTimerRunning && sessionStatus !== 'completed' && (
            <button 
              onClick={startSprint}
              className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              <Play className="w-5 h-5" /> Start Focus
            </button>
          )}
          
          {isTimerRunning && (
            <button 
              onClick={() => setIsTimerRunning(false)}
              className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 px-8 py-4 rounded-full font-bold hover:bg-red-500/30 transition-colors"
            >
              <Square className="w-5 h-5" /> Give Up
            </button>
          )}
        </div>

        {sessionStatus === 'failed' && (
          <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-bottom-2">
            <AlertTriangle className="w-5 h-5" /> Penalty applied for leaving the app. Focus means focus.
          </div>
        )}
      </div>

      {/* 4. Utilities: Audio, Chat, and Jotter */}
      <div className="relative z-10 p-6 flex justify-between items-end mt-auto">
        <div className="w-64 hidden md:block">
           <AmbientAudio />
        </div>
        
        <div className="flex-1 max-w-md hidden lg:block mx-4">
           <PostSprintChat isDisabled={isTimerRunning} currentUser={currentUser} roomId={ROOM_ID} />
        </div>
        
        <div className="hidden md:block">
           <JotterPanel />
        </div>
      </div>

    </div>
  );
}
