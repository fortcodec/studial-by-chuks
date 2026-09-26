import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function ParticipantsGrid({ participants, currentUser }) {
  // participants is an object from presence state: { userId: [{ id, name, avatar, intent, status }], ... }
  
  const handleCheer = async (targetUserId) => {
    if (targetUserId === currentUser?.id) return;
    
    // Broadcast a cheer via Supabase Realtime
    const channel = supabase.channel('room:global-study-room'); // Must match ROOM_ID
    await channel.send({
      type: 'broadcast',
      event: 'cheer',
      payload: { 
        targetUserId,
        fromName: currentUser?.name || 'Someone',
        emoji: ['🔥', '👏', '☕', '🚀'][Math.floor(Math.random() * 4)] 
      }
    });
  };

  // Flatten presence state
  const activeUsers = Object.values(participants).map(p => p[0]).filter(Boolean);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-24 left-6 flex flex-col gap-4 z-20 max-h-[60vh] overflow-y-auto scrollbar-hide pr-4">
      {activeUsers.map((user) => (
        <div 
          key={user.id} 
          className="flex items-center gap-3 group relative cursor-pointer"
          onDoubleClick={() => handleCheer(user.id)}
          title="Double click to send a cheer!"
        >
          {/* Avatar */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-slate-800 ${user.status === 'focusing' ? 'border-indigo-500' : user.status === 'failed' ? 'border-red-500' : 'border-slate-500'}`}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white uppercase">
                  {user.name ? user.name.charAt(0) : '?'}
                </div>
              )}
            </div>
            
            {/* Status Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${user.status === 'focusing' ? 'bg-indigo-500 animate-pulse' : user.status === 'failed' ? 'bg-red-500' : 'bg-slate-500'}`} />
          </div>

          {/* Details (Visible on hover or large screens) */}
          <div className="hidden group-hover:flex md:flex flex-col opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-sm p-2 rounded-xl border border-slate-700">
            <span className="text-xs font-bold text-white">{user.name}</span>
            <span className="text-[10px] text-indigo-300 truncate max-w-[120px]">
              {user.intent || 'Focusing...'}
            </span>
          </div>
          
          {/* Cheer Tooltip Hint */}
          <div className="absolute left-14 -bottom-6 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none delay-500">
            Double-tap to cheer!
          </div>
        </div>
      ))}
    </div>
  );
}
