import React, { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { supabase } from "../supabaseClient";

export default function Layout() {
  const [currentUser, setCurrentUser] = useState({
    name: "Student",
    c_coins: 0,
    avatar: "",
  });
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showLoginReward, setShowLoginReward] = useState(false);

  // Notification Dropdown State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const notificationRef = useRef(null);

  const fetchTransactions = async () => {
    if (!currentUser?.id) return;
    setIsTransactionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('c_coin_transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setTransactions(data);
        setHasNotifications(false); // Clear red dot when viewed
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (isNotificationsOpen) {
      fetchTransactions();
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
          
          // Enforce Once-Per-Day Login Reward
          const todayStr = new Date().toDateString();
          const lastClaimed = localStorage.getItem('last_login_reward_date');
          
          if (lastClaimed !== todayStr) {
            // New day! Award the coins
            currentCoins += 2;
            
            // 1. Update localStorage
            localStorage.setItem('last_login_reward_date', todayStr);
            
            // 2. Update Database
            await supabase.from('profiles').update({ c_coins: currentCoins }).eq('id', user.id);
            
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

  return (
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto shadow-2xl md:border-x border-outline-variant/30">
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
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Studial.</h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => document.documentElement.classList.toggle('dark')}
            className="p-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-outline hover:text-on-surface shadow-sm active:scale-95 transition-all"
          >
            <span className="dark:hidden flex items-center justify-center w-5 h-5">🌙</span>
            <span className="hidden dark:flex items-center justify-center w-5 h-5">☀️</span>
          </button>
          
          <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-warning text-sm drop-shadow-sm">🪙</span>
            <span className="text-[13px] font-bold text-on-surface">{currentUser.c_coins.toLocaleString()} C</span>
          </div>
          
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative text-outline hover:text-on-surface transition-colors active:scale-95"
            >
              <Bell className="w-6 h-6" />
              {hasNotifications && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
                  <h3 className="font-bold text-on-surface">C-Coin History</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {isTransactionsLoading ? (
                    <div className="p-6 text-center text-outline text-sm">Loading transactions...</div>
                  ) : transactions.length === 0 ? (
                    <div className="p-6 text-center text-outline text-sm font-medium">
                      No recent transactions yet.<br/><span className="text-xs">Complete tasks to earn C-Coins!</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/30">
                      {transactions.map(t => {
                        const isPositive = t.amount?.startsWith('+');
                        return (
                          <div key={t.id || Math.random()} className="p-4 hover:bg-surface-container-lowest transition-colors flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-on-surface">{t.description || 'Transaction'}</p>
                              <p className="text-xs text-outline font-medium">{new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-sm font-bold ${isPositive ? 'text-secondary-green' : 'text-error'}`}>
                              {t.amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {currentUser?.avatar_url || currentUser?.avatar ? (
            <img 
              src={currentUser.avatar_url || currentUser.avatar} 
              alt="Profile" 
              className="w-9 h-9 rounded-full object-cover border-2 border-surface-container-low shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold border-2 border-surface-container-low shadow-sm text-sm">
              {String(currentUser?.username || currentUser?.name || 'Student').charAt(0).toUpperCase().replace(/[0-9]/, 'S')}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <Outlet context={{ currentUser, setCurrentUser }} />
      </div>

      <div className="shrink-0 bg-surface z-40">
        <BottomNav />
      </div>
    </div>
  );
}
