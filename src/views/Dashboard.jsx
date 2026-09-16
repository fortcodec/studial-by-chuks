import React, { useState, useEffect } from "react";
import { Bell, Loader2 } from "lucide-react";
import CreatePost from "../components/CreatePost";
import PomodoroCard from "../components/PomodoroCard";
import { PostCard, LiveRoomCard } from "../components/PostCard";
import QuizModal from "../components/QuizModal";
import { BottomNav } from "../components/BottomNav";
import { supabase } from "../supabaseClient";

// Simple relative time formatter
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState({
    name: "Student",
    c_coins: 0,
    avatar: "https://i.pravatar.cc/150?img=33",
  });
  const [hasNotifications, setHasNotifications] = useState(true);
  
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [quizOpen, setQuizOpen] = useState(false);
  const [activeQuizContent, setActiveQuizContent] = useState("");
  const [showLoginReward, setShowLoginReward] = useState(false);

  const topics = ["All Topics", "⚡ Trending in CS", "Calculus III", "Organic Chem"];

  useEffect(() => {
    if (sessionStorage.getItem('show_login_banner') === 'true') {
      setShowLoginReward(true);
      sessionStorage.removeItem('show_login_banner');
      setTimeout(() => setShowLoginReward(false), 5000);
    }
    let isMounted = true;

    // Fetch User
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: user.id,
            name: profile.full_name || profile.username || 'Student',
            c_coins: profile.c_coins || 1450,
            avatar: profile.avatar_url || ""
          });
        }
      }
    };
    
    // Fetch Posts
    const fetchPosts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
        
      if (!error && data && isMounted) {
        setPosts(data);
      }
      if (isMounted) setIsLoading(false);
    };

    fetchUser();
    fetchPosts();

    // Realtime Updates for Posts
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          // Fetch the profile for the new post
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newPost = {
            ...payload.new,
            profiles: profile
          };

          if (isMounted) {
            setPosts(prev => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] relative bg-background overflow-hidden max-w-md mx-auto shadow-2xl">
      {/* Login Reward Banner */}
      {showLoginReward && (
        <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-bold shadow-md animate-slide-down flex justify-center items-center gap-2 relative z-50">
          <span>🎉 +2 C-Coins for logging in today!</span>
          <button onClick={() => setShowLoginReward(false)} className="absolute right-4 text-white hover:text-green-200">
            &times;
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl px-5 py-4 flex justify-between items-center border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-surface-1">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-on-primary">
              <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" />
              <path d="M2 13l10 5 10-5M2 18l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Studial.</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-warning text-sm drop-shadow-sm">🪙</span>
            <span className="text-[13px] font-bold text-on-surface">{currentUser.c_coins.toLocaleString()} C</span>
          </div>
          
          <button className="relative text-outline hover:text-on-surface transition-colors active:scale-95">
            <Bell className="w-6 h-6" />
            {hasNotifications && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
            )}
          </button>
          
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              className="w-9 h-9 rounded-full object-cover border-2 border-surface-container-low shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold border-2 border-surface-container-low shadow-sm text-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 px-5 py-6 overflow-y-auto pb-24 scrollbar-hide">
        <CreatePost />

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1 -mx-5 px-5">
          {topics.map((topic, idx) => (
            <button
              key={topic}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors active:scale-95 ${
                idx === 0 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Pomodoro Timer */}
        <PomodoroCard currentUser={currentUser} />

        {/* Feed Posts */}
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-outline">
            <p className="font-semibold">No posts yet.</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post, index) => (
            <React.Fragment key={post.id}>
              {/* Insert Live Room card dynamically after the first post */}
              {index === 1 && <LiveRoomCard />}
              
              <PostCard 
                type="normal"
                author={{ 
                  name: post.profiles?.full_name || post.profiles?.username || 'Anonymous', 
                  school: post.department || 'University', 
                  avatar: post.profiles?.avatar_url || 'https://i.pravatar.cc/150?img=33' 
                }}
                course="General"
                topic="Discussion"
                timeAgo={formatTimeAgo(post.created_at)}
                content={post.content}
                attachmentImage={post.media_url}
                stats={{ upvotes: post.likes || 0, answers: post.comments || 0 }}
                currentUser={currentUser}
                authorId={post.user_id}
                onTipSuccess={() => setCurrentUser(prev => ({...prev, c_coins: prev.c_coins - 1}))}
                onOpenQuiz={() => {
                  setActiveQuizContent(post.content);
                  setQuizOpen(true);
                }}
              />
            </React.Fragment>
          ))
        )}
      </div>

      <QuizModal 
        isOpen={quizOpen} 
        onClose={() => setQuizOpen(false)} 
        postContent={activeQuizContent} 
        currentUser={currentUser} 
      />

      <BottomNav />
    </div>
  );
}
