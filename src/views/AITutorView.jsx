import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Bot, Send, Sparkles, AlertCircle, Loader2, BookOpen } from 'lucide-react';

export default function AITutorView() {
  const { currentUser, setCurrentUser } = useOutletContext();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const hasTriggeredContext = useRef(false);
  const initialContext = location.state?.studyContext;

  const QUERY_COST = 5;

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "Hi there! I'm Samuel, your Studial AI. I can help explain concepts, summarize your notes, or quiz you before an exam. What are we studying today?"
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

  useEffect(() => {
    if (initialContext && !hasTriggeredContext.current) {
      hasTriggeredContext.current = true;
      const autoPrompt = `Please explain this study material to me:\n\nTitle: ${initialContext.title}\nCourse: ${initialContext.course_code}\nDescription: ${initialContext.description}`;
      handleSend(autoPrompt);
    }
  }, [initialContext]);

  const handleSend = async (textOverride = null) => {
    const textToSubmit = textOverride || inputText;
    if (!textToSubmit.trim()) return;

    // Check C-Coin Balance locally first
    if ((currentUser?.c_coins || 0) < QUERY_COST) {
      alert(`You need at least ${QUERY_COST} C-Coins to ask the tutor a question. Earn more by logging in daily or sharing posts!`);
      return;
    }

    // Add User Message
    const userMsg = { id: Date.now(), role: 'user', text: textToSubmit };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const aiMsgId = Date.now() + 1;
    let startedStreaming = false;

    try {
      // Create a new AI message placeholder
      setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: "" }]);
      
      const response = await fetch('/api/ask-samuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSubmit, userId: currentUser.id })
      });

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errJson = await response.clone().json();
          errorDetail = errJson?.error || errorDetail;
          console.error(`[Samuel API Error] Status ${response.status}:`, errJson);
        } catch (_) {
          console.error(`[Samuel API Error] Status ${response.status} (non-JSON body)`);
        }
        throw new Error(errorDetail);
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          if (!startedStreaming) {
            setIsTyping(false);
            startedStreaming = true;
            
            // Re-sync local coin balance silently in background
            supabase.from('profiles').select('c_coins').eq('id', currentUser.id).single().then(({ data }) => {
              if (data) setCurrentUser(prev => ({ ...prev, c_coins: data.c_coins }));
            });
          }
          
          const chunkText = decoder.decode(value, { stream: !done });
          fullResponse += chunkText;
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMsgId ? { ...msg, text: fullResponse } : msg
            )
          );
        }
      }
      
      if (!startedStreaming) {
         setIsTyping(false);
      }
      
    } catch (error) {
      console.error('[Samuel] Chat error:', error.message, error);
      setIsTyping(false);

      // Build a user-facing message based on the error type
      let userMessage = "Sorry, I couldn't connect to Samuel right now. Please try again in a moment!";
      if (error.message?.includes('403') || error.message?.toLowerCase().includes('insufficient')) {
        userMessage = "You don't have enough C-Coins for this query. Earn more by logging in daily!";
      } else if (error.message?.includes('401') || error.message?.toLowerCase().includes('unauthorized')) {
        userMessage = "Authentication error with the AI service. Please contact support.";
      } else if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate')) {
        userMessage = "Samuel is getting too many requests right now. Please wait a moment and try again.";
      } else if (error.message?.toLowerCase().includes('timeout') || error.message?.includes('408')) {
        userMessage = "Samuel took too long to respond. Try a shorter or simpler question!";
      }
      
      if (!startedStreaming) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMsgId ? { ...msg, text: userMessage } : msg
          )
        );
      }
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
      {/* Header Info Banner */}
      <div className="bg-indigo-50/80 dark:bg-indigo-950/60 backdrop-blur-md border-b border-indigo-100 dark:border-indigo-900/50 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 leading-tight">Samuel</h3>
            <p className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Always Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white dark:bg-indigo-900/50 px-3 py-1.5 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-700">
          <Sparkles className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Cost: {QUERY_COST} C</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 px-5 py-6 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-none'
                : 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 rounded-bl-none'
            }`}>
              <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'text-white' : 'text-slate-800 dark:text-slate-100'
              }`}>{msg.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="text-sm text-outline font-medium">Samuel is thinking...</span>
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
            placeholder="Ask Samuel anything..."
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
