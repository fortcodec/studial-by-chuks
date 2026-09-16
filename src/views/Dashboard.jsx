import React, { useState, useEffect } from "react";
import { Bell, Loader2 } from "lucide-react";
import CreatePost from "../components/CreatePost";
import PomodoroCard from "../components/PomodoroCard";
import { PostCard, LiveRoomCard } from "../components/PostCard";
import QuizModal from "../components/QuizModal";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";

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
  const { currentUser, setCurrentUser } = useOutletContext();
  
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [quizOpen, setQuizOpen] = useState(false);
  const [activeQuizContent, setActiveQuizContent] = useState("");

  const topics = ["All Topics", "⚡ Trending in CS", "Calculus III", "Organic Chem"];

  useEffect(() => {
    let isMounted = true;
    
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

    <div className="flex flex-col h-full relative">
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
    </div>
  );
}
