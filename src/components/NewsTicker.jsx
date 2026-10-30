import React, { useState, useEffect } from 'react';

const FALLBACK_NEWS = [
  { title: 'Welcome to Studial • Start a Pomodoro Sprint to earn C-Coins', link: '/live' },
  { title: 'Unlock premium study materials & past exam questions in The Library', link: '/library' },
  { title: 'Verify your student account in Settings for automated Birthday C-Coin drops', link: '/settings' },
  { title: 'Ask Samuel AI Tutor for instant step-by-step academic explanations', link: '#' }
];

export default function LiveNewsTicker() {
  const [news, setNews] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchNews = async () => {
      try {
        const cacheBuster = Date.now();
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://punchng.com/feed?t=${cacheBuster}`);
        
        if (!res.ok) {
          // If status is 403 or other non-OK status, silently hide
          if (isMounted) setIsVisible(false);
          return;
        }

        const data = await res.json();
        
        if (isMounted) {
          if (data?.items && data.items.length > 0) {
            const shuffledNews = data.items.sort(() => 0.5 - Math.random());
            setNews(shuffledNews.slice(0, 5));
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        }
      } catch (error) {
        // Silently catch error and hide the banner completely to avoid empty black boxes
        if (isMounted) {
          setIsVisible(false);
        }
      }
    };

    fetchNews();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isVisible || !news || news.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center w-full h-8 bg-black text-slate-900 dark:text-white overflow-hidden text-xs sm:text-sm border-b border-gray-800">
      
      {/* Injecting CSS directly so it scrolls perfectly without needing tailwind.config.js edits */}
      <style>
        {`
          @keyframes scroll-text {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
          }
          .animate-ticker {
            display: inline-block;
            white-space: nowrap;
            animation: scroll-text 25s linear infinite;
          }
          .animate-ticker:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      {/* The static yellow tag */}
      <div className="bg-yellow-500 text-black font-extrabold px-3 py-1 flex-shrink-0 z-10 flex items-center gap-2 h-full">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        BREAKING
      </div>

      {/* The scrolling live data */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="animate-ticker">
          {news.map((item, index) => (
            <span key={index} className="mx-6">
              • 
              <a 
                href={item.link} 
                target={item.link.startsWith('http') ? "_blank" : undefined}
                rel="noopener noreferrer" 
                className="ml-2 hover:text-yellow-400 hover:underline transition-colors"
              >
                {item.title}
              </a>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
