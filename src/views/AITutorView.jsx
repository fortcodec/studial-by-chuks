import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Bot, Send, Sparkles, AlertCircle, Loader2, BookOpen } from 'lucide-react';

export default function AITutorView() {
  const { currentUser, setCurrentUser } = useOutletContext();
  const messagesEndRef = useRef(null);

  const QUERY_COST = 5;

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "Hi there! I'm your Studial AI Tutor. I can help explain concepts, summarize your notes, or quiz you before an exam. What are we studying today?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    "Summarize this lecture",
    "Explain like I'm 5",
    "Create a practice quiz",
    "Help me debug this code"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textOverride = null) => {
    const textToSubmit = textOverride || inputText;
    if (!textToSubmit.trim()) return;

    // Check C-Coin Balance
    if ((currentUser?.c_coins || 0) < QUERY_COST) {
      alert(`You need at least ${QUERY_COST} C-Coins to ask the tutor a question. Earn more by logging in daily or sharing posts!`);
      return;
    }

    // Deduct Coins
    try {
      const newBalance = currentUser.c_coins - QUERY_COST;
      const { error } = await supabase
        .from('profiles')
        .update({ c_coins: newBalance })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Log Transaction (Optimistic if no table, but good practice)
      try {
        await supabase.from('c_coin_transactions').insert({
          user_id: currentUser.id,
          amount: -QUERY_COST,
          type: 'AI Tutor Query'
        });
      } catch (e) {
        // Ignore transaction log failure if table doesn't exist
      }

      // Update Local State
      setCurrentUser(prev => ({ ...prev, c_coins: newBalance }));
    } catch (error) {
      console.error("Failed to deduct C-Coins:", error);
      alert("Failed to process transaction. Please try again.");
      return;
    }

    // Add User Message
    const userMsg = { id: Date.now(), role: 'user', text: textToSubmit };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI Response
    setTimeout(() => {
      setIsTyping(false);
      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'ai', 
        text: `Here is a detailed response to "${textToSubmit}".\n\nThis is a **simulated** response. In a production environment, you would stream this directly from the OpenAI or Anthropic API. Keep up the great studying!` 
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
      {/* Header Info Banner */}
      <div className="bg-indigo-50/80 backdrop-blur-md border-b border-indigo-100 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900 leading-tight">AI Tutor</h3>
            <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Always Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-indigo-100">
          <Sparkles className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-bold text-indigo-900">Cost: {QUERY_COST} C</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 px-5 py-6 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-bl-none'
            }`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="text-sm text-outline font-medium">Tutor is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="fixed bottom-[60px] left-0 right-0 max-w-md mx-auto bg-background/95 backdrop-blur-xl border-t border-outline-variant/20 p-4 z-20">
        
        {/* Quick Prompts */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1 -mx-4 px-4">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="shrink-0 flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors shadow-sm whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Field */}
        <div className="relative flex items-end gap-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/50 p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask your tutor anything..."
            className="w-full bg-transparent resize-none outline-none text-[15px] px-2 py-1.5 max-h-32 min-h-[44px]"
            rows={1}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="shrink-0 bg-primary text-white p-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-center gap-1.5 opacity-60">
          <AlertCircle className="w-3 h-3 text-on-surface" />
          <p className="text-[10px] font-semibold text-on-surface">Asking costs {QUERY_COST} C-Coins. Responses are AI-generated.</p>
        </div>
      </div>
    </div>
  );
}
