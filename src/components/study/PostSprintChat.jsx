import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function PostSprintChat({ isDisabled, currentUser, roomId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle incoming messages & AI integration placeholder
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isDisabled) return;

    const messageText = newMessage.trim();
    const isAiQuery = messageText.includes('@Samuel');

    // 1. Optimistic UI Update
    const newMsgObj = {
      id: Date.now().toString(),
      user_id: currentUser?.id,
      name: currentUser?.name || 'You',
      text: messageText,
      is_ai: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsgObj]);
    setNewMessage('');

    // 2. Broadcast via Supabase or Insert to DB (Placeholder for actual DB logic)
    // await supabase.from('study_messages').insert({ ... })

    // 3. AI Tutor Integration
    if (isAiQuery) {
      // Simulate Samuel thinking
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '_ai',
          user_id: 'samuel_ai',
          name: 'Samuel AI',
          text: `I noticed you asked a question! I am Samuel, the AI tutor. (AI Route Placeholder)`,
          is_ai: true,
          created_at: new Date().toISOString()
        }]);
      }, 1000);
    }
  };

  return (
    <div className={`flex flex-col h-72 w-full bg-slate-900/60 border ${isDisabled ? 'border-red-500/30' : 'border-indigo-500/30'} rounded-2xl backdrop-blur-md overflow-hidden shadow-xl transition-colors duration-500`}>
      
      {/* Header */}
      <div className={`p-3 text-center border-b ${isDisabled ? 'border-slate-800 bg-red-950/20 text-slate-400' : 'border-indigo-500/20 bg-indigo-950/20 text-indigo-300'} font-medium text-xs flex items-center justify-center gap-2`}>
        {isDisabled ? (
          <><Lock className="w-3 h-3" /> Chat Locked During Focus</>
        ) : (
          <><Sparkles className="w-3 h-3" /> Post-Sprint Debrief (Type @Samuel for help)</>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm italic text-center px-4">
            {isDisabled 
              ? "Chat is disabled to prevent distractions." 
              : "Room is open! Ask @Samuel a question or debrief with your peers."}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.user_id === currentUser?.id ? 'items-end' : 'items-start'}`}>
              <div className="flex items-end gap-2 max-w-[85%]">
                {msg.user_id !== currentUser?.id && !msg.is_ai && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex-shrink-0" />
                )}
                {msg.is_ai && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  msg.user_id === currentUser?.id 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : msg.is_ai 
                      ? 'bg-indigo-900/50 border border-indigo-500/30 text-indigo-100 rounded-bl-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                }`}>
                  <div className="font-bold text-[10px] opacity-50 mb-0.5">{msg.name}</div>
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950/50 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isDisabled}
          placeholder={isDisabled ? "Shh... Focus time." : "Message room or @Samuel..."}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isDisabled || !newMessage.trim()}
          className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-slate-800 transition-colors"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
