import React, { useState, useEffect } from 'react';
import { Target, Clock, Trophy, X, ChevronRight } from 'lucide-react';

export default function WelcomeBountyModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show once per session or device
    const hasSeenRules = localStorage.getItem('studial_seen_study_rules');
    if (!hasSeenRules) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('studial_seen_study_rules', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative p-6 md:p-8">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 mx-auto">
            <Target className="w-8 h-8 text-indigo-400" />
          </div>

          <h2 className="text-2xl font-black text-white text-center mb-2">
            Welcome to the Lock-In
          </h2>
          <p className="text-slate-400 text-center text-sm mb-8 max-w-sm mx-auto">
            Focus deeply, avoid distractions, and earn C-Coins to unlock premium materials.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">25 Minute Sprint</h4>
                <p className="text-slate-400 text-xs">Standard Pomodoro session</p>
              </div>
              <div className="ml-auto font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
                +10 Coins
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">50 Minute Sprint</h4>
                <p className="text-slate-400 text-xs">Deep Work session</p>
              </div>
              <div className="ml-auto font-black text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full">
                +25 Coins
              </div>
            </div>
          </div>

          <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-200">
            <span className="font-bold text-red-400">Anti-Cheat Active:</span> If you leave this tab or minimize the app for more than 30 seconds while the timer is running, your session will fail and you will earn nothing.
          </div>

          <button 
            onClick={handleClose}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/20"
          >
            I understand, let's focus <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
