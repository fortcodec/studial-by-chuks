import React, { useState, useEffect } from 'react';
import { MoreHorizontal, ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Share2, Download, Radio, Users, Trash2, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function PostCard({ postId, type, author, course, topic, timeAgo, content, stats, currentUser, authorId, onTipSuccess, onOpenQuiz, onDelete, ...props }) {
  const [isTipping, setIsTipping] = useState(false);
  const [tipStatus, setTipStatus] = useState(null);

  // Interactivity States
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(stats?.upvotes || 0);
  const [isSaved, setIsSaved] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Initialize Like/Save state from local storage on mount
  useEffect(() => {
    if (postId) {
      setIsLiked(localStorage.getItem(`studial_like_${postId}`) === 'true');
      setIsSaved(localStorage.getItem(`studial_save_${postId}`) === 'true');
    }
  }, [postId]);

  // Fetch comments when opened
  useEffect(() => {
    if (isCommentsOpen && postId) {
      const fetchComments = async () => {
        setIsLoadingComments(true);
        const { data, error } = await supabase
          .from('post_comments')
          .select('*, profiles:user_id(username, full_name, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        if (data && !error) {
          setComments(data);
        }
        setIsLoadingComments(false);
      };
      fetchComments();
    }
  }, [isCommentsOpen, postId]);

  const handleLike = async () => {
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
    
    if (postId) {
      localStorage.setItem(`studial_like_${postId}`, newStatus);
      // Optimistic update to Supabase posts table
      await supabase
        .from('posts')
        .update({ likes: newStatus ? likeCount + 1 : likeCount - 1 })
        .eq('id', postId);
    }
  };

  const handleSave = () => {
    const newStatus = !isSaved;
    setIsSaved(newStatus);
    if (postId) {
      localStorage.setItem(`studial_save_${postId}`, newStatus);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Post by ${author?.name || 'Student'}`,
      text: content,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share cancelled:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (!error && onDelete) {
        onDelete(postId);
      } else if (error) {
        alert("Failed to delete post: " + error.message);
      }
    }
    setIsMenuOpen(false);
  };

  const handleTip = async () => {
    if (!currentUser || !authorId) {
      alert("Unable to process tip at this moment.");
      return;
    }
    if (currentUser.id === authorId) {
      alert("You cannot tip yourself!");
      return;
    }
    
    setIsTipping(true);
    
    try {
      const { error } = await supabase.rpc('tip_creator', {
        p_sender_id: currentUser.id,
        p_receiver_id: authorId,
        p_amount: 10
      });
      
      if (error) throw error;
      
      // Log Transaction
      await supabase.from('c_coin_transactions').insert({
        user_id: currentUser.id,
        amount: '-10 C',
        description: 'C-Coin Tip Sent'
      });
      
      setTipStatus('success');
      if (onTipSuccess) onTipSuccess();
      setTimeout(() => setTipStatus(null), 3000);
      
    } catch (err) {
      alert(err.message || "Failed to tip. Insufficient C Coins?");
    } finally {
      setIsTipping(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    
    const text = newComment.trim();
    setNewComment('');

    // Optimistically add to UI
    const tempComment = {
      id: Date.now(),
      content: text,
      created_at: new Date().toISOString(),
      profiles: {
        username: currentUser.username,
        full_name: currentUser.name,
        avatar_url: currentUser.avatar
      }
    };
    setComments(prev => [...prev, tempComment]);

    // Insert into DB
    const { error } = await supabase.from('post_comments').insert([{
      post_id: postId,
      user_id: currentUser.id,
      content: text
    }]);

    if (error) {
      console.error("Failed to add comment:", error);
      // Revert optimistic update
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setNewComment(text);
      alert("Failed to post comment. Ensure the post_comments table exists.");
    } else {
      // Increment aggregate comments count on posts table
      await supabase.from('posts').update({ comments: (stats?.answers || 0) + 1 }).eq('id', postId);
    }
  };

  return (
    <div className="bg-white rounded-[24px] shadow-surface-1 p-5 mb-5 border border-outline-variant/30 transition-all hover:shadow-surface-2 relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {author?.avatar && author.avatar.startsWith('http') ? (
            <img src={author.avatar} alt={author.name} className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {(author?.name || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-bold text-on-surface leading-tight">{author?.name}</h3>
              <span className="text-outline text-xs">&bull; {author?.school}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="bg-primary-container/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                {course} &bull; {topic}
              </span>
              <span className="text-outline text-xs font-medium">{timeAgo}</span>
            </div>
          </div>
        </div>
        
        {/* Three Dots Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-surface-2 border border-outline-variant/30 py-1.5 z-20 animate-slide-up">
              <button 
                onClick={handleShare}
                className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Post
              </button>
              {currentUser?.id === authorId && (
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2 font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bounty Banner */}
      {type === 'bounty' && props.bountyAmount && (
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 mb-3 flex items-center gap-2 w-fit">
          <span className="bg-warning/20 text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-warning/50 shadow-sm shadow-warning/20">🪙</span>
          <span className="text-[13px] font-bold text-on-surface">{props.bountyAmount} C-Coins Bounty</span>
          <span className="text-[13px] text-outline">for {props.bountyDesc}</span>
        </div>
      )}

      {/* Content */}
      <p className="text-[15px] text-on-surface-variant leading-relaxed mb-4 whitespace-pre-wrap">
        {content}
      </p>

      {/* Attachments */}
      {props.attachmentImage && (
        <div className="rounded-2xl border border-outline-variant/30 overflow-hidden mb-4 bg-surface-container-lowest">
          <img src={props.attachmentImage} alt="Attachment" className="w-full h-auto object-cover max-h-96" />
        </div>
      )}

      {type === 'document' && props.docTitle && (
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-3 flex gap-4 items-center mb-4">
          <div className="w-14 h-16 bg-error/10 border border-error/20 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
            <FilePdfIcon className="w-6 h-6 text-error mb-1" />
            <span className="text-[9px] font-bold text-error uppercase">{props.docPages} Pages</span>
          </div>
          <div className="flex-grow">
            <h4 className="text-[15px] font-bold text-on-surface leading-tight mb-1">{props.docTitle}</h4>
            <div className="flex items-center gap-2 text-xs text-outline mb-2">
              <span className="flex items-center text-warning font-bold">
                ⭐ {props.docRating} <span className="text-outline font-normal ml-0.5">({props.docReviews})</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {props.docSaves} saves</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
                Preview Deck
              </button>
              <button className="text-outline text-[11px] font-medium hover:text-on-surface">
                Report typo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
        <div className="flex items-center gap-4">
          {/* Upvote Toggle */}
          <div className="flex items-center bg-primary/5 rounded-full border border-primary/10 overflow-hidden">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${isLiked ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10 text-outline hover:text-primary'}`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current text-primary' : ''}`} />
              <span className={`text-[13px] font-bold ${isLiked ? 'text-primary' : ''}`}>{likeCount}</span>
            </button>
          </div>
          
          <button 
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            className={`flex items-center gap-1.5 transition-colors px-2 py-1 rounded-full hover:bg-surface-container-low ${isCommentsOpen ? 'text-primary bg-primary/10' : 'text-outline hover:text-on-surface'}`}
          >
            <MessageSquare className={`w-4 h-4 ${isCommentsOpen ? 'fill-current text-primary/20' : ''}`} />
            <span className="text-[13px] font-semibold">{stats?.answers || comments.length} {stats?.answers === 1 ? 'Answer' : 'Answers'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleTip}
            disabled={isTipping || tipStatus === 'success'}
            className={`flex items-center gap-1 border text-[12px] font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
              tipStatus === 'success' 
                ? 'bg-secondary-green/20 border-secondary-green/30 text-secondary-green' 
                : 'bg-warning/10 border-warning/20 text-on-surface hover:bg-warning/20'
            }`}
          >
            {tipStatus === 'success' ? 'Tipped! 🎉' : '🪙 Tip 10'}
          </button>

          <button 
            onClick={onOpenQuiz}
            className="hidden sm:flex items-center gap-1 border border-indigo-200 bg-indigo-50 text-indigo-700 text-[12px] font-bold px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-all active:scale-95"
          >
            🧠 Quiz
          </button>

          <button 
            onClick={handleSave}
            className={`p-2 rounded-full transition-colors ${isSaved ? 'text-primary bg-primary/10' : 'text-outline hover:bg-surface-container-low hover:text-on-surface'}`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          
          <button onClick={handleShare} className="p-2 rounded-full text-outline hover:bg-surface-container-low hover:text-on-surface transition-colors hidden sm:block">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Comments Section */}
      {isCommentsOpen && (
        <div className="mt-4 pt-4 border-t border-outline-variant/20 animate-slide-up">
          {/* New Comment Input */}
          <form onSubmit={handleSubmitComment} className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {(currentUser?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-full px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write an answer..."
                className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder-outline"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="ml-2 text-primary hover:text-primary-container disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Comment Feed */}
          {isLoadingComments ? (
            <div className="text-center py-4 text-outline text-sm">Loading answers...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-outline text-sm font-medium bg-surface-container-low rounded-xl">No answers yet. Be the first to help!</div>
          ) : (
            <div className="space-y-4 max-h-60 overflow-y-auto scrollbar-hide pr-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(comment.profiles?.username || comment.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl rounded-tl-sm px-4 py-2 flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-bold text-on-surface">
                        {comment.profiles?.full_name || comment.profiles?.username || 'Anonymous'}
                      </span>
                      <span className="text-[11px] text-outline">
                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export function LiveRoomCard() {
  return (
    <div className="bg-surface-container-low rounded-[24px] shadow-surface-1 p-5 mb-5 border border-primary/20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="flex justify-between items-center mb-3 relative z-10">
        <div className="flex items-center gap-2 text-error text-[11px] font-bold tracking-wider uppercase">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
          </span>
          Live Room Happening Now
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container-highest px-2.5 py-1 rounded-full border border-outline-variant/40">
          <Users className="w-3.5 h-3.5 text-on-surface" />
          <span className="text-[11px] font-bold text-on-surface">24 Active</span>
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="text-xl font-extrabold text-on-surface tracking-tight mb-1">Quiet Pomodoro Sprint (50/10)</h3>
        <p className="text-[14px] text-on-surface-variant leading-relaxed mb-4">
          Lofi soundscape, camera-on silent accountability, study stats tracking.
        </p>
      </div>

      <div className="flex justify-between items-center relative z-10 mt-2">
        <div className="flex -space-x-3">
          <div className="w-9 h-9 rounded-full border-2 border-surface-container-low bg-blue-500 flex items-center justify-center text-[12px] text-white font-bold">J</div>
          <div className="w-9 h-9 rounded-full border-2 border-surface-container-low bg-emerald-500 flex items-center justify-center text-[12px] text-white font-bold">S</div>
          <div className="w-9 h-9 rounded-full border-2 border-surface-container-low bg-amber-500 flex items-center justify-center text-[12px] text-white font-bold">M</div>
          <div className="w-9 h-9 rounded-full border-2 border-surface-container-low bg-surface-variant flex items-center justify-center text-[10px] font-bold text-primary">
            +21
          </div>
        </div>
        
        <button className="bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-md hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Join Sprint
        </button>
      </div>
    </div>
  );
}

function FilePdfIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 12v6" />
      <path d="M8 14h4" />
      <path d="M16 12v6" />
      <path d="M16 15h3" />
    </svg>
  );
}
