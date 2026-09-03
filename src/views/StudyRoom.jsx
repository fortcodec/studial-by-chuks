import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function StudyRoom({ navigateTo }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Time state
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isFocusTime, setIsFocusTime] = useState(true);

  // 1. Fetch Current User
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(profile);
      }
    };
    fetchUser();
  }, []);

  // 2. Presence
  useEffect(() => {
    if (!currentUser) return;

    const room = supabase.channel('study-room');
    
    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        const users = [];
        for (const id in state) {
          users.push(...state[id]);
        }
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await room.track({
            id: currentUser.id,
            full_name: currentUser.full_name,
            username: currentUser.username,
            avatar_url: currentUser.avatar_url,
            department: currentUser.department,
          });
        }
      });

    return () => {
      room.untrack();
      supabase.removeChannel(room);
    };
  }, [currentUser]);

  // 3. System Clock Pomodoro Logic
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      const currentMinuteInBlock = minutes % 30; // 0 to 29
      
      if (currentMinuteInBlock < 25) {
        setIsFocusTime(true);
        // remaining time until minute 25
        const minutesLeft = 24 - currentMinuteInBlock;
        const secondsLeft = 59 - seconds;
        setRemainingSeconds(minutesLeft * 60 + secondsLeft);
      } else {
        setIsFocusTime(false);
        // remaining time until minute 30
        const minutesLeft = 29 - currentMinuteInBlock;
        const secondsLeft = 59 - seconds;
        setRemainingSeconds(minutesLeft * 60 + secondsLeft);
      }
    };
    
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getInitials = (name) => {
    return name && name.trim() !== '' ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className={`min-h-screen transition-colors duration-1000 flex flex-col font-inter ${isFocusTime ? 'bg-gray-900 text-white' : 'bg-blue-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${isFocusTime ? 'border-gray-800' : 'border-blue-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('campusHub')} className={`p-2 rounded-full transition ${isFocusTime ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-blue-200 text-gray-600'}`}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Study Room</h1>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${isFocusTime ? 'bg-gray-800 text-red-400' : 'bg-blue-200 text-primary-navy'}`}>
          <Clock size={16} />
          {isFocusTime ? 'FOCUS PHASE' : 'BREAK PHASE'}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Timer */}
        <div className="mb-12">
          <h2 className={`text-sm md:text-base uppercase tracking-[0.3em] font-bold mb-4 transition-colors ${isFocusTime ? 'text-gray-400' : 'text-blue-500'}`}>
            {isFocusTime ? 'Deep Work in Progress' : 'Time to Recharge'}
          </h2>
          <div className={`text-8xl md:text-[9rem] font-black tracking-tighter tabular-nums drop-shadow-lg transition-colors ${isFocusTime ? 'text-white' : 'text-primary-navy'}`}>
            {formatTime(remainingSeconds)}
          </div>
        </div>

        {/* Currently Studying */}
        <div className={`mt-12 p-8 rounded-3xl backdrop-blur-md border max-w-2xl w-full transition-colors ${isFocusTime ? 'bg-gray-800/50 border-gray-700' : 'bg-white/60 border-blue-100 shadow-xl'}`}>
          <div className="flex flex-col items-center">
            <div className={`flex items-center gap-2 mb-6 font-bold transition-colors ${isFocusTime ? 'text-gray-300' : 'text-gray-600'}`}>
              <Users size={20} />
              <h3>Currently Studying ({activeUsers.length})</h3>
            </div>
            
            {activeUsers.length === 0 ? (
              <p className={isFocusTime ? 'text-gray-500' : 'text-gray-400'}>Waiting for others to join...</p>
            ) : (
              <div className="flex flex-wrap justify-center items-center">
                {activeUsers.map((user, index) => (
                  <div key={user.id || index} className="relative -ml-4 first:ml-0 group hover:z-10 transition-transform hover:scale-110">
                    <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center text-xl font-bold overflow-hidden transition-colors ${isFocusTime ? 'border-gray-900 bg-gray-700 text-white' : 'border-blue-50 bg-primary-navy text-white'}`}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(user.full_name)
                      )}
                    </div>
                    {/* Online Dot */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
                    
                    {/* Tooltip */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      {user.full_name || 'Anonymous User'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
