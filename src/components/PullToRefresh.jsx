import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const contentRef = useRef(null);

  const threshold = 80;
  const maxPull = 120;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (startY === 0 || refreshing) return;
      const y = e.touches[0].clientY;
      const pullDistance = y - startY;

      if (pullDistance > 0 && window.scrollY === 0) {
        // Prevent default scrolling when pulling down at the top
        if (e.cancelable) e.preventDefault();
        setCurrentY(Math.min(pullDistance, maxPull));
        setPullProgress(Math.min(pullDistance / threshold, 1));
      }
    };

    const handleTouchEnd = async () => {
      if (startY === 0 || refreshing) return;

      if (currentY >= threshold) {
        setRefreshing(true);
        setCurrentY(50); // Hold at a specific height while refreshing
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setCurrentY(0);
          setStartY(0);
          setPullProgress(0);
        }
      } else {
        setCurrentY(0);
        setStartY(0);
        setPullProgress(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, currentY, refreshing, onRefresh]);

  return (
    <div ref={contentRef} className="relative w-full h-full">
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 ease-out"
        style={{ 
          height: `${currentY}px`,
          opacity: pullProgress 
        }}
      >
        <div className={`bg-surface shadow-md rounded-full p-2 flex items-center justify-center transition-transform ${refreshing ? 'animate-spin' : ''}`}
             style={{ transform: `rotate(${pullProgress * 360}deg)` }}>
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
      </div>
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${currentY}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
