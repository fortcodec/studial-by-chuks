import React, { useState, useEffect } from 'react';
import { BookOpen, LogIn, ArrowRight, Menu, X, MessageCircle, Library, Coins, Bot, Star, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recentPosts, setRecentPosts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const CACHE_KEY = 'studial_landing_posts';
    const CACHE_TIME_KEY = 'studial_landing_posts_time';
    const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

    const fetchPosts = async () => {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      
      if (cached && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
        if (isMounted) setRecentPosts(JSON.parse(cached));
        return;
      }

      // Fetch from Supabase
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
    <div className="dark min-h-screen bg-[#080b14] flex flex-col font-inter text-white selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
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
        <div className="flex items-center gap-2 text-white">
          <BookOpen size={28} className="text-indigo-400" />
          <span className="font-bold text-xl tracking-tight">Studial</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
          <a href="#" className="hover:text-white transition-colors">Home</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#gist" className="hover:text-white transition-colors">Campus Gist</a>
          <a href="mailto:fchuksd42@gmail.com" className="hover:text-white transition-colors">Contact</a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition z-50 relative"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Dropdown Menu (Glassmorphic Slide-in) */}
      <div className={`md:hidden fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-xl transition-all duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className={`absolute right-0 top-0 bottom-0 w-64 bg-slate-900/90 border-l border-white/10 shadow-2xl p-6 flex flex-col pt-24 space-y-6 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
          <a href="#" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-slate-300 hover:text-white transition">Home</a>
          <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-slate-300 hover:text-white transition">Features</a>
          <a href="#gist" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-slate-300 hover:text-white transition">Campus Gist</a>
          <a href="mailto:fchuksd42@gmail.com" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-slate-300 hover:text-white transition">Contact</a>
        </div>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 relative z-10">
        
        {/* Floating Social Proof Pills */}
        <div className="absolute top-20 left-10 md:left-32 animate-float-slow hidden sm:flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg shadow-black/20 text-sm font-medium text-slate-300">
          <BookOpen size={16} className="text-blue-400" />
          <span>📝 CSC201 Past Q's Uploaded</span>
        </div>
        <div className="absolute bottom-40 right-10 md:right-32 animate-float-slower hidden sm:flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg shadow-black/20 text-sm font-medium text-slate-300">
          <Bot size={16} className="text-purple-400" />
          <span>🤖 Samuel AI Online</span>
        </div>
        <div className="absolute top-40 right-5 md:right-40 animate-float-slow hidden lg:flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg shadow-black/20 text-sm font-medium text-slate-300">
          <Coins size={16} className="text-yellow-400" />
          <span>🪙 +50 C-Coins Earned</span>
        </div>

        <div className="animate-fade-in-up">
          <div className="bg-indigo-500/10 p-4 rounded-3xl mb-8 text-indigo-400 mx-auto w-max border border-indigo-400/20 backdrop-blur-sm">
            <Star size={32} />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Your Campus, <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">Connected.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-400 max-w-xl mx-auto mb-10">
            The immersive social learning network. Access past questions, chat with peers, and earn rewards while you study.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <button 
              onClick={() => navigate('/onboarding')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25 px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              Get Started <ArrowRight size={20} />
            </button>
            
            <button 
              onClick={() => navigate('/login')}
              className="bg-white/5 hover:bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
            >
              <LogIn size={20} /> Log In
            </button>
          </div>
        </div>

      </main>

      {/* Modern Bento Box Grid (Features) */}
      <section id="features" className="py-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto animate-fade-in-up-delayed">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Everything you need.
            </h2>
            <p className="text-slate-400 text-sm mt-1">Designed for the modern student ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: The Library */}
            <div className="md:col-span-2 bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-md rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <div className="bg-blue-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                  <Library className="text-blue-400" size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                  The Library <ArrowUpRight className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                  A massive, crowdsourced repository of past questions and lecture notes tailored to your exact department and courses.
                </p>
              </div>
            </div>

            {/* Card 2: The Economy */}
            <div className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-md rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <div className="bg-yellow-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/30">
                  <Coins className="text-yellow-400" size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                  C-Coins <ArrowUpRight className="text-slate-500 group-hover:text-yellow-400 transition-colors" />
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Help peers, upload notes, and complete tasks to earn C-Coins. Spend them on premium materials or withdraw to fiat.
                </p>
              </div>
            </div>

            {/* Card 3: The AI */}
            <div className="md:col-span-3 bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 backdrop-blur-md rounded-2xl p-6 md:p-12 transition-all shadow-xl flex flex-col md:flex-row items-center justify-between group relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 w-[800px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10 md:w-1/2 mb-8 md:mb-0">
                <div className="bg-purple-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30">
                  <Bot className="text-purple-400" size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                  Meet Samuel <ArrowUpRight className="text-slate-500 group-hover:text-purple-400 transition-colors" />
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                  Stuck on a concept? Samuel is your 24/7 AI Tutor built right into the platform. Ask questions, get explanations, and ace your exams.
                </p>
              </div>
              <div className="relative z-10 md:w-1/2 flex justify-end">
                {/* Mock Chat Interface */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-full max-w-sm shadow-2xl transform rotate-2 group-hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Bot size={16} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Samuel</p>
                      <p className="text-xs text-green-400">Online</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-slate-800 p-3 rounded-xl rounded-tl-sm text-sm text-slate-200">
                      I can help you understand Quantum Mechanics! Where should we start?
                    </div>
                    <div className="bg-indigo-600 p-3 rounded-xl rounded-tr-sm text-sm text-white ml-8">
                      Can you explain Schrödinger's cat in simple terms?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Section (Moved down) */}
      <section id="gist" className="py-12 border-t border-white/5 relative z-10 bg-slate-950/50">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-slate-300">Live Campus Gist</h3>
        </div>
        {recentPosts.length > 0 && (
          <div className="w-full max-w-6xl mx-auto overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="flex gap-4 animate-marquee whitespace-nowrap w-max py-4">
              {[...recentPosts, ...recentPosts].map((post, idx) => (
                <div key={`${post.id}-${idx}`} className="inline-flex items-start gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg shadow-black/20 min-w-[320px] max-w-[320px] whitespace-normal text-left transition-transform hover:-translate-y-1">
                  {post?.profiles?.avatar_url ? (
                    <img src={post?.profiles?.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold flex-shrink-0 border border-indigo-500/30">
                      {(post.profiles?.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-300 mb-1 truncate">@{post.profiles?.username || 'student'}</p>
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{post.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* FortCodec Footer */}
      <footer className="w-full text-center text-sm text-slate-500 py-8 mt-12 border-t border-white/5">
        &copy; {new Date().getFullYear()} FortCodec. All rights reserved.
      </footer>
    </div>
  );
}
