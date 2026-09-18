import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { supabase } from "../supabaseClient";
import CreatePost from "./CreatePost";
import { X } from "lucide-react";
import { Avatar } from "./Avatar";

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
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const notificationRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(5);
      
      if (!error && data) {
        setSearchResults(data);
      }
    };
    
    const timeoutId = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        <div className="flex-1 max-w-sm mx-4 relative" ref={searchRef}>
          <div className={`flex items-center bg-surface-container-low border border-outline-variant/30 rounded-full px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/20 ${isSearchOpen ? 'ring-2 ring-primary/20 bg-surface-container' : ''}`}>
            <Search className="w-4 h-4 text-outline" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search users..."
              className="w-full bg-transparent border-none outline-none text-[13px] px-2 text-on-surface placeholder-outline"
            />
          </div>
          
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute top-full mt-2 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden z-50">
              {searchResults.length > 0 ? (
                searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                      navigate(`/profile/${user.id}`);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low transition-colors flex items-center gap-3 border-b border-outline-variant/10 last:border-b-0"
                  >
                    <Avatar url={user.avatar_url} name={user.username || user.full_name} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[13px] text-on-surface truncate">{user.username || user.full_name}</span>
                      {user.full_name && user.username && <span className="text-[11px] text-outline truncate">@{user.username}</span>}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-[13px] text-outline text-center">No users found</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
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
      )}

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-surface-container-highest">
        <Outlet context={{ currentUser, setCurrentUser }} />
      </div>

      <div className="shrink-0 bg-surface z-40 fixed bottom-0 w-full max-w-md md:max-w-3xl lg:max-w-4xl border-x border-outline-variant/30 pb-safe">
        <BottomNav onNewPost={() => setIsCreatePostOpen(true)} />
      </div>
    </div>
  );
}
