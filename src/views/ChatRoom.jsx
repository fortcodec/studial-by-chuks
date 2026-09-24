import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { usePresence } from "../hooks/usePresence";

const getTimeAgo = (dateStr) => {
  if (!dateStr) return "Offline";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Active yesterday";
  return `Active ${days}d ago`;
};

export default function ChatRoom() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useOutletContext();
  
  // Track online users
  const { onlineUsers } = usePresence(currentUser);
  
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(location.state?.otherUser || null);
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
        // Fetch conversation details to get the other user and last_seen
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select(`
            user1:profiles!user1_id(id, username, full_name, avatar_url, last_seen),
            user2:profiles!user2_id(id, username, full_name, avatar_url, last_seen)
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

  const isOnline = otherUser?.id && onlineUsers[otherUser.id];

  if (isLoading && !otherUser) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background md:border-x border-outline-variant/30">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-2xl mx-auto bg-background md:border-x border-outline-variant/30">
      
      {/* TikTok-Style Chat Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30 px-4 py-2.5 flex items-center gap-3 shadow-sm">
        <button 
          onClick={() => navigate("/inbox")}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-surface-container-low transition-colors text-on-surface"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-1 items-center gap-3 justify-center absolute inset-0 pointer-events-none pr-10">
          <div className="relative pointer-events-auto">
            <Avatar url={otherUser?.avatar_url} name={otherUser?.username || otherUser?.full_name} size="sm" />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full shadow-sm"></div>
            )}
          </div>
          
          <div className="flex flex-col pointer-events-auto items-center">
            <span className="font-bold text-[15px] text-on-surface truncate leading-tight">
              {otherUser?.full_name || otherUser?.username || "Unknown User"}
            </span>
            <span className={`text-[12px] truncate ${isOnline ? 'text-green-500 font-medium' : 'text-outline'}`}>
              {isOnline ? "Active now" : getTimeAgo(otherUser?.last_seen)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 pt-6 relative ${messages.length === 0 ? 'bg-[#efeae2] dark:bg-[#0b141a]' : ''}`}>
        {/* WhatsApp style subtle pattern overlay for empty state */}
        {messages.length === 0 && (
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-slate-400 dark:text-slate-500">
            <div className="bg-[#FFEEDB] dark:bg-[#182229] text-[#54656F] dark:text-[#8696A0] text-[12.5px] font-medium text-center px-4 py-2 rounded-xl shadow-sm max-w-[85%] leading-relaxed flex flex-col items-center gap-1.5 mb-6">
              <span>🔒</span>
              <p>Messages are end-to-end encrypted. No one outside of this chat, not even Studial, can read or listen to them. Click to learn more.</p>
            </div>
            <p className="text-sm">No messages yet. Send a message to start the conversation!</p>
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
      <div className="p-3 border-t border-outline-variant/30 bg-surface pb-safe">
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
