import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Megaphone } from 'lucide-react';

export default function NewsTicker() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_news')
          .select('headline, source, url')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        setNews(data || []);
      } catch (err) {
        console.error("Error fetching news:", err);
      }
    };
    
    fetchNews();
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="bg-surface/80 dark:bg-black/60 backdrop-blur-md text-on-surface w-full overflow-hidden flex items-center py-1.5 border-b border-white/20 dark:border-white/5 shrink-0 relative z-50">
      <div className="bg-[#eab308] text-black font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 flex items-center gap-1 z-10 shrink-0 shadow-lg">
        <Megaphone className="w-3 h-3" />
        Breaking
      </div>
      <div className="flex-1 overflow-hidden whitespace-nowrap relative">
        <div className="inline-block animate-[marquee_20s_linear_infinite] px-4 space-x-8 hover:[animation-play-state:paused]">
          {news.map((item, index) => (
            <a 
              key={index} 
              href={item.url || '#'} 
              target={item.url ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="text-sm font-medium text-on-surface hover:text-primary transition-colors inline-flex items-center"
            >
              • {item.headline} {item.source && <span className="text-xs text-outline ml-1">({item.source})</span>}
            </a>
          ))}
          {/* Duplicate for seamless loop */}
          {news.map((item, index) => (
            <a 
              key={`dup-${index}`} 
              href={item.url || '#'} 
              target={item.url ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="text-sm font-medium text-on-surface hover:text-primary transition-colors inline-flex items-center"
            >
              • {item.headline} {item.source && <span className="text-xs text-outline ml-1">({item.source})</span>}
            </a>
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
