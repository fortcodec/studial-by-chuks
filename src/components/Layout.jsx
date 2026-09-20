import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Coins, Megaphone, Check, CheckCircle2, MessageSquare } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { supabase } from "../supabaseClient";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";
import CCoinBadge from "./CCoinBadge";
import GlobalSearch from "./GlobalSearch";

const CreatePost = lazy(() => import("./CreatePost"));
const CoinRewardModal = lazy(() => import("./CoinRewardModal"));

export default function Layout() {
  const [currentUser, setCurrentUser] = useState({
    name: "Student",
    c_coins: 0,
    avatar: "",
  });
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showLoginReward, setShowLoginReward] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Notification Dropdown State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [notificationsData, setNotificationsData] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' or 'transactions'
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const notificationRef = useRef(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCoinRewardModal, setShowCoinRewardModal] = useState(false);
  const [weeklyBonusAmount, setWeeklyBonusAmount] = useState(0);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const fetchUnreadCount = async () => {
    if (!currentUser?.id) return;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Error fetching unread count", err);
    }
  };

  const fetchTrayData = async () => {
    if (!currentUser?.id) return;
    setIsTransactionsLoading(true);
    setIsNotificationsLoading(true);
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
      if (notifRes.data) {
        setNotificationsData(notifRes.data);
        const unread = notifRes.data.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Error fetching tray data:", err);
    } finally {
      setIsTransactionsLoading(false);
      setIsNotificationsLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id || unreadCount === 0) return;
    try {
      await supabase.from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      
      setUnreadCount(0);
      setNotificationsData(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [currentUser?.id]);

  useEffect(() => {
    if (isNotificationsOpen) {
      fetchTrayData();
    }
  }, [isNotificationsOpen, currentUser?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          let currentCoins = profile.c_coins || 0;
          
          // Enforce 24-Hour Login Reward
          const now = Date.now();
          const lastClaimed = profile.last_login_reward ? new Date(profile.last_login_reward).getTime() : 0;
          const hoursSinceLastReward = (now - lastClaimed) / (1000 * 60 * 60);
          
          if (hoursSinceLastReward >= 24) {
            // More than 24 hours passed! Award the coins
            currentCoins += 2;
            
            // 2. Update Database
            await supabase.from('profiles').update({ 
              c_coins: currentCoins,
              last_login_reward: new Date(now).toISOString()
            }).eq('id', user.id);
            
            // Log Transaction
            await supabase.from('c_coin_transactions').insert({
              user_id: user.id,
              amount: '+2 C',
              description: 'Daily Login Bonus'
            });
            
            // 3. Show UI Banner
            if (isMounted) {
              setShowLoginReward(true);
              setTimeout(() => {
                if (isMounted) setShowLoginReward(false);
              }, 5000);
            }
          }

          if (isMounted) {
            setCurrentUser({
              id: user.id,
              name: profile.full_name || profile.username || 'Student',
              c_coins: currentCoins,
              avatar: profile.avatar_url || ""
            });
          }
        }
      }
    };
    
    fetchUser();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.sender_id !== currentUser.id) {
            setUnreadMessagesCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Dedicated Coin Drops Check (Weekly or Admin Gift)
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const checkCoinDrops = async () => {
      const { data: coinDrops } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('type', ['weekly_drop', 'admin_gift', 'task_approved'])
        .eq('read', false);

      if (coinDrops && coinDrops.length > 0) {
        // Get the first unread drop amount from title regex or fallback to 500
        const firstDrop = coinDrops[0];
        const amountMatch = firstDrop.title.match(/(\d+)/);
        const amount = amountMatch ? parseInt(amountMatch[1]) : 500;
        
        setWeeklyBonusAmount(amount);
        setModalTitle(firstDrop.title);
        setModalMessage(firstDrop.message);
        setShowCoinRewardModal(true);

        // Mark them as read
        const dropIds = coinDrops.map(d => d.id);
        await supabase.from('notifications').update({ read: true }).in('id', dropIds);
      }
    };

    checkCoinDrops();
  }, [currentUser?.id]);

  return (
    <div className="flex flex-col min-h-[100dvh] h-[100dvh] pt-safe pb-safe relative bg-background overflow-hidden w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto shadow-2xl md:border-x border-outline-variant/30">
      {/* Login Reward Banner */}
      {showLoginReward && (
        <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-bold shadow-md animate-slide-down flex justify-center items-center gap-2 relative z-50">
          <span>🎉 +2 C-Coins for logging in today!</span>
          <button onClick={() => setShowLoginReward(false)} className="absolute right-4 text-white hover:text-green-200">
            &times;
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl px-5 py-4 flex justify-between items-center border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-surface-1">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-on-primary">
              <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" />
              <path d="M2 13l10 5 10-5M2 18l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight hidden md:block">Studial.</h1>
        </div>

        <GlobalSearch />

        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          <button 
            onClick={() => {
              const isDark = document.documentElement.classList.toggle('dark');
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
              setIsDarkMode(isDark);
            }}
            className="p-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-outline hover:text-on-surface shadow-sm active:scale-95 transition-all"
          >
            {!isDarkMode ? (
              <span className="flex items-center justify-center w-5 h-5">🌙</span>
            ) : (
              <span className="flex items-center justify-center w-5 h-5">☀️</span>
            )}
          </button>
          
          <CCoinBadge balance={currentUser.c_coins} className="shadow-sm hidden md:flex" />

          <button
            onClick={() => {
              setUnreadMessagesCount(0);
              navigate('/inbox');
            }}
            className="relative p-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-outline hover:text-on-surface shadow-sm active:scale-95 transition-all"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-surface shadow-sm animate-in fade-in zoom-in">
                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
              </span>
            )}
          </button>
          
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative text-outline hover:text-on-surface transition-colors active:scale-95"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full border-2 border-surface">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-outline-variant/30 bg-surface-container-low">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-bold text-on-surface">Activity</h3>
                    {activeTab === 'notifications' && unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="flex bg-surface-container rounded-lg p-1">
                    <button 
                      onClick={() => setActiveTab('notifications')}
                      className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors ${activeTab === 'notifications' ? 'bg-surface shadow-sm text-on-surface' : 'text-outline hover:text-on-surface'}`}
                    >
                      Notifications
                    </button>
                    <button 
                      onClick={() => setActiveTab('transactions')}
                      className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors ${activeTab === 'transactions' ? 'bg-surface shadow-sm text-on-surface' : 'text-outline hover:text-on-surface'}`}
                    >
                      Transactions
                    </button>
                  </div>
                </div>
                <div className="max-h-[350px] overflow-y-auto overscroll-contain">
                  {/* Notifications Tab Content */}
                  {activeTab === 'notifications' && (
                    isNotificationsLoading ? (
                      <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : notificationsData.length === 0 ? (
                      <div className="p-8 text-center text-outline text-sm">No notifications yet.</div>
                    ) : (
                      <div className="divide-y divide-outline-variant/30">
                        {notificationsData.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              if (notif.type === 'new_task') {
                                setIsNotificationsOpen(false);
                                navigate('/tasksHub');
                              }
                            }}
                            className={`p-4 transition-colors flex items-start gap-3 relative ${!notif.read ? 'bg-primary/5' : ''} ${notif.type === 'new_task' ? 'cursor-pointer hover:bg-surface-container-low' : 'hover:bg-surface-container-low'}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'admin_gift' || notif.type === 'weekly_drop' || notif.type === 'task_approved' ? 'bg-warning/10 text-warning' : notif.type === 'announcement' || notif.type === 'new_task' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                              {notif.type === 'admin_gift' || notif.type === 'weekly_drop' || notif.type === 'task_approved' ? <Coins className="w-4 h-4" /> : notif.type === 'announcement' ? <Megaphone className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-[14px] text-on-surface font-bold leading-snug truncate">
                                {notif.title}
                              </p>
                              <p className="text-[13px] text-outline mt-0.5 line-clamp-2 leading-snug">{notif.message}</p>
                              <p className="text-[11px] text-outline-variant mt-1.5 font-medium">
                                {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-primary absolute top-5 right-4 shadow-sm"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Transactions Tab Content */}
                  {activeTab === 'transactions' && (
                    isTransactionsLoading ? (
                      <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : transactions.length === 0 ? (
                      <div className="p-8 text-center text-outline text-sm">No recent activity.</div>
                    ) : (
                      <div className="divide-y divide-outline-variant/30">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="p-4 hover:bg-surface-container-low transition-colors flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.amount.startsWith('+') ? 'bg-secondary-green/10 text-secondary-green' : 'bg-error/10 text-error'}`}>
                              <Coins className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-on-surface font-medium leading-snug">
                                {tx.description}
                              </p>
                              <p className={`text-[13px] font-bold mt-0.5 ${tx.amount.startsWith('+') ? 'text-secondary-green' : 'text-error'}`}>{tx.amount}</p>
                              <p className="text-[11px] text-outline-variant mt-1.5 font-medium">
                                {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Avatar 
            url={currentUser?.avatar_url || currentUser?.avatar} 
            name={currentUser?.username || currentUser?.name || 'Student'} 
            size="md" 
            className="border-2 border-surface-container-low" 
          />
        </div>
      </div>

      {/* Create Post Modal */}
      {isCreatePostOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-md md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300 relative">
              <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
                <h2 className="font-bold text-on-surface">Create Post</h2>
                <button onClick={() => setIsCreatePostOpen(false)} className="p-1.5 rounded-full bg-surface-container hover:bg-outline-variant/30 transition-colors text-outline hover:text-on-surface">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto p-4 scrollbar-hide">
                <CreatePost currentUser={currentUser} onPostCreated={() => setIsCreatePostOpen(false)} />
              </div>
            </div>
          </div>
        </Suspense>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative p-6 flex flex-col gap-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary">
              <span className="text-2xl">🎓</span>
            </div>
            <h2 className="font-extrabold text-2xl text-on-surface">Welcome to Studial!</h2>
            <p className="text-on-surface-variant text-[15px] leading-relaxed">
              Welcome to your campus social hub! Earn C-Coins to unlock premium study materials. You get +2 C-Coins for your first login every day, and you can earn more by completing tasks posted by the admin.
            </p>
            <button 
              onClick={handleCloseOnboarding}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-full hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-surface-container-highest">
        <Outlet context={{ currentUser, setCurrentUser }} />
      </div>

      <div className="shrink-0 bg-surface z-40 fixed bottom-0 w-full max-w-md md:max-w-3xl lg:max-w-4xl border-x border-outline-variant/30 pb-safe">
        <BottomNav onNewPost={() => setIsCreatePostOpen(true)} />
      </div>

      {/* Coin Reward Modal */}
      {showCoinRewardModal && (
        <Suspense fallback={null}>
          <CoinRewardModal 
            amount={weeklyBonusAmount} 
            title={modalTitle}
            message={modalMessage}
            onClose={() => setShowCoinRewardModal(false)} 
          />
        </Suspense>
      )}
    </div>
  );
}
