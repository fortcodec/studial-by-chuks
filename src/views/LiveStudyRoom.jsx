import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Users, Play, Pause, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate, useOutletContext } from 'react-router-dom';

export default function LiveStudyRoom() {
  const navigate = useNavigate();
  const { currentUser } = useOutletContext();
  
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
  const [participantsCount, setParticipantsCount] = useState(0);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial data & setup realtime
  useEffect(() => {
    let isMounted = true;
    
    // Fetch initial messages
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
        
        if (data && isMounted) {
          setMessages(data);
        }
      } catch (err) {
        console.error("Error fetching room messages:", err);
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
          filter: 'room_id=eq.global'
        },
        async (payload) => {
          try {
            // Fetch the profile for the new message
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            if (error) throw error;

            const completeMessage = {
              ...payload.new,
              profiles: profile
            };

            if (isMounted) {
              setMessages(prev => [...prev, completeMessage]);
            }
          } catch (err) {
            console.error("Error processing realtime message:", err);
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
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(roomChannel);
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, hasJoined]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(sprintMode === '50' ? 50 * 60 : 25 * 60);
  };

  const handleModeChange = (mode) => {
    setSprintMode(mode);
    setIsActive(false);
    setTimeLeft(mode === '50' ? 50 * 60 : 25 * 60);
  };

  const handleJoinSprint = async () => {
    if (!currentUser || hasJoined) return;
    setHasJoined(true);
    if (channelRef.current) {
      await channelRef.current.track({ user_id: currentUser.id, joined_at: new Date() });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    const text = newMessage.trim();
    setNewMessage(''); // optimistic clear
    
    const { error } = await supabase
      .from('study_room_messages')
      .insert([
        {
          room_id: 'global',
          user_id: currentUser.id,
          content: text
        }
      ]);
      
    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(text); // revert if error
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full relative bg-background">
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
          <span className="text-xs font-bold text-secondary-green">{participantsCount} Active</span>
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
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                sprintMode === '25' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
              }`}
            >
              25m
            </button>
            <button
              onClick={() => handleModeChange('50')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                sprintMode === '50' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
              }`}
            >
              50m
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-3xl font-extrabold font-mono text-primary tracking-tighter">
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex items-center gap-2">
            {hasJoined ? (
              <div className="flex gap-2">
                <button
                  onClick={toggleTimer}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm transition-transform active:scale-95 ${
                    isActive ? 'bg-error' : 'bg-secondary-green'
                  }`}
                >
                  {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={resetTimer}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container text-outline hover:text-on-surface transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoinSprint}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:bg-primary/90 transition-all active:scale-95"
              >
                Join Sprint
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
                    <img src={msg?.profiles?.avatar_url} alt="avatar" className="w-7 h-7 rounded-full object-cover shadow-sm border border-outline-variant/20" />
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
                        ? 'bg-primary text-white rounded-br-sm shadow-sm shadow-primary/20' 
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
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-60 disabled:shadow-none transition-all active:scale-95 shrink-0"
          >
            <Send size={18} className="mr-0.5" />
          </button>
        </form>
      </div>

    </div>
  );
}
