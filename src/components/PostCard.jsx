import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageSquare, Bookmark, Share2, Radio, Send, Bot, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { askSamuel, getSamuelProfileId } from '../utils/gemini';
import { Avatar } from './Avatar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
export function PostCard({ postId, type, author, course, topic, timeAgo, content, stats, currentUser, authorId, onTipSuccess, onOpenQuiz, onDelete, ...props }) {
  const [isTipping, setIsTipping] = useState(false);
  const [tipStatus, setTipStatus] = useState(null);

  // Interactivity States
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(stats?.upvotes || 0);
  const [commentCount, setCommentCount] = useState(stats?.answers || 0);
  const [isSaved, setIsSaved] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);

  // Poll States
  const [pollVotes, setPollVotes] = useState({});
  const [userVote, setUserVote] = useState(null);
  const [isVoting, setIsVoting] = useState(false);

  // Initialize Like/Save state from DB on mount
  useEffect(() => {
    setLikeCount(stats?.upvotes || 0);
    setCommentCount(stats?.answers || 0);
  }, [stats?.upvotes, stats?.answers]);

  useEffect(() => {
    let isMounted = true;
    const fetchInteractions = async () => {
      if (!currentUser?.id || !postId) return;

      try {
        const queries = [
          supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle(),
          supabase.from('saved_posts').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle()
        ];
        
        if (type === 'poll') {
          queries.push(supabase.from('poll_votes').select('voted_option, user_id').eq('post_id', postId));
        }

        const [likeRes, saveRes, pollRes] = await Promise.all(queries);

        if (isMounted) {
          setIsLiked(!!likeRes.data);
          setIsSaved(!!saveRes.data);
          
          if (type === 'poll' && pollRes?.data) {
            const counts = {};
            let myVote = null;
            pollRes.data.forEach(vote => {
              counts[vote.voted_option] = (counts[vote.voted_option] || 0) + 1;
              if (vote.user_id === currentUser.id) myVote = vote.voted_option;
            });
            setPollVotes(counts);
            setUserVote(myVote);
          }
        }
      } catch (err) {
        console.error("Error fetching interactions", err);
      }
    };
    fetchInteractions();
    return () => { isMounted = false; };
  }, [postId, currentUser]);

  // Fetch comments when opened
  useEffect(() => {
    if (isCommentsOpen && postId) {
      const fetchComments = async () => {
        setIsLoadingComments(true);
        const { data, error } = await supabase
          .from('post_comments')
          .select('*, profiles!author_id(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error("Error fetching comments:", error);
          alert(`Failed to load comments: ${error.message}`);
        } else if (data) {
          setComments(data);
        }
        setIsLoadingComments(false);
      };
      fetchComments();
    }
  }, [isCommentsOpen, postId]);

  const handleVote = async (optionIndex) => {
    if (!currentUser) return alert('You must be logged in to vote.');
    if (userVote === optionIndex) return; // Cannot vote for the exact same option again
    
    setIsVoting(true);
    
    console.log('Post Object:', { id: postId, content, type, ...props });
    try {
      // 1. Check for existing vote
      const { data: existingVote } = await supabase
        .from('poll_votes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existingVote) {
        // 2. Update existing vote
        const { error } = await supabase
          .from('poll_votes')
          .update({ voted_option: optionIndex })
          .eq('id', existingVote.id);
        if (error) throw error;
      } else {
        // 3. Insert new vote
        const { error } = await supabase
          .from('poll_votes')
          .insert({
            post_id: postId,
            user_id: currentUser.id,
            voted_option: optionIndex
          });
        if (error) throw error;
      }
      
      // 4. Update local UI state
      setPollVotes(prev => {
        const newVotes = { ...prev };
        if (userVote !== null) {
          // Decrement old vote
          newVotes[userVote] = Math.max(0, (newVotes[userVote] || 1) - 1);
        }
        // Increment new vote
        newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
        return newVotes;
      });
      setUserVote(optionIndex);
    } catch (err) {
      console.error("Voting error", err);
      alert("Failed to record vote: " + err.message);
    } finally {
      setIsVoting(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const newStatus = !isLiked;
    
    try {
      if (newStatus) {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
        if (error) throw error;
      }
      
      const newCount = newStatus ? likeCount + 1 : likeCount - 1;
      const { error: updateError } = await supabase.from('posts').update({ likes: newCount }).eq('id', postId);
      if (updateError) throw updateError;
      
      setIsLiked(newStatus);
      setLikeCount(newCount);
    } catch (err) {
      console.error("Error toggling like:", err);
      alert(`Failed to toggle like: ${err.message}`);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const newStatus = !isSaved;
    
    try {
      if (newStatus) {
        const { error } = await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUser.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', currentUser.id);
        if (error) throw error;
      }
      setIsSaved(newStatus);
    } catch (err) {
      console.error("Error toggling save:", err);
      alert(`Failed to toggle save: ${err.message}`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({
        title: 'Studial Post',
        text: content || 'Check out this post on Studial!',
        url: window.location.href,
      }).catch((error) => console.log('Sharing failed', error));
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Post link copied to clipboard!');
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

    // Insert into DB without optimistic UI
    const { data: insertedComment, error } = await supabase.from('post_comments').insert([{
      post_id: postId,
      author_id: currentUser.id,
      content: text
    }]).select('*, profiles!author_id(*)').single();

    if (error) {
      console.error("Error posting comment:", error);
      alert(`Failed to post comment: ${error.message}`);
      setNewComment(text); // Restore text on failure
    } else if (insertedComment) {
      setComments(prev => [...prev, insertedComment]);
      setCommentCount(prev => prev + 1);
      // Increment aggregate comments count on posts table
      await supabase.from('posts').update({ comments: commentCount + 1 }).eq('id', postId);

      // Handle @Samuel AI Tagging in Comments
      if (text.toLowerCase().includes('@samuel')) {
        setIsAITyping(true);
        
        const fetchSamuelResponse = async () => {
          try {
            const samuelId = await getSamuelProfileId();
            
            const prompt = `A student asked this question: '${content}'. They replied with: '${text}'. Provide a clear, helpful academic answer as Samuel, an AI study assistant.`;
            const aiResponse = await askSamuel(prompt);
            
            if (aiResponse) {
              const aiComment = {
                post_id: postId,
                author_id: samuelId,
                content: `[AI_SAMUEL_RESPONSE] ${aiResponse}`
              };
              
              const { data: insertedAiComment, error: aiError } = await supabase.from('post_comments').insert([aiComment]).select('*, profiles!author_id(*)').single();
              
              if (aiError) {
                console.error("Database error saving Samuel's comment:", aiError);
                alert(`Failed to save AI comment: ${aiError.message}`);
              } else if (insertedAiComment) {
                setComments(prev => [...prev, insertedAiComment]);
                setCommentCount(prev => prev + 1);
                await supabase.from('posts').update({ comments: commentCount + 2 }).eq('id', postId); // +2 because user comment + AI comment
              }
            }
          } catch (err) {
            console.error("Samuel failed to respond:", err);
            alert(`Samuel failed to respond: ${err.message || 'Check console'}`);
          } finally {
            setIsAITyping(false);
          }
        };
        
        fetchSamuelResponse();
      }
    }
  };

  return (
    <div className="h-[85vh] w-full snap-center relative bg-surface-container-lowest overflow-hidden flex flex-col justify-end border-b border-outline-variant/30">
      
      {/* Background Media */}
      {props.attachmentImage ? (
        <div className="absolute inset-0 z-0">
          <img src={props.attachmentImage} alt="Attachment" className="w-full h-full object-cover" />
          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      ) : type === 'poll' && Array.isArray(props.options) ? (
        <div className="absolute inset-0 z-0 flex items-center justify-center p-8 pb-32 bg-surface-container-highest">
          <div className="w-full max-w-[320px] bg-surface rounded-3xl p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-4">
            <h2 className="text-on-surface text-xl font-bold leading-snug">
              {content}
            </h2>
            <div className="flex flex-col gap-2.5 mt-2">
              {props.options.map((option, idx) => {
                 const votesForOption = pollVotes[idx] || 0;
                 const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);
                 const percentage = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
                 const isSelected = userVote === idx;
                 const hasVoted = userVote !== null;

                 return (
                    <button
                      key={idx}
                      onClick={() => handleVote(idx)}
                      disabled={isVoting}
                      className={`relative w-full overflow-hidden rounded-2xl border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant/50'} text-left transition-all hover:bg-surface-container-low active:scale-[0.98] p-3.5 min-h-[56px] flex items-center justify-between z-10 bg-surface`}
                    >
                     {/* Progress bar background */}
                     {hasVoted && (
                       <div 
                         className={`absolute left-0 top-0 bottom-0 z-[-1] transition-all duration-700 ease-out ${isSelected ? 'bg-primary/15' : 'bg-outline-variant/20'}`} 
                         style={{ width: `${percentage}%` }}
                       />
                     )}
                     
                     <span className={`font-semibold text-[15px] z-10 ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                       {option}
                     </span>
                     
                     {hasVoted && (
                       <span className={`font-bold text-sm z-10 ${isSelected ? 'text-primary' : 'text-outline'}`}>
                         {percentage}%
                       </span>
                     )}
                   </button>
                 );
              })}
            </div>
            <p className="text-xs text-outline text-center mt-2 font-medium">
              {Object.values(pollVotes).reduce((a, b) => a + b, 0)} votes
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center p-8 pb-32 bg-gradient-to-br from-indigo-900 to-slate-800">
          <div className="text-white text-2xl md:text-3xl font-bold text-center drop-shadow-md pr-12 overflow-y-auto max-h-[60vh] scrollbar-hide leading-relaxed markdown-body">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {content || ''}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Right-Side Interaction Stack */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md transition-transform active:scale-90 ${isLiked ? 'text-primary' : 'text-white'}`}>
            <ThumbsUp className={`w-6 h-6 ${isLiked ? 'fill-current text-primary' : ''}`} />
          </div>
          <span className="text-white text-[12px] font-bold drop-shadow-md">{likeCount || 0}</span>
        </button>

        <button onClick={() => setIsCommentsOpen(true)} className="flex flex-col items-center gap-1 group">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[12px] font-bold drop-shadow-md">{commentCount || 0}</span>
        </button>

        <button onClick={handleSave} className="flex flex-col items-center gap-1 group">
          <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md transition-transform active:scale-90 ${isSaved ? 'text-primary' : 'text-white'}`}>
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
          </div>
          <span className="text-white text-[12px] font-bold drop-shadow-md">{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white transition-transform active:scale-90">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-white text-[12px] font-bold drop-shadow-md">Share</span>
        </button>

        <button onClick={async () => {
            setIsCommentsOpen(true);
            setIsAITyping(true);
            
            try {
              const samuelId = await getSamuelProfileId();
              const aiResponse = await askSamuel(`You are Samuel. Please provide a helpful explanation of the following post content: "${content}".`);
              if (aiResponse) {
                const aiComment = {
                  post_id: postId,
                  author_id: samuelId,
                  content: `[AI_SAMUEL_RESPONSE] ${aiResponse}`
                };
                
                const { data: insertedAiComment, error: aiError } = await supabase.from('post_comments').insert([aiComment]).select('*, profiles!author_id(*)').single();
                
                if (aiError) {
                  console.error("Error posting AI comment:", aiError);
                  alert(`Failed to post AI comment: ${aiError.message}`);
                } else if (insertedAiComment) {
                  setComments(prev => [...prev, insertedAiComment]);
                  setCommentCount(prev => prev + 1);
                  await supabase.from('posts').update({ comments: commentCount + 1 }).eq('id', postId);
                }
              }
            } catch (err) {
              console.error("AI Error:", err);
            } finally {
              setIsAITyping(false);
            }
          }} 
          className="flex flex-col items-center gap-1 group mt-2"
        >
          <div className="p-3 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 transition-transform active:scale-90 animate-pulse">
            <Bot className="w-6 h-6" />
          </div>
          <span className="text-white text-[12px] font-bold drop-shadow-md">Ask AI</span>
        </button>
      </div>

      {/* Content Overlay (Bottom Left) */}
      <div className="absolute bottom-20 left-4 right-20 z-20 flex flex-col gap-3 pb-safe">
        {type === 'bounty' && props.bountyAmount && (
          <div className="bg-warning/90 backdrop-blur-sm rounded-lg px-2.5 py-1 w-fit flex items-center gap-1.5 shadow-sm">
            <span className="text-[12px]">🪙</span>
            <span className="text-[12px] font-bold text-on-warning">{props.bountyAmount} C-Coins</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Avatar url={author?.avatar} name={author?.name} size="lg" className="border-2 border-white/20" />
          <div>
            <h3 className="text-[15px] font-bold text-white drop-shadow-md">{author?.name || 'Anonymous'}</h3>
            <p className="text-white/80 text-[12px] font-medium drop-shadow-sm">{course || 'General'} &bull; {timeAgo || 'Just now'}</p>
          </div>
        </div>

        {props.attachmentImage && (
          <p className="text-[14px] text-white font-medium leading-relaxed drop-shadow-md line-clamp-4">
            {content || ''}
          </p>
        )}
      </div>

      {/* Comments Drawer / Modal */}
      {isCommentsOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full h-[65%] rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low rounded-t-3xl">
              <h3 className="font-bold text-on-surface">{commentCount || 0} Answers</h3>
              <button onClick={() => setIsCommentsOpen(false)} className="text-outline hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
              {isLoadingComments ? (
                <div className="text-center py-4 text-outline text-sm">Loading answers...</div>
              ) : !comments || comments.length === 0 ? (
                <div className="text-center py-4 text-outline text-sm font-medium">No answers yet. Be the first to help!</div>
              ) : (
                comments.map((comment) => {
                  if (!comment || !comment.content) return null;
                  const isSamuel = comment.content.startsWith('[AI_SAMUEL_RESPONSE]');
                  const cleanContent = isSamuel ? comment.content.replace('[AI_SAMUEL_RESPONSE]', '').trim() : comment.content;
                  return (
                    <div key={comment?.id || Math.random()} className="flex gap-3">
                      {isSamuel ? (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-indigo-600">
                          <Bot className="w-4 h-4" />
                        </div>
                      ) : (
                        <Avatar url={comment?.profiles?.avatar_url} name={comment?.profiles?.username || comment?.profiles?.full_name} size="sm" />
                      )}
                      <div className={`border rounded-2xl rounded-tl-sm px-4 py-2 flex-grow ${isSamuel ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border-indigo-200 shadow-md' : 'bg-surface-container-lowest border-outline-variant/30'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[13px] font-bold ${isSamuel ? 'text-indigo-700' : 'text-on-surface'}`}>
                            {isSamuel ? 'Samuel' : (comment?.profiles?.full_name || comment?.profiles?.username || 'Anonymous')}
                          </span>
                          {isSamuel && (
                            <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1 border border-indigo-200 dark:border-indigo-700 uppercase tracking-wider">
                              ✨ AI Assistant
                            </span>
                          )}
                          <span className="text-[11px] text-outline ml-1">
                            {comment?.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className={`text-sm markdown-body ${isSamuel ? 'text-indigo-900 leading-relaxed font-medium' : 'text-on-surface-variant'}`}>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {cleanContent || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isAITyping && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-indigo-400">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md flex items-center">
                    <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium flex items-center gap-1">
                      Samuel is typing
                      <span className="flex space-x-1 ml-1">
                        <span className="animate-bounce delay-75">.</span>
                        <span className="animate-bounce delay-150">.</span>
                        <span className="animate-bounce delay-300">.</span>
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant/30 bg-surface">
              <form onSubmit={handleSubmitComment} className="flex gap-3">
                <div className="flex-grow flex items-center bg-surface-container-low border border-outline-variant/40 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write an answer, or tag @Samuel for help..."
                    className="w-full bg-transparent border-none outline-none text-sm text-on-surface placeholder-outline"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim()}
                    className="ml-2 text-primary hover:text-primary-container disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveRoomCard() {
  return (
    <div className="h-[85vh] w-full snap-center relative bg-gradient-to-b from-indigo-900 to-black overflow-hidden flex flex-col justify-center items-center px-6 border-b border-white/10">
      <div className="absolute top-0 inset-x-0 h-1/2 bg-primary/20 blur-3xl rounded-full translate-y-[-50%]"></div>
      
      <div className="bg-black/40 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl relative z-10">
        <div className="flex justify-center mb-4">
          <div className="bg-error/20 text-error px-3 py-1 rounded-full flex items-center gap-2 border border-error/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Now</span>
          </div>
        </div>
        
        <h3 className="text-2xl font-extrabold text-white mb-2">Quiet Pomodoro Sprint</h3>
        <p className="text-white/70 text-sm mb-6">Lofi soundscape, silent accountability (50/10).</p>
        
        <div className="flex justify-center -space-x-3 mb-6">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-blue-500 flex items-center justify-center text-[12px] text-white font-bold">J</div>
          <div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-emerald-500 flex items-center justify-center text-[12px] text-white font-bold">S</div>
          <div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-amber-500 flex items-center justify-center text-[12px] text-white font-bold">M</div>
          <div className="w-10 h-10 rounded-full border-2 border-indigo-900 bg-white/20 backdrop-blur flex items-center justify-center text-[11px] font-bold text-white">
            +21
          </div>
        </div>
        
        <button className="w-full bg-primary text-white font-bold text-base py-3.5 rounded-full shadow-lg hover:bg-primary-container transition-all active:scale-95 flex items-center justify-center gap-2">
          <Radio className="w-5 h-5" />
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
