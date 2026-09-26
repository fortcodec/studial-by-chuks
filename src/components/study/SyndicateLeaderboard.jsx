import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Trophy, Clock, Users, Flame } from 'lucide-react';

export default function SyndicateLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      // Query the study_rooms table for rooms with the highest focus minutes
      // Assumes study_rooms has columns: id, name, total_focus_minutes, active_participants
      try {
        const { data, error } = await supabase
          .from('study_rooms')
          .select('id, name, total_focus_minutes, active_participants')
          .order('total_focus_minutes', { ascending: false })
          .limit(10);
          
        if (!error && data) {
          setLeaderboard(data);
        } else if (error && error.code !== '42P01') {
          // Ignore missing table error during dev
          console.error("Leaderboard fetch error:", error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Weekly Syndicate</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Most dedicated study rooms</p>
          </div>
        </div>
        <div className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">
          Live
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm italic">
          No active rooms this week yet. Be the first to start a sprint!
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((room, idx) => (
            <div 
              key={room.id}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                idx === 0 
                  ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20' 
                  : 'bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30'
              }`}
            >
              <div className={`w-8 text-center font-black ${
                idx === 0 ? 'text-amber-500 text-lg' : 
                idx === 1 ? 'text-slate-400 text-lg' : 
                idx === 2 ? 'text-amber-700 text-lg' : 'text-slate-300 dark:text-slate-600'
              }`}>
                #{idx + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-sm ${idx === 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {room.name || `Room ${room.id.substring(0, 4)}`}
                  </h4>
                  {idx === 0 && <Flame className="w-3 h-3 text-amber-500" />}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {Math.floor((room.total_focus_minutes || 0) / 60)}h {(room.total_focus_minutes || 0) % 60}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {room.active_participants || 0} active
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
