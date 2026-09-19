import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Award } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function PomodoroCard({ currentUser }) {
  // Use 25 mins for Focus, 5 mins for Break. 
  // (We use constants to make logic readable)
  const FOCUS_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  const [mode, setMode] = useState('focus'); // 'focus' or 'break'
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      setIsActive(false);
      handleComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const handleComplete = async () => {
    if (mode === 'focus') {
      // Trigger reward
      setShowReward(true);
      
      if (currentUser?.id) {
        // Reuse the RPC for coins
        const { error } = await supabase.rpc('reward_quiz_coin', { 
          target_user_id: currentUser.id 
        });
        
        if (error) {
          console.error("Error rewarding coin:", error);
        }
      }

      // Show reward briefly, then switch to break
      timeoutRef.current = setTimeout(() => {
        setShowReward(false);
        switchMode('break');
      }, 3000);
    } else {
      // Break is over, switch back to focus
      switchMode('focus');
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME);
  };

  const switchMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? FOCUS_TIME : BREAK_TIME);
    setShowReward(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl shadow-surface-1 rounded-2xl p-6 mb-6 border border-outline-variant/30 relative overflow-hidden">
      {/* Visual Celebration Overlay */}
      {showReward && (
        <div className="absolute inset-0 bg-primary/95 flex flex-col items-center justify-center z-20 animate-slide-up rounded-2xl">
          <Award className="w-16 h-16 text-warning mb-2 animate-bounce" />
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Focus Complete!</h2>
          <div className="mt-2 bg-white/20 px-4 py-1.5 rounded-full flex items-center gap-2">
            <span className="text-warning text-lg drop-shadow-sm">🪙</span>
            <span className="text-white font-bold">+1 C Coin</span>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-surface-container-low rounded-full p-1 border border-outline-variant/40 shadow-inner">
          <button
            onClick={() => switchMode('focus')}
            className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${
              mode === 'focus'
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${
              mode === 'break'
                ? 'bg-white text-secondary-green shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Short Break
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex justify-center items-center mb-8">
        <h1 className={`text-6xl font-extrabold tracking-tighter font-mono transition-colors duration-500 ${
          mode === 'focus' ? 'text-primary' : 'text-secondary-green'
        }`}>
          {formatTime(timeLeft)}
        </h1>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={toggleTimer}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
            isActive 
              ? 'bg-error hover:bg-error/90 shadow-error/20' 
              : mode === 'focus'
                ? 'bg-primary hover:bg-primary-container shadow-primary/20'
                : 'bg-secondary-green hover:bg-secondary-green/90 shadow-secondary-green/20'
          }`}
        >
          {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>
        
        <button
          onClick={resetTimer}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors active:scale-90"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
