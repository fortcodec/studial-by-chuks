import React, { useState, useEffect } from 'react';

export default function LiveNewsTicker() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    // Fetches live RSS feeds and converts them to JSON without needing an API key
    // Using Vanguard Nigeria as the default source
    const fetchNews = async () => {
      try {
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://punchng.com/feed');
        const data = await res.json();
        
        if (data.items) {
          // Grab the top 5 latest headlines
          setNews(data.items.slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to fetch live news:", error);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="flex items-center w-full h-8 bg-black text-white overflow-hidden text-xs sm:text-sm border-b border-gray-800">
      {/* The static yellow tag */}
      <div className="bg-yellow-500 text-black font-extrabold px-3 py-1 flex-shrink-0 z-10 flex items-center gap-2 h-full">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        BREAKING
      </div>

      {/* The scrolling live data */}
      <div className="flex-1 overflow-hidden whitespace-nowrap relative flex items-center">
        {news.length > 0 ? (
          <div className="inline-block animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused]">
            {news.map((item, index) => (
              <span key={index} className="mx-6">
                • 
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 hover:text-yellow-400 hover:underline transition-colors"
                >
                  {item.title}
                </a>
              </span>
            ))}
          </div>
        ) : (
          <span className="mx-4 text-gray-400 animate-pulse">Loading live campus updates...</span>
        )}
      </div>
    </div>
  );
}
