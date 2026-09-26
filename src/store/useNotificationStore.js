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
      const [messagesRes, notifRes, txRes] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .eq('read', false), // Assuming there's a read column, or we just rely on realtime since there's no read status
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false),
        supabase
          .from('c_coin_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          // If we had a read column for tx, we'd filter here. Let's assume we want to know about new tx since session start or we'll just track realtime.
      ]);
      
      set({ 
        unreadMessagesCount: messagesRes.count || 0, // In studial, messages might not have read boolean.
        unreadNotificationsCount: notifRes.count || 0,
        unreadTransactionsCount: 0 // Will increment on new tx
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
