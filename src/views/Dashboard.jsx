import React, { useState, useEffect, Component } from "react";
import { AlertCircle } from "lucide-react";

import FeedPost from "../components/FeedPost";
import FomoCard from "../components/FomoCard";
import QuizModal from "../components/QuizModal";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";
import useSWR from "swr";
import PullToRefresh from "../components/PullToRefresh";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error in feed item", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#1A1A1F] rounded-2xl mb-4 border border-red-500/20 text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
          <h2 className="text-slate-900 dark:text-white font-bold text-sm">Post Unavailable</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">This post could not be rendered.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const { currentUser, setCurrentUser } = useOutletContext() || {};

  // If user object evaluates to null/undefined or lacks an id, do not render dashboard UI
  if (!currentUser || !currentUser.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  const [posts, setPosts] = useState([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeQuizContent, setActiveQuizContent] = useState("");
  const [currentCampus, setCurrentCampus] = useState(() => {
    return localStorage.getItem('studial_selected_campus') || 'UNIBEN';
  });

  // Listen to campus changes from LiveHeader
  useEffect(() => {
    const handleCampusChange = (e) => {
      if (e.detail?.campus) {
        setCurrentCampus(e.detail.campus);
      }
    };
    window.addEventListener('studial:campus-changed', handleCampusChange);
    return () => window.removeEventListener('studial:campus-changed', handleCampusChange);
  }, []);

  const { data: swrPosts, error, isLoading, mutate } = useSWR(
    'dashboard_posts',
    async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!user_id(id, username, full_name, avatar_url, department, is_shadow_banned), post_likes(count), post_comments(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (swrPosts) {
      const filteredPosts = swrPosts.filter(post => 
        !post?.profiles?.is_shadow_banned || post?.user_id === currentUser?.id
      );
      setPosts(filteredPosts);
    }
  }, [swrPosts, currentUser?.id]);

  useEffect(() => {
    let isMounted = true;

    // Realtime Updates for Posts
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url, department, is_shadow_banned')
              .eq('id', payload.new.user_id)
              .single();

            if (error) throw error;

            if (profile) {
              if (profile.is_shadow_banned && payload.new.user_id !== currentUser?.id) {
                return;
              }

              const newPost = {
                ...payload.new,
                profiles: profile
              };

              if (isMounted) {
                setPosts(prev => [newPost, ...prev]);
              }
            }
          } catch (err) {
            console.error("Error processing realtime post:", err);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return (
    <div className="flex flex-col h-full w-full relative overflow-y-auto bg-transparent">
      {/* Main Feed Container */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 pt-2 sm:pt-4 pb-28">
        <PullToRefresh onRefresh={async () => await mutate()}>

          {/* Cross-Campus FOMO Widget (Dynamic Rival Campus Presence with Purple Accents) */}
          <FomoCard 
            currentCampus={currentCampus}
            onPeekCampus={(peekedCampus) => {
              // Smoothly switch campus context if requested
              setCurrentCampus(peekedCampus);
              localStorage.setItem('studial_selected_campus', peekedCampus);
              window.dispatchEvent(new CustomEvent('studial:campus-changed', { detail: { campus: peekedCampus } }));
            }}
          />

          {/* Feed Posts */}
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-[#1A1A1F] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#2E2E38] animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-[#24242B] rounded-full"></div>
                    <div>
                      <div className="h-4 bg-slate-200 dark:bg-[#24242B] rounded w-32 mb-2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-[#24242B] rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-[#24242B] rounded w-full mb-3"></div>
                  <div className="h-4 bg-slate-200 dark:bg-[#24242B] rounded w-5/6 mb-4"></div>
                  <div className="h-36 bg-slate-100 dark:bg-[#141418] rounded-xl w-full mb-4"></div>
                </div>
              ))}
            </div>
          ) : (!Array.isArray(posts) || posts.length === 0) ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-[#1A1A1F] border border-slate-200/80 dark:border-[#2E2E38]">
              <p className="font-extrabold text-slate-900 dark:text-white text-base">No campus posts yet.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start a discussion, launch a poll, or share notes!</p>
            </div>
          ) : (
            posts.map((post, index) => {
              if (!post) return null;
              return (
                <ErrorBoundary key={post?.id || index}>
                  <FeedPost 
                    post={post}
                    currentUser={currentUser}
                    onOpenQuiz={(content) => {
                      setActiveQuizContent(content);
                      setQuizOpen(true);
                    }}
                    onTipSuccess={() => setCurrentUser(prev => ({ ...prev, c_coins: Math.max(0, (prev?.c_coins || 0) - 10) }))}
                    onDeletePost={(id) => setPosts(prev => Array.isArray(prev) ? prev.filter(p => p?.id !== id) : prev)}
                    onBurnCoinsSuccess={(price) => setCurrentUser(prev => ({ ...prev, c_coins: Math.max(0, (prev?.c_coins || 0) - price) }))}
                  />
                </ErrorBoundary>
              );
            })
          )}
        </PullToRefresh>
      </div>

      {/* Quiz Modal */}
      <QuizModal 
        isOpen={quizOpen} 
        onClose={() => setQuizOpen(false)} 
        postContent={activeQuizContent} 
        currentUser={currentUser} 
      />
    </div>
  );
}
