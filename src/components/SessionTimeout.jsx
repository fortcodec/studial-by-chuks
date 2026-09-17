import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut } from 'lucide-react';

const WARNING_TIME = 90000; // 1 minute 30 seconds
const LOGOUT_TIME = 120000; // 2 minutes

export default function SessionTimeout({ children }) {
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  
  // Use refs to track timeouts so they can be cleared inside event listeners
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);

  const resetTimers = () => {
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    // Hide warning if it was showing
    setShowWarning(false);

    // Set new timers
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_TIME);

    logoutTimerRef.current = setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    }, LOGOUT_TIME);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    // Initialize timers on mount
    resetTimers();

    // Attach listeners
    events.forEach(event => document.addEventListener(event, handleActivity));

    // Cleanup
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [showWarning, navigate]);

  return (
    <>
      {children}
      
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
              <LogOut className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-on-surface mb-2">Are you still there?</h2>
            <p className="text-on-surface-variant text-sm mb-6">
              You have been inactive. For your security, you will be logged out in 30 seconds.
            </p>
            
            <button 
              onClick={resetTimers}
              className="w-full bg-primary hover:bg-primary-container text-white py-3 rounded-full font-bold transition-all active:scale-95"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      )}
    </>
  );
}
