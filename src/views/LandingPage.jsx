import React, { useState, useEffect } from 'react';
import { BookOpen, LogIn, ArrowRight, Menu, X, MessageCircle } from 'lucide-react';
import studentsImg from '../assets/students-collaborating.jpg';
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
        .eq('is_shadow_banned', false) // Optional filter, if applicable
        .order('created_at', { ascending: false })
        .limit(6);

      // We ignore error to fail gracefully silently for guests
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col font-inter relative">
      <style>{`
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
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full z-20">
        <div className="flex items-center gap-2 text-primary-navy">
          <BookOpen size={28} />
          <span className="font-bold text-xl tracking-tight">Studial</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
          <a href="#" className="hover:text-primary-navy transition-colors">Home</a>
          <a href="#about" className="hover:text-primary-navy transition-colors">About</a>
          <a href="#gist" className="hover:text-primary-navy transition-colors">Campus Gist</a>
          <a href="mailto:fchuksd42@gmail.com" className="hover:text-primary-navy transition-colors">Contact Developer</a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className="md:hidden text-primary-navy p-2 hover:bg-gray-100 rounded-lg transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white shadow-lg border-b border-gray-100 z-20 origin-top animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col p-4 text-center font-medium text-gray-600 space-y-2">
            <a 
              href="#" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              Home
            </a>
            <a 
              href="#about" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              About
            </a>
            <a 
              href="#gist" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              Campus Gist
            </a>
            <a 
              href="mailto:fchuksd42@gmail.com" 
              onClick={() => setIsMenuOpen(false)} 
              className="py-3 hover:bg-gray-50 hover:text-primary-navy rounded-lg transition"
            >
              Contact Developer
            </a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 py-24 md:py-40">
        <div className="bg-indigo-100 p-5 rounded-full mb-8 text-indigo-600 mx-auto w-max shadow-sm border border-indigo-200/50">
          <BookOpen size={48} />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight max-w-4xl mx-auto leading-tight">
          Your free campus study library <br className="hidden md:block" />
          <span className="text-emerald-500">and social hub.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Access past questions, lecture notes, and collaborate with course mates across your university in one centralized platform.
        </p>

        {/* Animated Live Posts Marquee */}
        {recentPosts.length > 0 && (
          <div className="w-full max-w-5xl mx-auto mt-4 mb-14 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="flex gap-4 animate-marquee whitespace-nowrap w-max">
              {[...recentPosts, ...recentPosts].map((post, idx) => (
                <div key={`${post.id}-${idx}`} className="inline-flex items-start gap-3 bg-white/80 backdrop-blur border border-white/50 p-4 rounded-2xl shadow-sm shadow-indigo-100/50 min-w-[280px] max-w-[280px] whitespace-normal text-left transition-transform hover:-translate-y-1">
                  {post?.profiles?.avatar_url ? (
                    <img src={post?.profiles?.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold flex-shrink-0 border border-indigo-200">
                      {(post.profiles?.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 mb-1 truncate">@{post.profiles?.username || 'student'}</p>
                    <p className="text-[13px] text-slate-600 line-clamp-2 leading-snug">{post.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto justify-center">
          <button 
            onClick={() => navigate('/onboarding')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            Get Started <ArrowRight size={20} />
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-10 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <LogIn size={20} /> Log In
          </button>
        </div>
      </main>

      {/* About Section */}
      <section id="about" className="bg-white py-24 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Image */}
          <div className="relative group">
            <div className="absolute inset-0 bg-secondary-green rounded-2xl transform translate-x-4 translate-y-4 opacity-20 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-300"></div>
            <img 
              src={studentsImg} 
              alt="Nigerian university students collaborating dynamically with textbooks and a laptop in a sunlit campus setting" 
              className="relative z-10 w-full h-auto rounded-2xl shadow-xl object-cover aspect-[4/3]"
            />
          </div>

          {/* Right Column: Text Content */}
          <div className="text-left space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-navy tracking-tight">
                Digital Empowerment: Our Vision.
              </h2>
              <h3 className="text-xl font-semibold text-secondary-green">
                Built by Students, For Students.
              </h3>
            </div>
            
            <p className="text-gray-600 leading-relaxed text-lg">
              Studial isn't just a website; it's an answer to a challenge faced by every student in Nigerian tertiary institutions. We understand the frustration of hunts for past questions and study materials. That's why we built this unified platform. Our vision is to empower students by providing a filtered, free, and accessible library of academic materials tailored exactly to your department.
            </p>

            <div className="pt-4">
              <button 
                onClick={() => navigate('/onboarding')}
                className="bg-secondary-green hover:bg-[#047857] text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-secondary-green/20 hover:shadow-secondary-green/40 active:scale-95 inline-flex"
              >
                Get Started <ArrowRight size={20} />
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
