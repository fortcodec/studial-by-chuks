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
          .select('headline')
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
    <div className="bg-[#111] text-white w-full overflow-hidden flex items-center py-1.5 border-b border-[#333] shrink-0">
      <div className="bg-[#eab308] text-black font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 flex items-center gap-1 z-10 shrink-0 shadow-lg">
        <Megaphone className="w-3 h-3" />
        Breaking
      </div>
      <div className="flex-1 overflow-hidden whitespace-nowrap relative">
        <div className="inline-block animate-[marquee_20s_linear_infinite] px-4 space-x-8 hover:[animation-play-state:paused]">
          {news.map((item, index) => (
            <span key={index} className="text-sm font-medium text-white/90">
              • {item.headline}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {news.map((item, index) => (
            <span key={`dup-${index}`} className="text-sm font-medium text-white/90">
              • {item.headline}
            </span>
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
