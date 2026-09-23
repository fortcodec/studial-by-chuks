import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Loader2, MessageSquare, ChevronRight, Bell, Clock, CheckCircle2 } from "lucide-react";
import { Avatar } from "../components/Avatar";

export default function Inbox() {
  const { currentUser } = useOutletContext();
  const [conversations, setConversations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("messages"); // 'messages' or 'activity'
  const navigate = useNavigate();

  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    try {
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
      
      const processed = data.map((conv) => {
        const otherUser = conv.user1.id === currentUser.id ? conv.user2 : conv.user1;
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

  const fetchActivity = async () => {
    if (!currentUser?.id) return;
    setIsActivityLoading(true);
    try {
      const [txRes, notifRes] = await Promise.all([
        supabase
          .from('c_coin_transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);
      
      if (txRes.data) setTransactions(txRes.data);
      if (notifRes.data) setNotifications(notifRes.data);

      // Mark all notifications as read when viewing the activity tab
      if (notifRes.data && notifRes.data.some(n => !n.read)) {
        await supabase.from('notifications')
          .update({ read: true })
          .eq('user_id', currentUser.id)
          .eq('read', false);
      }
    } catch (err) {
      console.error("Error fetching activity:", err);
    } finally {
      setIsActivityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "messages") {
      fetchConversations();
    } else if (activeTab === "activity") {
      fetchActivity();
    }
    
    // Listen for realtime updates to bump conversations
    const channel = supabase
      .channel('public:conversations_inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          if (activeTab === "messages") fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, activeTab]);

  return (
    <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#f8fafc] dark:bg-slate-900 md:border-x border-outline-variant/30 pt-4 pb-[90px]">
      <div className="sticky top-0 z-10 bg-[#f8fafc]/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-outline-variant/20 px-4 pt-3 flex flex-col shadow-sm">
        <h1 className="text-xl font-bold text-on-surface flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-primary" /> Unified Inbox
        </h1>
        <div className="flex gap-4 border-b border-outline-variant/20">
          <button 
            onClick={() => setActiveTab('messages')}
            className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === 'messages' ? 'text-primary' : 'text-outline hover:text-on-surface'}`}
          >
            Messages
            {activeTab === 'messages' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`pb-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'activity' ? 'text-primary' : 'text-outline hover:text-on-surface'}`}
          >
            Activity & Alerts
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'messages' && (
          isLoading ? (
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
          )
        )}

        {activeTab === 'activity' && (
          isActivityLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col pb-4">
              {/* Transactions Section */}
              <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0 z-0 flex items-center justify-between">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Recent Transactions</span>
              </div>
              {transactions.length === 0 ? (
                <div className="p-4 text-center text-sm text-outline border-b border-outline-variant/10">No recent C-Coin transactions.</div>
              ) : (
                transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-4 border-b border-outline-variant/10 bg-surface">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-on-surface">{tx.description}</span>
                      <span className="text-[11px] text-outline">{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`text-sm font-bold ${tx.amount.startsWith('+') ? 'text-secondary-green' : 'text-error'}`}>{tx.amount}</span>
                  </div>
                ))
              )}

              {/* Notifications Section */}
              <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0 z-0 flex items-center justify-between mt-2">
                <span className="text-xs font-semibold text-outline uppercase tracking-wider flex items-center gap-2"><Bell className="w-3.5 h-3.5" /> Notifications</span>
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-outline">No new notifications.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-4 border-b border-outline-variant/10 bg-surface hover:bg-surface-container-low transition-colors">
                    <div className={`p-2 rounded-full shrink-0 ${n.type === 'mention' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{n.message || n.content}</span>
                      <span className="text-[11px] text-outline mt-1">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
