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

          <div className="relative mb-6">
            <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 rounded-full animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-yellow-100 to-yellow-50 border border-yellow-200 shadow-xl shadow-yellow-200/50 rounded-2xl px-10 py-6 text-center">
              <p className="text-sm font-bold text-yellow-700 tracking-widest uppercase mb-1.5 drop-shadow-sm">Reward Amount</p>
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-500 drop-shadow-sm">
                +{amount} C
              </h2>
            </div>
          </div>

          <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Message from Admin
            </div>
            <p className="text-gray-600 text-[15px] leading-relaxed italic text-center font-medium">
              "{message || "Congratulations! You've received a campus bonus!"}"
            </p>
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
