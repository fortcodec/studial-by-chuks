import { create } from 'zustand';
import { supabase } from '../supabaseClient';

export const useNotificationStore = create((set, get) => ({
  unreadMessagesCount: 0,
  unreadNotificationsCount: 0,
  unreadTransactionsCount: 0,
  isInitialized: false,
  
  // Initialize subscriptions
  initialize: async (userId) => {
    if (!userId || get().isInitialized) return;

    // Fetch initial counts
    try {
      // Query messages safely: messages table uses (conversation_id, sender_id, content), not receiver_id/read
      const fetchMessagesCount = async () => {
        try {
          const res = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true });
          if (res.error) {
            console.warn('[messages HEAD count query] Error:', res.error);
            return { count: 0 };
          }
          return res;
        } catch (mErr) {
          console.warn('[messages HEAD count query] Exception:', mErr);
          return { count: 0 };
        }
      };

      const fetchNotifCount = async () => {
        try {
          const res = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          if (res.error) {
            console.warn('[notifications HEAD count query] Error:', res.error);
            return { count: 0 };
          }
          return res;
        } catch (nErr) {
          console.warn('[notifications HEAD count query] Exception:', nErr);
          return { count: 0 };
        }
      };

      const [messagesRes, notifRes] = await Promise.all([
        fetchMessagesCount(),
        fetchNotifCount()
      ]);
      
      set({ 
        unreadMessagesCount: messagesRes?.count || 0,
        unreadNotificationsCount: notifRes?.count || 0,
        unreadTransactionsCount: 0
      });
    } catch (err) {
      console.error('Error fetching initial notification counts:', err);
    }

    // Subscribe to realtime changes
    const channel = supabase.channel('global_notifications')
      // Listen to new messages (where receiver is current user)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.sender_id !== userId) {
            set((state) => ({ unreadMessagesCount: state.unreadMessagesCount + 1 }));
          }
        }
      )
      // Listen to new notifications
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          set((state) => ({ unreadNotificationsCount: state.unreadNotificationsCount + 1 }));
        }
      )
      // Listen to new transactions
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'c_coin_transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          set((state) => ({ unreadTransactionsCount: state.unreadTransactionsCount + 1 }));
        }
      )
      .subscribe();

    set({ isInitialized: true });
    
    // Cleanup function stored in state or just let the caller handle it if needed
    // However, Zustand doesn't have a built in way to call cleanup on unmount of store
    // so we return the unsubscribe function.
    return () => {
      supabase.removeChannel(channel);
      set({ isInitialized: false });
    };
  },

  clearMessages: () => set({ unreadMessagesCount: 0 }),
  clearNotifications: () => set({ unreadNotificationsCount: 0 }),
  clearTransactions: () => set({ unreadTransactionsCount: 0 }),
  clearAll: () => set({ unreadMessagesCount: 0, unreadNotificationsCount: 0, unreadTransactionsCount: 0 })
}));
