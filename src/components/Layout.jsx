import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Coins, Megaphone, Check, CheckCircle2, MessageSquare, Radio } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { supabase } from "../supabaseClient";
import { logCoinTransaction, createNotification } from "../utils/supabaseHelpers";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";
import CCoinBadge from "./CCoinBadge";
import GlobalSearch from "./GlobalSearch";
import NewsTicker from "./NewsTicker";
import LiveHeader from "./LiveHeader";
import BuyCoinsModal from "./BuyCoinsModal";
import NotificationDropdown from "./NotificationDropdown";
import { useNotificationStore } from "../store/useNotificationStore";

const CreatePost = lazy(() => import("./CreatePost"));
const CoinRewardModal = lazy(() => import("./CoinRewardModal"));

export default function Layout() {
  const [currentUser, setCurrentUser] = useState(null);
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
  
  const navigate = useNavigate();
  const initializeNotifications = useNotificationStore(state => state.initialize);

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
    if (currentUser?.id) {
      fetchUnreadCount();
      const unsubscribe = initializeNotifications(currentUser.id);
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [currentUser?.id, initializeNotifications]);

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
            await supabase.rpc('increment_coins', { user_id_param: user.id, amount_param: 2 });
            await supabase.from('profiles').update({ 
              last_login_reward: new Date(now).toISOString()
            }).eq('id', user.id);
            
            // Log Transaction safely
            await logCoinTransaction({
              userId: user.id,
              amount: '+2 C',
              description: 'Daily Login Bonus',
              transactionType: 'credit'
            });
            
            // Insert Inbox Receipt safely
            await createNotification({
              userId: user.id,
              type: 'reward',
              title: 'Daily Bonus',
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
        <div className="bg-green-500 text-slate-900 dark:text-white text-center py-2 px-4 text-sm font-bold shadow-md animate-slide-down flex justify-center items-center gap-2 relative z-50">
          <span>🎉 +2 C-Coins for logging in today!</span>
          <button onClick={() => setShowLoginReward(false)} className="absolute right-4 text-slate-900 dark:text-white hover:text-green-200">
            &times;
          </button>
        </div>
      )}

      {/* Floating Headers for Edge-to-Edge UI */}
      <div className="absolute top-0 left-0 right-0 z-40">
        {/* News Ticker Global Banner */}
        <NewsTicker />

        {/* Campus Pulse Top LiveHeader */}
        <LiveHeader
          currentUser={currentUser}
          onBuyCoins={() => setIsBuyCoinsOpen(true)}
        />
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
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-900 dark:text-white animate-spin" /></div>}>
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
              className="w-full bg-primary text-slate-900 dark:text-white font-bold py-3.5 rounded-full hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area (Scrollable with dual theme background) */}
      <div className="absolute inset-0 z-0 h-[100dvh] w-full overflow-y-auto scrollbar-hide bg-slate-50 dark:bg-[#0F0F12] pt-[135px]">
        
        <Outlet context={{ currentUser, setCurrentUser }} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-40 w-full pb-safe">
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
