import React, { useState, useEffect, Component } from "react";
import { Bell, Loader2, AlertCircle } from "lucide-react";

import { PostCard, LiveRoomCard } from "../components/PostCard";
import QuizModal from "../components/QuizModal";
import { supabase } from "../supabaseClient";
import { useOutletContext } from "react-router-dom";

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
  const [isLoading, setIsLoading] = useState(true);

  const [quizOpen, setQuizOpen] = useState(false);
  const [activeQuizContent, setActiveQuizContent] = useState("");

  useEffect(() => {
    let isMounted = true;
    
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles!user_id(id, username, full_name, avatar_url, department, is_shadow_banned), post_likes(count), post_comments(count)')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching posts:", error);
        } else if (isMounted) {
          // Shadow Ban Logic: Filter out shadow-banned users' posts, unless it belongs to the current user
          const filteredPosts = (data || []).filter(post => 
            !post?.profiles?.is_shadow_banned || post?.user_id === currentUser?.id
          );
          
          setPosts(filteredPosts);
        }
      } catch (err) {
        console.error("Unexpected error fetching posts:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPosts();

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
  }, []);

  return (
    <div className="flex flex-col h-full w-full relative overflow-y-auto bg-slate-950">
      {/* Main Feed */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-28">



        {/* Feed Posts */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface-container-lowest p-5 rounded-2xl shadow-surface-1 border border-outline-variant/30 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                <div className="h-40 bg-gray-100 rounded-xl w-full mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (!Array.isArray(posts) || posts.length === 0) ? (
          <div className="text-center py-10 text-outline">
            <p className="font-semibold">No posts yet.</p>
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
