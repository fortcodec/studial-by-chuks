import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Loader2, MessageSquare, ChevronRight } from "lucide-react";
import { Avatar } from "../components/Avatar";

export default function Inbox() {
  const { currentUser } = useOutletContext();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    try {
      // Fetch conversations involving the current user
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id, 
          updated_at,
          user1:profiles!user1_id(id, username, full_name, avatar_url),
          user2:profiles!user2_id(id, username, full_name, avatar_url),
          messages(content, sender_id, created_at)
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order("updated_at", { ascending: false });
        
      if (error) throw error;
      
      // Process data to identify the "other" user and get the latest message
      const processed = data.map((conv) => {
        const otherUser = conv.user1.id === currentUser.id ? conv.user2 : conv.user1;
        // The messages are joined, but we only want the most recent one.
        // Supabase nested queries don't easily allow `limit(1)` on the joined table without advanced PostgREST features.
        // So we sort them in JS if multiple are returned, though ideally we'd fetch the latest.
        const sortedMessages = conv.messages?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];
        const latestMessage = sortedMessages[0];
        
        return {
          id: conv.id,
          updated_at: conv.updated_at,
          otherUser,
          latestMessage,
        };
      });
      
      setConversations(processed);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Listen for realtime updates to bump conversations
    const channel = supabase
      .channel('public:conversations_inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchConversations(); // Naive refresh on new message
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen w-full max-w-2xl mx-auto bg-[#f8fafc] dark:bg-slate-900 md:border-x border-outline-variant/30 pt-[100px] pb-[90px]">
      <div className="sticky top-0 z-10 bg-[#f8fafc]/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-outline-variant/20 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Inbox
        </h1>
      </div>
      
      {/* Activity / Story-like row placeholder could go here per requirements */}
      <div className="px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest overflow-x-auto whitespace-nowrap hide-scrollbar">
         <div className="text-xs font-semibold text-outline uppercase tracking-wider mb-2">Activity</div>
         <div className="flex gap-4">
            {/* V1 Placeholder for active users */}
            <div className="flex flex-col items-center gap-1 cursor-not-allowed opacity-50">
               <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-surface-container-high flex items-center justify-center">
                 <span className="text-xs text-outline">You</span>
               </div>
               <span className="text-[10px] text-outline">Notes</span>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-outline space-y-3">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No active conversations</p>
            <p className="text-xs">Search for a user to start chatting!</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`, { state: { otherUser: conv.otherUser } })}
                className="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0 text-left w-full active:bg-surface-container-high"
              >
                <div className="relative">
                  <Avatar url={conv.otherUser?.avatar_url} name={conv.otherUser?.username || conv.otherUser?.full_name} size="md" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-bold text-sm text-on-surface truncate pr-2">
                      {conv.otherUser?.full_name || conv.otherUser?.username || "Unknown User"}
                    </span>
                    <span className="text-[10px] text-outline whitespace-nowrap shrink-0">
                      {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  
                  <p className="text-[13px] text-on-surface-variant truncate">
                    {conv.latestMessage ? (
                      <>
                        {conv.latestMessage.sender_id === currentUser.id && <span className="text-outline mr-1">You:</span>}
                        {conv.latestMessage.content}
                      </>
                    ) : (
                      <span className="italic text-outline">No messages yet</span>
                    )}
                  </p>
                </div>
                
                <ChevronRight className="w-4 h-4 text-outline/50" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
