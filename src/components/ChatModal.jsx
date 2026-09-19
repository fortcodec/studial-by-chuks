import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, Send, Loader2 } from 'lucide-react';

export default function ChatModal({ currentUser, targetUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    if (!currentUser || !targetUser) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        if (isMounted) setMessages(data || []);
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel(`chat_${currentUser.id}_${targetUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new;
        // Verify this message belongs to this conversation
        if (
          (newMsg.sender_id === currentUser.id && newMsg.receiver_id === targetUser.id) ||
          (newMsg.sender_id === targetUser.id && newMsg.receiver_id === currentUser.id)
        ) {
          if (isMounted) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser, targetUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: targetUser.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: currentUser.id,
        receiver_id: targetUser.id,
        content: tempMessage.content
      }]);
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message.");
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id)); // rollback
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300 relative flex flex-col h-[85vh] sm:h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <img 
              src={targetUser.avatar_url || 'https://api.dicebear.com/9.x/glass/svg?seed=User'} 
              alt="avatar" 
              className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant/30 object-cover"
            />
            <div>
              <h2 className="font-bold text-on-surface leading-tight">{targetUser.full_name || targetUser.username}</h2>
              <p className="text-[12px] text-outline">@{targetUser.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-surface-container hover:bg-outline-variant/30 transition-colors text-outline hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest flex flex-col gap-3">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col text-center opacity-60">
              <span className="text-4xl mb-2">👋</span>
              <p className="text-sm font-semibold">Say hello to {targetUser.full_name || targetUser.username}!</p>
              <p className="text-xs">Start a conversation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-surface-container text-on-surface rounded-bl-sm border border-outline-variant/20'}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface border-t border-outline-variant/30 shrink-0 pb-safe">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-surface-container rounded-full px-4 py-3 outline-none border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary text-sm text-on-surface"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
