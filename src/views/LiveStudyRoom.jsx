import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { BottomNav } from '../components/BottomNav';

export default function LiveStudyRoom({ navigateTo, currentView }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

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

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        setCurrentUser(user);
      }
    };
    
    fetchUser();
    
    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('study_room_messages')
        .select(`
          *,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .eq('room_id', 'global')
        .order('created_at', { ascending: true });
        
      if (!error && data && isMounted) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Setup Realtime
    const channel = supabase
      .channel('public:study_room_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_room_messages',
          filter: 'room_id=eq.global'
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const completeMessage = {
            ...payload.new,
            profiles: profile
          };

          if (isMounted) {
            setMessages(prev => [...prev, completeMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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

  return (
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xl px-5 py-4 flex items-center gap-3 border-b border-outline-variant/30 shadow-sm">
        <button onClick={() => navigateTo && navigateTo('dashboard')} className="text-outline hover:text-on-surface transition-colors active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary-green"></span>
          </div>
          <h1 className="text-[17px] font-bold text-on-surface tracking-tight">Global Campus Room</h1>
        </div>
      </div>

      {/* Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => {
            const isMe = currentUser?.id === msg.user_id;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-[11px] font-bold text-outline mb-1 ml-2">
                    {msg.profiles?.username || msg.profiles?.full_name || 'Anonymous'}
                  </span>
                )}
                <div 
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                    isMe 
                      ? 'bg-primary text-white rounded-br-sm shadow-sm shadow-primary/20' 
                      : 'bg-surface-container-highest text-on-surface rounded-bl-sm border border-outline-variant/30'
                  }`}
                >
                  <p className="text-[14px] leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-surface border-t border-outline-variant/30 p-3 shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-60 disabled:shadow-none transition-all active:scale-95"
          >
            <Send size={18} className="mr-0.5" />
          </button>
        </form>
      </div>

      {/* Bottom Nav */}
      <div className="shrink-0 bg-surface z-40">
        <BottomNav navigateTo={navigateTo} currentView={currentView} />
      </div>
    </div>
  );
}
