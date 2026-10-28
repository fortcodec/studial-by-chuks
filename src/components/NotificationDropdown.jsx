import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  MessageSquare, 
  Award, 
  Sparkles, 
  BookOpen, 
  Info,
  Clock,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNotificationStore } from '../store/useNotificationStore';

function formatNotificationTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'chat':
    case 'message':
      return <MessageSquare className="w-4 h-4 text-sky-400" />;
    case 'reward':
    case 'weekly_drop':
    case 'admin_gift':
      return <Award className="w-4 h-4 text-amber-400" />;
    case 'mentor':
    case 'tier_upgrade':
      return <Sparkles className="w-4 h-4 text-purple-400" />;
    case 'study':
    case 'task_approved':
      return <BookOpen className="w-4 h-4 text-emerald-400" />;
    default:
      return <Bell className="w-4 h-4 text-indigo-400" />;
  }
}

export default function NotificationDropdown({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(currentUser?.id || null);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Zustand notification store integration
  const globalUnreadCount = useNotificationStore((state) => state.unreadNotificationsCount);
  const clearGlobalNotifications = useNotificationStore((state) => state.clearNotifications);

  // Determine user ID if not passed directly via props
  useEffect(() => {
    if (currentUser?.id) {
      setUserId(currentUser.id);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserId(user.id);
      });
    }
  }, [currentUser?.id]);

  // Fetch initial notifications
  const fetchNotifications = async (uid) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        const count = data.filter((n) => {
          if (n.is_read !== undefined && n.is_read !== null) return !n.is_read;
          if (n.read !== undefined && n.read !== null) return !n.read;
          return false;
        }).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications(userId);
    }
  }, [userId]);

  // Realtime State: Subscribe to INSERT events on public.notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`realtime-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new;
          if (!newNotif) return;

          // Prepend new notification to state
          setNotifications((prev) => [newNotif, ...prev]);

          // Update unread count to trigger the pulsating red dot
          setUnreadCount((prev) => prev + 1);

          // Update global state store if available
          useNotificationStore.setState((state) => ({
            unreadNotificationsCount: (state.unreadNotificationsCount || 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Check if a notification is unread (supports both is_read and legacy read columns)
  const isNotificationUnread = (notif) => {
    if (notif.is_read !== undefined && notif.is_read !== null) return !notif.is_read;
    if (notif.read !== undefined && notif.read !== null) return !notif.read;
    return false;
  };

  // Deep-Linking Logic and marking notification as read in database
  const handleNotificationClick = async (notif) => {
    const unread = isNotificationUnread(notif);

    if (unread) {
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, is_read: true, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Simultaneously update the notification's is_read status to true in the database
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, read: true })
          .eq('id', notif.id);

        if (error) {
          // Fallback if schema only supports is_read or read
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notif.id);
        }
      } catch (err) {
        console.error('Error updating notification read status:', err);
      }
    }

    // Deep-linking: Route to target_url using React Router's useNavigate hook
    const destination = notif.target_url || notif.url || notif.link;
    if (destination) {
      setIsOpen(false);
      navigate(destination);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read: true }))
    );
    setUnreadCount(0);
    clearGlobalNotifications();

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const hasUnread = unreadCount > 0 || globalUnreadCount > 0;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Smart Alerts Notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center ${
          isOpen
            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <Bell className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />

        {/* Pulsating Red Dot when unread notifications arrive */}
        {hasUnread && (
          <span
            className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center"
            title={`${unreadCount} unread notifications`}
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 animate-ping opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 animate-pulse ring-2 ring-white dark:ring-gray-900" />
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-3 w-84 sm:w-96 max-h-[80vh] flex flex-col z-50 backdrop-blur-md bg-white/10 dark:bg-gray-900/90 rounded-2xl shadow-xl border border-white/20 dark:border-white/10 overflow-hidden transform transition-all duration-200 animate-in fade-in slide-in-from-top-2"
        >
          {/* Dropdown Header */}
          <div className="px-4 py-3.5 border-b border-white/15 dark:border-white/10 flex items-center justify-between bg-white/40 dark:bg-gray-950/40 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Smart Alerts
              </span>
              {hasUnread && (
                <span className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/30 dark:hover:bg-white/5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[60vh] divide-y divide-white/10 dark:divide-gray-800/60 scrollbar-thin scrollbar-thumb-white/20">
            {isLoading ? (
              <div className="py-10 px-4 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-gray-800/60 border border-white/20 flex items-center justify-center mb-3 text-slate-400 dark:text-slate-500">
                  <Bell className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No notifications yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                  When mentors message, tasks update, or coin drops arrive, you'll see them here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const unread = isNotificationUnread(notif);
                const hasTargetUrl = Boolean(notif.target_url || notif.url || notif.link);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notif);
                      }
                    }}
                    className={`group relative p-3.5 transition-all duration-150 cursor-pointer text-left flex items-start gap-3 outline-none ${
                      unread
                        ? 'border-l-4 border-indigo-500 bg-white/40 dark:bg-gray-800/60 hover:bg-white/60 dark:hover:bg-gray-800/80 shadow-xs'
                        : 'border-l-4 border-transparent bg-white/5 dark:bg-gray-900/30 hover:bg-white/15 dark:hover:bg-gray-800/40 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                        unread
                          ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-500'
                          : 'bg-white/10 dark:bg-gray-800 border-white/10 dark:border-gray-700 text-slate-400'
                      }`}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            unread
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {notif.title || (notif.type ? notif.type.replace('_', ' ').toUpperCase() : 'Notification')}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 opacity-60" />
                          {formatNotificationTime(notif.created_at)}
                        </span>
                      </div>

                      <p
                        className={`text-xs leading-relaxed line-clamp-2 ${
                          unread
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {notif.message || notif.content || 'You have a new update.'}
                      </p>

                      {/* Deep-link target indicator */}
                      {hasTargetUrl && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                          <span>Open details</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {unread && (
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-500/50"
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="px-4 py-2.5 border-t border-white/15 dark:border-white/10 bg-white/30 dark:bg-gray-950/50 backdrop-blur-md flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Realtime Active
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/inbox');
              }}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              View unified inbox
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
