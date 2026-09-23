import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Coins, Megaphone, Check, CheckCircle2, MessageSquare, Radio } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { supabase } from "../supabaseClient";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";
import CCoinBadge from "./CCoinBadge";
import GlobalSearch from "./GlobalSearch";
import NewsTicker from "./NewsTicker";
import BuyCoinsModal from "./BuyCoinsModal";

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
  const [isDailyRewardOpen, setIsDailyRewardOpen] = useState(false);
  const [isBuyCoinsOpen, setIsBuyCoinsOpen] = useState(false);
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
            
            // Insert Inbox Receipt
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'reward',
              content: 'You received 2 C-Coins for logging in today!'
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
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto shadow-2xl">
      {/* Login Reward Banner */}
      {showLoginReward && (
        <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-bold shadow-md animate-slide-down flex justify-center items-center gap-2 relative z-50">
          <span>🎉 +2 C-Coins for logging in today!</span>
          <button onClick={() => setShowLoginReward(false)} className="absolute right-4 text-white hover:text-green-200">
            &times;
          </button>
        </div>
      )}

      {/* Floating Headers for Edge-to-Edge UI */}
      <div className="absolute top-0 left-0 right-0 z-40">
        {/* News Ticker Global Banner */}
        <NewsTicker />

        {/* Glass Header */}
        <div className="bg-surface/60 dark:bg-black/60 backdrop-blur-md px-5 py-3 md:py-4 flex justify-between items-center border-b border-white/20 dark:border-white/10">
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
            onClick={() => setIsBuyCoinsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full font-bold text-[13px] shadow-sm backdrop-blur-sm hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            <span>🪙</span>
            <span>{currentUser.c_coins || 0} C</span>
          </button>

          <button
            onClick={() => navigate('/live')}
            className="relative p-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-outline hover:text-on-surface shadow-sm active:scale-95 transition-all"
          >
            <Radio className="w-5 h-5 text-red-500" />
          </button>
          

          
          <Avatar 
            url={currentUser?.avatar_url || currentUser?.avatar} 
            name={currentUser?.username || currentUser?.name || 'Student'} 
            size="md" 
            className="border-2 border-surface-container-low" 
          />
        </div>
      </div>
    </div>

      {/* Buy Coins Modal */}
      {isBuyCoinsOpen && (
        <BuyCoinsModal 
          currentUser={currentUser} 
          onClose={() => setIsBuyCoinsOpen(false)} 
        />
      )}

      {/* Create Post Modal — centered dialog */}
      {isCreatePostOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}>
          <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-slate-100 text-lg">Create Post</h2>
                <button onClick={() => setIsCreatePostOpen(false)} className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-4 scrollbar-hide">
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
      <div className="absolute inset-0 z-0 h-[100dvh] w-full overflow-y-auto scrollbar-hide bg-[#f8fafc] dark:bg-black pt-[120px]">
        
        <Outlet context={{ currentUser, setCurrentUser }} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-40 w-full pb-safe">
        <BottomNav onNewPost={() => setIsCreatePostOpen(true)} unreadMessagesCount={(unreadCount || 0) + (unreadMessagesCount || 0)} />
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
