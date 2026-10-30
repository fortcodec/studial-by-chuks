import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  LogIn, 
  ArrowRight, 
  Menu, 
  X, 
  Library, 
  Coins, 
  Bot, 
  Star, 
  ArrowUpRight,
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme } from 'next-themes';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recentPosts, setRecentPosts] = useState([]);

  // Guard hydration to prevent server/client theme mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const CACHE_KEY = 'studial_landing_posts';
    const CACHE_TIME_KEY = 'studial_landing_posts_time';
    const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

    const fetchPosts = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      
      if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_DURATION)) {
        if (isMounted) setRecentPosts(JSON.parse(cached));
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('id, content, profiles!user_id(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data && isMounted) {
        setRecentPosts(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      }
    };

    fetchPosts();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-200 bg-slate-50 dark:bg-[#0F0F12] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans">
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 6s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        .animate-fade-in-up-delayed { animation: fade-in-up 0.8s ease-out 0.2s forwards; opacity: 0; }
        
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full z-30 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <BookOpen size={22} className="text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
            Studial<span className="text-blue-600">.</span>
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-300">
          <a href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors">Home</a>
          <a href="#features" className="hover:text-blue-600 dark:hover:text-white transition-colors">Features</a>
          <a href="#gist" className="hover:text-blue-600 dark:hover:text-white transition-colors">Campus Gist</a>
          <a href="mailto:fchuksd42@gmail.com" className="hover:text-blue-600 dark:hover:text-white transition-colors">Contact</a>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button (Hydration Safe) */}
          {!mounted ? (
            <button
              type="button"
              aria-label="Theme toggle loading"
              tabIndex={-1}
              className="p-2.5 rounded-xl border transition-colors bg-white border-slate-200 dark:bg-[#1A1A1F] dark:border-[#2E2E38] shadow-sm pointer-events-none"
            >
              <span className="block w-[18px] h-[18px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTheme((resolvedTheme || theme) === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle Theme"
              className="p-2.5 rounded-xl border transition-colors bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1A1A1F] dark:hover:bg-[#24242B] dark:text-slate-200 dark:border-[#2E2E38] shadow-sm"
            >
              {(resolvedTheme || theme) === 'dark' ? (
                <Sun size={18} className="text-yellow-400" />
              ) : (
                <Moon size={18} className="text-blue-600" />
              )}
            </button>
          )}

          {/* Action Button */}
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button 
            className="md:hidden text-slate-900 dark:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition z-50 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu (Glassmorphic Slide-in) */}
      <div className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className={`absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-[#1A1A1F] border-l border-slate-200 dark:border-[#2E2E38] shadow-2xl p-6 flex flex-col pt-24 space-y-6 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
          <a href="#" onClick={() => setIsMenuOpen(false)} className="text-base font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition">Home</a>
          <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-base font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition">Features</a>
          <a href="#gist" onClick={() => setIsMenuOpen(false)} className="text-base font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition">Campus Gist</a>
          <a href="mailto:fchuksd42@gmail.com" onClick={() => setIsMenuOpen(false)} className="text-base font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition">Contact</a>
          
          <div className="pt-6 border-t border-slate-200 dark:border-[#2E2E38] space-y-3">
            <button
              onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-[#24242B] text-slate-900 dark:text-white"
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); navigate('/onboarding'); }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-md shadow-blue-500/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-28 relative z-10">
        
        {/* Floating Social Proof Pills */}
        <div className="absolute top-20 left-10 md:left-32 animate-float-slow hidden sm:flex items-center gap-2 bg-white/90 dark:bg-[#1A1A1F]/90 backdrop-blur-md border border-slate-200 dark:border-[#2E2E38] px-4 py-2 rounded-full shadow-lg text-xs font-bold text-slate-700 dark:text-slate-300">
          <BookOpen size={15} className="text-blue-600" />
          <span>📝 CSC201 Past Q's Uploaded</span>
        </div>
        <div className="absolute bottom-40 right-10 md:right-32 animate-float-slower hidden sm:flex items-center gap-2 bg-white/90 dark:bg-[#1A1A1F]/90 backdrop-blur-md border border-slate-200 dark:border-[#2E2E38] px-4 py-2 rounded-full shadow-lg text-xs font-bold text-slate-700 dark:text-slate-300">
          <Bot size={15} className="text-blue-500" />
          <span>🤖 Samuel AI Online</span>
        </div>
        <div className="absolute top-40 right-5 md:right-40 animate-float-slow hidden lg:flex items-center gap-2 bg-white/90 dark:bg-[#1A1A1F]/90 backdrop-blur-md border border-slate-200 dark:border-[#2E2E38] px-4 py-2 rounded-full shadow-lg text-xs font-bold text-slate-700 dark:text-slate-300">
          <Coins size={15} className="text-amber-500" />
          <span>🪙 +50 C-Coins Earned</span>
        </div>

        <div className="animate-fade-in-up max-w-3xl">
          <div className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 p-3.5 rounded-2xl mb-8 mx-auto w-max border border-blue-200 dark:border-blue-800/40 shadow-sm">
            <Star size={28} />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            Your Campus, <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 dark:from-blue-400 dark:via-indigo-300 dark:to-blue-300 bg-clip-text text-transparent">Connected.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            The modern academic social network. Access verified past questions, collaborate with peers, and earn C-Coins while you excel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <button 
              onClick={() => navigate('/onboarding')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-xl shadow-blue-500/25 px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              Get Started <ArrowRight size={18} />
            </button>
            
            <button 
              onClick={() => navigate('/login')}
              className="bg-white hover:bg-slate-100 dark:bg-[#1A1A1F] dark:hover:bg-[#24242B] text-slate-900 dark:text-white border border-slate-200 dark:border-[#3F3F4E] px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-95 text-sm"
            >
              <LogIn size={18} /> Sign In
            </button>
          </div>
        </div>

      </main>

      {/* Modern Bento Box Grid (Features) */}
      <section id="features" className="py-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto animate-fade-in-up-delayed">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              Everything you need.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Engineered specifically for the university ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: The Library */}
            <div className="md:col-span-2 bg-white dark:bg-[#1A1A1F] border border-slate-200/80 dark:border-[#2E2E38] rounded-3xl p-8 transition-all shadow-md hover:shadow-xl flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="bg-blue-50 dark:bg-blue-950/50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400">
                  <Library size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                  The Library <ArrowUpRight className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md font-medium">
                  A massive, crowdsourced repository of past questions and lecture notes tailored to your exact department and courses.
                </p>
              </div>
            </div>

            {/* Card 2: The Economy */}
            <div className="bg-white dark:bg-[#1A1A1F] border border-slate-200/80 dark:border-[#2E2E38] rounded-3xl p-8 transition-all shadow-md hover:shadow-xl flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="bg-amber-50 dark:bg-amber-950/50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-amber-200 dark:border-amber-800/40 text-amber-500">
                  <Coins size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                  C-Coins <ArrowUpRight className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Help peers, upload notes, and complete tasks to earn C-Coins. Spend them on unlocking study materials or withdraw rewards.
                </p>
              </div>
            </div>

            {/* Card 3: The AI */}
            <div className="md:col-span-3 bg-white dark:bg-[#1A1A1F] border border-slate-200/80 dark:border-[#2E2E38] rounded-3xl p-8 md:p-12 transition-all shadow-md hover:shadow-xl flex flex-col md:flex-row items-center justify-between group relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 w-[600px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
              <div className="relative z-10 md:w-1/2 mb-8 md:mb-0">
                <div className="bg-blue-50 dark:bg-blue-950/50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400">
                  <Bot size={28} />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                  Meet Samuel AI <ArrowUpRight className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md font-medium">
                  Stuck on a tough concept? Samuel is your 24/7 AI Tutor built right into Studial. Ask questions, get breakdown explanations, and ace your exams.
                </p>
              </div>
              
              <div className="relative z-10 md:w-1/2 flex justify-end">
                {/* Mock Chat Interface */}
                <div className="bg-slate-50 dark:bg-[#24242B] border border-slate-200 dark:border-[#3F3F4E] p-5 rounded-2xl w-full max-w-sm shadow-xl transform rotate-1 group-hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-[#3F3F4E]">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Bot size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">Samuel AI</p>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Online & Ready</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-[#1A1A1F] border border-slate-200 dark:border-[#2E2E38] p-3 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200">
                      I can help you review CSC 201 algorithms or summarize lecture notes!
                    </div>
                    <div className="bg-blue-600 p-3 rounded-xl text-xs font-semibold text-white ml-6">
                      Explain time complexity of quicksort simply?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Section: Live Campus Gist */}
      <section id="gist" className="py-16 border-t border-slate-200 dark:border-[#2E2E38] relative z-10 bg-white dark:bg-[#0A0A0D]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900 mb-3">
            Campus Pulse
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Live Campus Gist
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time conversations buzzing across Nigerian universities</p>
        </div>

        {recentPosts.length > 0 && (
          <div className="w-full max-w-6xl mx-auto overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="flex gap-4 animate-marquee whitespace-nowrap w-max py-4">
              {[...recentPosts, ...recentPosts].map((post, idx) => (
                <div 
                  key={`${post.id}-${idx}`} 
                  className="inline-flex items-start gap-3.5 bg-white dark:bg-[#0F0F12] border border-slate-200 dark:border-[#2E2E38] p-5 rounded-2xl shadow-md min-w-[320px] max-w-[320px] whitespace-normal text-left transition-transform hover:-translate-y-1"
                >
                  {post?.profiles?.avatar_url ? (
                    <img 
                      src={post?.profiles?.avatar_url} 
                      alt="avatar" 
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-white/10" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-sm flex-shrink-0 border border-blue-200 dark:border-blue-800">
                      {((post.profiles?.username || 'U')[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mb-1 truncate">
                      @{post.profiles?.username || 'student'}
                    </p>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* FortCodec Footer */}
      <footer className="border-t border-slate-200 dark:border-[#2E2E38] bg-slate-50 dark:bg-[#0F0F12] py-10 mt-12 flex flex-col items-center gap-2">
        <span className="font-black text-slate-900 dark:text-white text-xl tracking-tight">Studial<span className="text-blue-600">.</span></span>
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
          &copy; {new Date().getFullYear()} FortCodec. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
