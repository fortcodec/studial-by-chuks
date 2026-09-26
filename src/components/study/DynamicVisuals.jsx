import React from 'react';

export default function DynamicVisuals({ isTimerRunning, timeLeft, totalTime }) {
  // Calculate progress (0 to 100)
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  
  // Base background opacity increases as time runs out, signifying "deep focus"
  const backgroundIntensity = Math.min(progress / 100, 1);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      {/* 1. Base Gradient - Deepens over time */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 via-purple-900/30 to-slate-950 transition-all duration-1000"
        style={{
          opacity: isTimerRunning ? 0.3 + (backgroundIntensity * 0.7) : 0.3
        }}
      />

      {/* 2. Floating Particles - Only active when running */}
      {isTimerRunning && (
        <div className="absolute inset-0 opacity-50">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g filter="url(#glow)">
              {[...Array(15)].map((_, i) => (
                <circle 
                  key={i}
                  cx={`${Math.random() * 100}%`} 
                  cy={`${Math.random() * 100}%`} 
                  r={Math.random() * 2 + 1} 
                  fill="#c7d2fe" 
                  opacity={Math.random() * 0.5 + 0.3}
                >
                  <animate 
                    attributeName="cy" 
                    values={`${Math.random() * 100}%;${Math.random() * 100}%`} 
                    dur={`${Math.random() * 20 + 10}s`} 
                    repeatCount="indefinite" 
                  />
                  <animate 
                    attributeName="opacity" 
                    values="0;0.8;0" 
                    dur={`${Math.random() * 5 + 3}s`} 
                    repeatCount="indefinite" 
                  />
                </circle>
              ))}
            </g>
          </svg>
        </div>
      )}

      {/* 3. Progress Bar (Bottom edge) */}
      {isTimerRunning && (
        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/20 w-full">
          <div 
            className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
