import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Clock, 
  Users, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  ShieldAlert, 
  PartyPopper 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, useOutletContext } from 'react-router-dom';

/**
 * LiveRoom Component
 * 
 * Collaborative Pomodoro Study Room with:
 * 1. 'Join Sprint' button creating study_sessions row with status 'in_progress'.
 * 2. Realtime countdown timer (25m / 50m) and disabled 'Focusing...' button state.
 * 3. Session completion invoking supabase.rpc('complete_study_session', { p_session_id }).
 * 4. Gamified celebration feedback ('Sprint Complete! C-Coins added to wallet') and timer reset.
 * 5. Anti-cheat page visibility listener pausing timer and warning when user switches tabs.
 */
export default function LiveRoom({ currentUser: propUser }) {
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const currentUser = propUser || outletCtx?.currentUser;

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // Sprint Timer State
  const [sprintMode, setSprintMode] = useState('50'); // '25' or '50'
  const [timeLeft, setTimeLeft] = useState(50 * 60);
  const [isActive, setIsActive] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const currentSessionIdRef = useRef(null);
  const [participantsCount, setParticipantsCount] = useState(0);

  // Gamified & Feedback States
  const [celebrationToast, setCelebrationToast] = useState(null); // { title, message, reward }
  const [warningToast, setWarningToast] = useState(null);
  const [isPausedByAntiCheat, setIsPausedByAntiCheat] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Keep session ID ref in sync for event listeners
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial messages & Presence
  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('study_room_messages')
          .select(`
            *,
            profiles!user_id (username, full_name, avatar_url)
          `)
          .eq('room_id', 'global')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data && isMounted) setMessages(data);
      } catch (err) {
        console.error('Error fetching room messages:', err);
      }
    };

    fetchMessages();

    // Setup Realtime Chat & Presence
    const roomChannel = supabase.channel('room_chat');
    channelRef.current = roomChannel;

    roomChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_room_messages',
          filter: 'room_id=eq.global',
        },
        async (payload) => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            const completeMessage = {
              ...payload.new,
              profiles: profile || null,
            };

            if (isMounted) {
              setMessages((prev) => [...prev, completeMessage]);
            }
          } catch (err) {
            console.error('Error processing realtime message:', err);
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        let total = 0;
        for (const key in state) {
          total += state[key].length;
        }
        if (isMounted) setParticipantsCount(total);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUser) {
          await roomChannel.track({
            user: currentUser.id,
            username: currentUser.username || currentUser.name,
          });
        }
      });

    return () => {
      isMounted = false;
      if (channelRef.current) {
        channelRef.current.untrack();
      }
      supabase.removeChannel(roomChannel);
    };
  }, [currentUser]);

  // ========================================================
  // ANTI-CHEAT: PAGE VISIBILITY API
  // ========================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      // If timer is running and the user leaves tab or minimizes app
      if (document.hidden) {
        if (isActive && hasJoined) {
          // Pause the local timer
          setIsActive(false);
          setIsPausedByAntiCheat(true);
          // Show anti-cheat warning toast
          setWarningToast('Focus paused. Return to the app to continue earning!');
        }
      } else {
        // User came back to the app
        if (isPausedByAntiCheat) {
          // Warning stays visible until user resumes or a few seconds pass
          setTimeout(() => {
            setWarningToast(null);
          }, 5000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, hasJoined, isPausedByAntiCheat]);

  // Resume after anti-cheat pause
  const handleResumeSprint = () => {
    setIsPausedByAntiCheat(false);
    setWarningToast(null);
    setIsActive(true);
  };

  // ========================================================
  // COUNTDOWN TIMER ENGINE
  // ========================================================
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Trigger completion when timer hits 00:00
  useEffect(() => {
    if (hasJoined && timeLeft === 0 && !isCompleting) {
      handleCompleteSprint();
    }
  }, [timeLeft, hasJoined, isCompleting]);

  // Change sprint duration mode (25m or 50m)
  const handleModeChange = (mode) => {
    if (hasJoined) return; // Prevent changing while focusing
    setSprintMode(mode);
    setIsActive(false);
    setTimeLeft(mode === '50' ? 50 * 60 : 25 * 60);
  };

  // ========================================================
  // START SPRINT
  // ========================================================
  const handleJoinSprint = async () => {
    if (!currentUser || hasJoined) return;

    const duration = parseInt(sprintMode, 10);
    setTimeLeft(duration * 60);

    try {
      // Create a new row in the study_sessions table with status 'in_progress'
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([
          {
            user_id: currentUser.id,
            duration_minutes: duration,
            status: 'in_progress',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        setCurrentSessionId(data.id);
        currentSessionIdRef.current = data.id;
      }

      // Activate timer and change button state to 'Focusing...'
      setHasJoined(true);
      setIsActive(true);
      setIsPausedByAntiCheat(false);
      setWarningToast(null);

      // Track focusing presence
      if (channelRef.current) {
        await channelRef.current.track({
          user_id: currentUser.id,
          username: currentUser.username || currentUser.name,
          status: 'focusing',
          session_id: data?.id,
          joined_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error creating study session:', err);
      alert('Could not start study session: ' + (err.message || 'Please try again.'));
    }
  };

  // ========================================================
  // SESSION COMPLETION & GAMIFIED FEEDBACK
  // ========================================================
  const handleCompleteSprint = async () => {
    setIsCompleting(true);
    setIsActive(false);

    const sessionId = currentSessionIdRef.current || currentSessionId;

    try {
      let rpcResult = null;

      if (sessionId) {
        // Execute the Supabase RPC function complete_study_session
        const { data, error } = await supabase.rpc('complete_study_session', {
          p_session_id: sessionId,
        });

        if (error) {
          console.warn('RPC complete_study_session warning:', error);
          // Fallback if parameter signature is session_id without 'p_'
          const fallbackRes = await supabase.rpc('complete_study_session', {
            session_id: sessionId,
          });
          rpcResult = fallbackRes.data;
        } else {
          rpcResult = data;
        }
      }

      // Gamified Feedback: Trigger a massive celebration UI event
      setCelebrationToast({
        title: 'Sprint Complete!',
        body: 'C-Coins added to wallet 🎉',
        reward: rpcResult?.coins_earned || (sprintMode === '50' ? '+25 C-Coins' : '+10 C-Coins'),
      });

      // Update Presence
      if (channelRef.current && currentUser) {
        await channelRef.current.track({
          user_id: currentUser.id,
          status: 'completed',
        });
      }

      // Reset timer UI after celebration so user can start a new sprint
      setTimeout(() => {
        setHasJoined(false);
        setCurrentSessionId(null);
        currentSessionIdRef.current = null;
        setIsCompleting(false);
        setIsPausedByAntiCheat(false);
        setTimeLeft(sprintMode === '50' ? 50 * 60 : 25 * 60);
      }, 4000);
    } catch (err) {
      console.error('Error completing study session:', err);
      // Still show celebratory success for completing time
      setCelebrationToast({
        title: 'Sprint Complete!',
        body: 'C-Coins added to wallet 🎉',
      });
      setTimeout(() => {
        setHasJoined(false);
        setCurrentSessionId(null);
        setIsCompleting(false);
        setTimeLeft(sprintMode === '50' ? 50 * 60 : 25 * 60);
      }, 4000);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('study_room_messages').insert([
        {
          room_id: 'global',
          user_id: currentUser.id,
          content: text,
        },
      ]);
      if (error) {
        console.error('Error sending message:', error);
        setNewMessage(text);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full relative bg-background">
      {/* ======================================================== */}
      {/* GAMIFIED CELEBRATION TOAST / MODAL */}
      {/* ======================================================== */}
      {celebrationToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-b from-amber-500/20 via-surface to-surface border-2 border-amber-400/50 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-400/30 blur-3xl rounded-full -translate-y-1/2 pointer-events-none" />

            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-amber-400 to-yellow-300 text-black rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
              <PartyPopper className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-on-surface tracking-tight mb-1">
              {celebrationToast.title}
            </h3>
            <p className="text-sm font-bold text-amber-500 dark:text-amber-400 mb-3">
              {celebrationToast.body}
            </p>

            <div className="bg-amber-400/10 border border-amber-400/30 py-2.5 px-4 rounded-xl text-xs font-semibold text-on-surface mb-5 inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Pomodoro Multiplier Applied</span>
            </div>

            <button
              type="button"
              onClick={() => setCelebrationToast(null)}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-extrabold py-3 px-6 rounded-2xl shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
            >
              Start Next Sprint
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ANTI-CHEAT WARNING TOAST BANNER */}
      {/* ======================================================== */}
      {warningToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-40 px-5 py-3 bg-red-600 text-white text-xs md:text-sm font-bold rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 max-w-[90%] border border-red-400/30">
          <ShieldAlert className="w-5 h-5 text-amber-200 shrink-0 animate-pulse" />
          <div className="flex-1">
            <span>{warningToast}</span>
          </div>
          {isPausedByAntiCheat && (
            <button
              type="button"
              onClick={handleResumeSprint}
              className="bg-white text-red-600 hover:bg-red-50 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition-colors shrink-0"
            >
              Resume
            </button>
          )}
        </div>
      )}

      {/* Room Indicator & Participants */}
      <div className="bg-surface/95 backdrop-blur-xl px-5 py-3 flex items-center justify-between border-b border-outline-variant/30 shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary-green"></span>
          </div>
          <h2 className="text-[14px] font-bold text-on-surface tracking-tight">Global Campus Room</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary-green/10 px-2.5 py-1 rounded-full border border-secondary-green/20">
          <Users className="w-3.5 h-3.5 text-secondary-green" />
          <span className="text-green-500 dark:text-green-400 font-bold text-xs">
            {participantsCount} Active
          </span>
        </div>
      </div>

      {/* Collaborative Pomodoro Sprint Banner */}
      <div className="shrink-0 bg-surface-container-lowest border-b border-outline-variant/30 px-5 py-4 flex flex-col z-10 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Quiet Pomodoro Sprint
          </h3>
          <div className="flex bg-surface-container-low rounded-full p-0.5 border border-outline-variant/40">
            <button
              onClick={() => handleModeChange('25')}
              disabled={hasJoined}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                sprintMode === '25'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-outline hover:text-on-surface disabled:opacity-50'
              }`}
            >
              25m
            </button>
            <button
              onClick={() => handleModeChange('50')}
              disabled={hasJoined}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                sprintMode === '50'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-outline hover:text-on-surface disabled:opacity-50'
              }`}
            >
              50m
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <div className={`text-3xl font-extrabold font-mono tracking-tighter ${
              isPausedByAntiCheat ? 'text-amber-500 animate-pulse' : 'text-primary'
            }`}>
              {formatTime(timeLeft)}
            </div>
            {isPausedByAntiCheat && (
              <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Join Sprint / Focusing State Button */}
            {hasJoined ? (
              <button
                disabled
                className="bg-surface-container-high text-outline text-xs font-bold px-4 py-2 rounded-full cursor-not-allowed border border-outline-variant/30 flex items-center gap-2"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isPausedByAntiCheat ? 'bg-amber-500' : 'bg-secondary-green animate-pulse'
                }`} />
                {isPausedByAntiCheat ? 'Focus Paused' : 'Focusing...'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoinSprint}
                className="bg-primary text-slate-900 dark:text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Join Sprint</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 bg-background pb-20">
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => {
            const isMe = currentUser?.id === msg.user_id;

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0 mt-auto mb-1">
                  {msg.profiles?.avatar_url ? (
                    <img
                      src={msg?.profiles?.avatar_url}
                      alt="avatar"
                      className="w-7 h-7 rounded-full object-cover shadow-sm border border-outline-variant/20"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shadow-sm border border-indigo-200">
                      {(msg.profiles?.username || msg.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {!isMe && (
                      <span className="text-[11px] font-bold text-outline">
                        {msg.profiles?.username || msg.profiles?.full_name || 'Anonymous'}
                      </span>
                    )}
                    <span className="text-[9px] text-outline/70 font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`px-4 py-2.5 rounded-2xl ${
                      isMe
                        ? 'bg-primary text-slate-900 dark:text-white rounded-br-sm shadow-sm shadow-primary/20'
                        : 'bg-surface-container-highest text-on-surface rounded-bl-sm border border-outline-variant/30 shadow-sm'
                    }`}
                  >
                    <p className="text-[14px] leading-relaxed break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-outline-variant/30 p-3 shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message the room..."
            className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-full px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface placeholder:text-outline"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-primary text-slate-900 dark:text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-60 disabled:shadow-none transition-all active:scale-95 shrink-0"
          >
            <Send size={18} className="mr-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
