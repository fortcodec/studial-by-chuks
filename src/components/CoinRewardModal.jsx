import React, { useEffect, useState } from 'react';
import { Coins, X, Sparkles } from 'lucide-react';

export default function CoinRewardModal({ amount = 500, title, message, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to trigger entry animation
    setTimeout(() => setMounted(true), 10);
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ${mounted ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div 
        className={`bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative transform transition-all duration-500 delay-100 ${
          mounted ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-12 opacity-0'
        }`}
      >
        {/* Confetti / Sparkles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 text-yellow-400 opacity-20 transform rotate-12">
            <Sparkles className="w-32 h-32" />
          </div>
          <div className="absolute -bottom-10 -left-10 text-yellow-400 opacity-20 transform -rotate-12">
            <Sparkles className="w-32 h-32" />
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400 opacity-20"></div>
            <Coins className="w-10 h-10 text-yellow-500 relative z-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{title || "Campus Bonus!"}</h2>
          <p className="text-gray-500 text-[15px] leading-relaxed mb-6">
            {message || "Congratulations! You've received your weekly campus bonus from the admin."}
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full mb-6">
            <p className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-1">Reward Amount</p>
            <p className="text-3xl font-black text-yellow-600">+{amount} C</p>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
          >
            Claim Reward
          </button>
        </div>
      </div>
    </div>
  );
}
