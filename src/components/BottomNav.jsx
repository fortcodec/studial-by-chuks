import React, { useState, useEffect } from "react";
import { FileText, MessageSquare, Bot, User, BookOpen, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useNotificationStore } from "../store/useNotificationStore";

export function BottomNav({ onNewPost }) {
  const location = useLocation();
  const currentView = location.pathname.substring(1);
  const { unreadMessagesCount, unreadNotificationsCount, unreadTransactionsCount } = useNotificationStore();
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveCount = async () => {
      const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      if (isMounted) setLiveCount(count || 0);
    };
    fetchLiveCount();
    
    const channel = supabase.channel('bottom-nav-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchLiveCount)
      .subscribe();
      
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const profileBadgeCount = unreadNotificationsCount + unreadTransactionsCount;

  const leftNavItems = [
    { name: "Feed", href: "", icon: FileText, badge: null },
    { name: "Inbox", href: "inbox", icon: MessageSquare, badge: unreadMessagesCount > 0 ? (unreadMessagesCount > 9 ? '9+' : unreadMessagesCount) : null },
  ];
  const rightNavItems = [
    { name: "Library", href: "library", icon: BookOpen, badge: null },
    { name: "Profile", href: "profile", icon: User, badge: profileBadgeCount > 0 ? '' : null },
  ];

  return (
    <nav className="w-full bg-white/80 dark:bg-black/60 backdrop-blur-md border-t border-white/10 dark:border-white/5 px-6 py-2 flex justify-between items-center z-50 relative mt-auto shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {leftNavItems.map((item) => {
        const isActive = currentView === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            to={`/${item.href}`}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-transform duration-200 active:scale-90 ${
              isActive ? "text-primary font-bold" : "text-outline hover:text-primary hover:bg-surface-container/50"
            }`}
          >
            <div className="relative mb-1">
              <Icon className={`w-6 h-6 ${isActive ? "fill-primary-container/20 stroke-2" : "stroke-[1.5]"}`} />
              {item.badge !== null && (
                <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}

      <button 
        onClick={onNewPost}
        className="flex items-center justify-center -translate-y-4 shadow-[0_8px_25px_rgba(79,70,229,0.4)] w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white transition-transform duration-200 active:scale-90 mx-2"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

      {rightNavItems.map((item) => {
        const isActive = currentView === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            to={`/${item.href}`}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-transform duration-200 active:scale-90 ${
              isActive ? "text-primary font-bold" : "text-outline hover:text-primary hover:bg-surface-container/50"
            }`}
          >
            <div className="relative mb-1">
              <Icon className={`w-6 h-6 ${isActive ? "fill-primary-container/20 stroke-2" : "stroke-[1.5]"}`} />
              {item.badge !== null && (
                <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
