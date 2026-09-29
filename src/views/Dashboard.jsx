import React, { useState, useEffect, Component } from "react";
import { Bell, Loader2, AlertCircle, Pause, ChevronRight, Coins, Play, Flame, Lock } from "lucide-react";

import { PostCard, LiveRoomCard } from "../components/PostCard";
import QuizModal from "../components/QuizModal";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";
import useSWR from "swr";
import PullToRefresh from "../components/PullToRefresh";

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  let parsedDate = dateString;
  // If it doesn't have a timezone indicator, treat it as UTC
  if (!parsedDate.includes('Z') && !parsedDate.includes('+')) {
    parsedDate += 'Z';
  }
  const date = new Date(parsedDate);
  const now = new Date();
  
  let diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 0) diffInSeconds = 0; // fallback for clock skew
  
  if (diffInSeconds < 60) return `Just now`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-xl m-4 border border-error/20">
          <AlertCircle className="w-8 h-8 text-error mb-2" />
          <h2 className="text-on-surface font-bold">Something went wrong</h2>
          <p className="text-on-surface-variant text-sm mt-1">This post could not be loaded.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const { currentUser, setCurrentUser } = useOutletContext();
  
  const [posts, setPosts] = useState([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeQuizContent, setActiveQuizContent] = useState("");
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
            // Fetch the profile for the new post
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url, department, is_shadow_banned')
              .eq('id', payload.new.user_id)
              .single();

            if (error) throw error;

            if (profile) {
              // Shadow Ban Logic: Don't show new post if author is shadow-banned, unless it's the current user
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
      {/* Main Feed */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-28">
        <PullToRefresh onRefresh={async () => await mutate()}>

          {/* Syncing Toast */}
          <div className="flex justify-center mb-6">
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-full px-4 py-1.5 flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-outline animate-spin" />
              <span className="text-[10px] font-bold text-outline">Syncing campus feed... (TanStack Query Cache)</span>
            </div>
          </div>

          {/* Focus Chamber Delta */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 mb-8 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-green animate-pulse" />
                <h3 className="font-bold text-on-surface text-sm">Focus Chamber Delta</h3>
              </div>
              <div className="flex items-center gap-1 text-tertiary-orange bg-tertiary-orange/10 px-2 py-0.5 rounded-full">
                <span className="text-xs font-bold">⚡ +5 C/hr</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <div className="text-5xl font-extralight text-on-surface font-mono tracking-tighter mb-1">43:10</div>
                <p className="text-[9px] font-bold text-outline uppercase tracking-widest">DEEP WORK PHASE • RAFT & TRANSFORMERS</p>
              </div>
              <button className="w-12 h-12 bg-primary hover:bg-primary-container text-white rounded-2xl flex items-center justify-center transition-all shadow-ambient-focus">
                <Pause className="w-5 h-5 fill-current" />
              </button>
            </div>

            <div className="mt-6 flex justify-between items-end">
              <div>
                <p className="text-[10px] text-outline mb-2">Live Scholars (4 In Session)</p>
                <div className="flex -space-x-2">
                  <div className="flex items-center gap-2 bg-surface pr-3 rounded-full border border-outline-variant/30">
                    <img src="https://api.dicebear.com/9.x/glass/svg?seed=Alex" className="w-8 h-8 rounded-full bg-surface-container" alt="user" />
                    <div className="text-[10px]">
                      <p className="font-bold text-on-surface leading-tight">Alex R. (Host)</p>
                      <p className="text-secondary-green font-semibold leading-tight">Coding Raft RPC</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-surface pr-3 rounded-full border border-outline-variant/30 ml-2 opacity-90">
                    <img src="https://api.dicebear.com/9.x/glass/svg?seed=Sarah" className="w-8 h-8 rounded-full bg-surface-container" alt="user" />
                    <div className="text-[10px]">
                      <p className="font-bold text-on-surface leading-tight">Sarah Lin</p>
                      <p className="text-tertiary-orange font-semibold leading-tight">Orgo Retrosynthesis</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-secondary-green">98% Shared Flow</span>
              </div>
            </div>
          </div>

          {/* Continue Studying */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-on-surface">Continue Studying</h2>
              <button className="text-[11px] font-bold text-outline flex items-center gap-1 hover:text-on-surface transition-colors">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              <div className="min-w-[280px] bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 shrink-0 snap-start">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold bg-surface-container-high text-outline px-2 py-0.5 rounded-full">MIT 6.S191</span>
                  <span className="text-[10px] font-bold text-tertiary-orange flex items-center gap-1"><Coins className="w-3 h-3" /> +45 C</span>
                </div>
                <h3 className="font-bold text-on-surface mb-1">Transformer Attention...</h3>
                <p className="text-[11px] text-outline mb-4">Self-attention matrices, query-key dot product scaling</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-outline">Progress</span>
                    <span className="text-on-surface">84%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[84%]" />
                  </div>
                </div>
                
                <button className="w-full py-2.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                  <Play className="w-3 h-3" /> Resume Module
                </button>
              </div>
              
              <div className="min-w-[280px] bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 shrink-0 snap-start opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold bg-surface-container-high text-outline px-2 py-0.5 rounded-full">Harvard CS50</span>
                  <span className="text-[10px] font-bold text-tertiary-orange flex items-center gap-1"><Coins className="w-3 h-3" /> +15 C</span>
                </div>
                <h3 className="font-bold text-on-surface mb-1">Organic Chemistry...</h3>
                <p className="text-[11px] text-outline mb-4">Electrophilic aromatic substitution, stereochemical implications</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-outline">Progress</span>
                    <span className="text-on-surface">32%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[32%]" />
                  </div>
                </div>
                
                <button className="w-full py-2.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                  <Play className="w-3 h-3" /> Resume Module
                </button>
              </div>
            </div>
          </div>

          {/* Active Bounty */}
          <div className="bg-[#201d14] border border-tertiary-orange/30 rounded-3xl p-5 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary-orange/10 blur-3xl rounded-full" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-tertiary-orange/20 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-tertiary-orange" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold text-tertiary-orange uppercase tracking-widest">Active Bounty</span>
                  <span className="text-[9px] font-bold bg-tertiary-orange text-black px-1.5 rounded-sm">2.5x Stake</span>
                </div>
                <h3 className="font-bold text-on-surface text-lg leading-tight mb-2">Derive Backpropagation by 11:00 PM</h3>
                <p className="text-xs text-outline mb-4">Stake 50 C-Coins to verify theorem steps with Samuel AI. Complete cleanly in 35 mins to harvest 125 C-Coins.</p>
                
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-outline">Pool: 850 C • 14 Challengers</p>
                  <button className="px-4 py-2 bg-tertiary-orange text-black hover:bg-[#d97706] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-colors">
                    <Lock className="w-3 h-3" /> Stake 50 C
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Campus Activity Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-on-surface">Campus Activity</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary-green animate-pulse" />
              <span className="text-[10px] font-bold text-secondary-green">Realtime Socket</span>
            </div>
          </div>

        {/* Feed Posts */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6 mb-4"></div>
                <div className="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl w-full mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-full w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-full w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (!Array.isArray(posts) || posts.length === 0) ? (
          <div className="text-center py-10 text-gray-500 dark:text-slate-400">
            <p className="font-semibold text-gray-900 dark:text-slate-200">No posts yet.</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          posts?.map((post, index) => {
            if (!post) return null;
            return (
              <ErrorBoundary key={post?.id || index}>
                <React.Fragment>
                  
                  <PostCard 
                    postId={post?.id}
                    type={post?.type || "normal"}
                    options={post?.options}
                    bountyAmount={post?.bounty_amount}
                    bountyDesc="best answer"
                    author={{ 
                      name: post?.is_anonymous ? 'Anonymous Student' : (post?.profiles?.full_name || post?.profiles?.username || 'Anonymous'), 
                      school: post?.is_anonymous ? 'Incognito' : (post?.profiles?.department || 'University'), 
                      avatar: post?.is_anonymous ? 'https://api.dicebear.com/9.x/glass/svg?seed=Anonymous' : (post?.profiles?.avatar_url || '') 
                    }}
                    course="General"
                    topic="Discussion"
                    timeAgo={formatTimeAgo(post?.created_at)}
                    content={post?.content || ''}
                    attachmentImage={post?.media_url}
                    stats={{ 
                      upvotes: post?.post_likes?.[0]?.count || post?.likes || 0, 
                      answers: post?.post_comments?.[0]?.count || post?.comments || 0 
                    }}
                    currentUser={currentUser}
                    authorId={post?.user_id}
                    onTipSuccess={() => setCurrentUser(prev => ({...prev, c_coins: prev.c_coins - 10}))}
                    onDelete={(id) => setPosts(prev => Array.isArray(prev) ? prev.filter(p => p?.id !== id) : prev)}
                    onOpenQuiz={() => {
                      setActiveQuizContent(post?.content || '');
                      setQuizOpen(true);
                    }}
                  />
                </React.Fragment>
              </ErrorBoundary>
            );
          })
        )}
        </PullToRefresh>
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
