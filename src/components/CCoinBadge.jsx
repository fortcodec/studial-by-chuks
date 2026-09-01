import React from 'react';

export default function CCoinBadge({ balance, onClick, className = '' }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-yellow-200 hover:shadow-md transition active:scale-95 ${className}`}
    >
      <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-inner border border-yellow-600/30">
        {/* Embossed 'C' */}
        <span className="text-yellow-900 font-black text-xs drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
          C
        </span>
      </div>
      <span className="font-bold text-gray-800">{balance}</span>
    </button>
  );
}
