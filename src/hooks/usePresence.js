import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function usePresence(currentUser) {
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = {};
        Object.values(newState).forEach(presences => {
          presences.forEach(presence => {
            users[presence.user_id] = presence;
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const newState = { ...prev };
          newPresences.forEach(presence => {
            newState[presence.user_id] = presence;
          });
          return newState;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
          const newState = { ...prev };
          leftPresences.forEach(presence => {
            delete newState[presence.user_id];
          });
          return newState;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Handle updating last_seen on unmount
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error("Error updating last_seen:", err);
      }
    };

    const handleUnload = () => {
      // Beacon or sync update before unload if possible
      updateLastSeen();
    };
    
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      updateLastSeen();
      window.removeEventListener('beforeunload', handleUnload);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return { onlineUsers };
}
