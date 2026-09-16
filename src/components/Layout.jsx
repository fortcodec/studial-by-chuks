import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (sessionStorage.getItem('show_login_banner') === 'true') {
      setShowLoginReward(true);
      sessionStorage.removeItem('show_login_banner');
      setTimeout(() => setShowLoginReward(false), 5000);
    }
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
          setCurrentUser({
            id: user.id,
            name: profile.full_name || profile.username || 'Student',
            c_coins: profile.c_coins || 0,
            avatar: profile.avatar_url || ""
          });
        }
      }
    };
    
    fetchUser();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden max-w-md mx-auto shadow-2xl">
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
          <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-warning text-sm drop-shadow-sm">🪙</span>
            <span className="text-[13px] font-bold text-on-surface">{currentUser.c_coins.toLocaleString()} C</span>
          </div>
          
          <button className="relative text-outline hover:text-on-surface transition-colors active:scale-95">
            <Bell className="w-6 h-6" />
            {hasNotifications && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
            )}
          </button>
          
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              className="w-9 h-9 rounded-full object-cover border-2 border-surface-container-low shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold border-2 border-surface-container-low shadow-sm text-sm">
              {currentUser.name.charAt(0).toUpperCase()}
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
