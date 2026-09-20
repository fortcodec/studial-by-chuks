import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";

export default function ChatRoom() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useOutletContext();
  
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!currentUser?.id || !conversationId) return;

    const fetchChatData = async () => {
      try {
        // Fetch conversation details to get the other user
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select(`
            user1:profiles!user1_id(id, username, full_name, avatar_url),
            user2:profiles!user2_id(id, username, full_name, avatar_url)
          `)
          .eq("id", conversationId)
          .single();

        if (convError) throw convError;

        const other = convData.user1.id === currentUser.id ? convData.user2 : convData.user1;
        setOtherUser(other);

        // Fetch all messages
        const { data: msgsData, error: msgsError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgsError) throw msgsError;
        setMessages(msgsData || []);
      } catch (err) {
        console.error("Error fetching chat data:", err);
        navigate("/inbox"); // Fallback if access denied
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser?.id, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.id || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage(""); // Optimistic clear

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: content,
      });

      if (error) {
        throw error;
      }
      // Note: The realtime subscription will append the message to the UI.
    } catch (err) {
      console.error("Error sending message:", err);
      // Fallback: put the text back if it failed
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] md:h-screen w-full items-center justify-center bg-background md:border-x border-outline-variant/30">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen w-full max-w-2xl mx-auto bg-background md:border-x border-outline-variant/30">
      
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30 px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => navigate("/inbox")}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-surface-container-low transition-colors text-on-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <Avatar url={otherUser?.avatar_url} name={otherUser?.username || otherUser?.full_name} size="sm" />
        
        <div className="flex flex-col">
          <span className="font-bold text-sm text-on-surface">
            {otherUser?.full_name || otherUser?.username || "Unknown User"}
          </span>
          <span className="text-[10px] text-outline">
            @{otherUser?.username || "student"}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-outline space-y-3 opacity-60">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">Say hi to {otherUser?.full_name?.split(' ')[0] || "them"}!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser.id;
            const showTail = idx === messages.length - 1 || messages[idx + 1].sender_id !== msg.sender_id;
            
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[75%] px-4 py-2 text-[14px] leading-relaxed shadow-sm ${
                    isMe 
                      ? `bg-primary text-on-primary rounded-2xl ${showTail ? 'rounded-br-sm' : ''}`
                      : `bg-surface-container text-on-surface rounded-2xl border border-outline-variant/30 ${showTail ? 'rounded-bl-sm' : ''}`
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="p-3 border-t border-outline-variant/30 bg-surface">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-surface-container-low rounded-3xl p-1.5 border border-outline-variant/30 focus-within:ring-2 focus-within:ring-primary/30 transition-all shadow-sm">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] px-3 py-2 text-on-surface resize-none max-h-32 min-h-[40px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className={`p-2.5 rounded-full shrink-0 transition-all ${
              newMessage.trim() && !isSending
                ? 'bg-primary text-on-primary shadow-md hover:bg-primary/90 active:scale-95' 
                : 'bg-surface-container-high text-outline cursor-not-allowed'
            }`}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </button>
        </form>
      </div>

    </div>
  );
}
