import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageSquare, Bookmark, Share2, Send, Bot, X, Loader2, MoreVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { askSamuel, getSamuelProfileId } from '../utils/gemini';
import { Avatar } from './Avatar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ─── Error Boundary lives at module scope ─────────────────────────────────────
class CommentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('Comment error:', error, info); }
  render() {
    if (this.state.hasError) {
      return <div className="p-3 text-red-400 text-sm text-center rounded-lg bg-red-500/10 mt-2">Failed to load comments.</div>;
    }
    return this.props.children;
  }
}

const MAX_PREVIEW_LENGTH = 280;

export const PostCard = React.memo(function PostCard({
  postId, type, author, course, timeAgo, content, stats,
  currentUser, authorId, onTipSuccess, onOpenQuiz, onDelete, ...props
}) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(stats?.upvotes || 0);
  const [commentCount, setCommentCount] = useState(stats?.answers || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [isAITyping, setIsAITyping] = useState(false);

  // Poll state
  const [pollVotes, setPollVotes] = useState({});
  const [userVote, setUserVote] = useState(null);
  const [isVoting, setIsVoting] = useState(false);

  const isLongContent = content && content.length > MAX_PREVIEW_LENGTH;
  const displayContent = isLongContent && !isExpanded
    ? content.slice(0, MAX_PREVIEW_LENGTH) + '…'
    : (content || '');

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
          supabase.from('saved_posts').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle(),
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
            pollRes.data.forEach(v => {
              counts[v.voted_option] = (counts[v.voted_option] || 0) + 1;
              if (v.user_id === currentUser.id) myVote = v.voted_option;
            });
            setPollVotes(counts);
            setUserVote(myVote);
          }
        }
      } catch (err) {
        console.error('Error fetching interactions', err);
      }
    };
    fetchInteractions();
    return () => { isMounted = false; };
  }, [postId, currentUser]);

  useEffect(() => {
    if (!isCommentsOpen || !postId) return;
    const fetchComments = async () => {
      setIsLoadingComments(true);
      setCommentsError(null);
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, author_id, profiles!author_id(id, username, full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) {
        setCommentsError(error.message);
      } else {
        setComments((data || []).filter(c => !c?.profiles?.is_shadow_banned || c?.author_id === currentUser?.id));
      }
      setIsLoadingComments(false);
    };
    fetchComments();
  }, [isCommentsOpen, postId]);

  const handleVote = async (optionIndex) => {
    if (!currentUser || userVote === optionIndex) return;
    setIsVoting(true);
    try {
      await supabase.from('poll_votes').upsert(
        { post_id: postId, user_id: currentUser.id, voted_option: optionIndex },
        { onConflict: 'post_id, user_id' }
      );
      setPollVotes(prev => {
        const n = { ...prev };
        if (userVote !== null) n[userVote] = Math.max(0, (n[userVote] || 1) - 1);
        n[optionIndex] = (n[optionIndex] || 0) + 1;
        return n;
      });
      setUserVote(optionIndex);
    } catch (err) { console.error('Vote error', err); }
    finally { setIsVoting(false); }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const next = !isLiked;
    setIsLiked(next);
    setLikeCount(c => next ? c + 1 : c - 1);
    try {
      if (next) {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
      } else {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      }
      await supabase.from('posts').update({ likes: likeCount + (next ? 1 : -1) }).eq('id', postId);
    } catch (err) {
      // roll back
      setIsLiked(!next);
      setLikeCount(c => next ? c - 1 : c + 1);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) {
        await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUser.id });
      } else {
        await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      }
    } catch (err) { setIsSaved(!next); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({ title: 'Studial Post', text: content || '', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error && onDelete) onDelete(postId);
    setIsMenuOpen(false);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    const text = newComment.trim();
    setNewComment('');
    const { data: inserted, error } = await supabase
      .from('post_comments')
      .insert([{ post_id: postId, author_id: currentUser.id, content: text }])
      .select('id, content, created_at, author_id, profiles!author_id(id, username, full_name, avatar_url)')
      .single();
    if (error) { setNewComment(text); return; }
    if (inserted) {
      setComments(prev => [...prev, inserted]);
      setCommentCount(c => c + 1);
    }
    if (text.toLowerCase().includes('@samuel')) {
      setIsAITyping(true);
      try {
        const samuelId = await getSamuelProfileId();
        const aiText = await askSamuel(`A student asked: "${content}". They replied: "${text}". Give a concise academic answer.`);
        if (aiText) {
          const { data: aiInserted } = await supabase
            .from('post_comments')
            .insert([{ post_id: postId, author_id: samuelId, content: `[AI_SAMUEL_RESPONSE] ${aiText}` }])
            .select('id, content, created_at, author_id, profiles!author_id(id, username, full_name, avatar_url)')
            .single();
          if (aiInserted) setComments(prev => [...prev, aiInserted]);
        }
      } catch (err) { console.error('Samuel failed:', err); }
      finally { setIsAITyping(false); }
    }
  };

  const handleAskAI = async () => {
    setIsCommentsOpen(true);
    setIsAITyping(true);
    try {
      const samuelId = await getSamuelProfileId();
      const aiText = await askSamuel(`Explain this post helpfully: "${content}"`);
      if (aiText) {
        const { data: aiInserted } = await supabase
          .from('post_comments')
          .insert([{ post_id: postId, author_id: samuelId, content: `[AI_SAMUEL_RESPONSE] ${aiText}` }])
          .select('id, content, created_at, author_id, profiles!author_id(id, username, full_name, avatar_url)')
          .single();
        if (aiInserted) setComments(prev => [...prev, aiInserted]);
      }
    } catch (err) { console.error('AI Error:', err); }
    finally { setIsAITyping(false); }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 relative shadow-lg hover:border-slate-700 transition-colors">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3">
        <div 
          onClick={() => {
            if (authorId && author?.name !== 'Anonymous Student' && author?.name !== 'Anonymous') {
              navigate(`/profile/${authorId}`);
            }
          }}
          className={`flex items-center gap-3 ${authorId && author?.name !== 'Anonymous Student' ? 'cursor-pointer hover:opacity-90 group' : ''}`}
        >
          <Avatar url={author?.avatar} name={author?.name} size="md" className="border border-slate-700 shrink-0 group-hover:border-indigo-500 transition-colors" />
          <div>
            <h3 className="font-bold text-slate-100 text-[15px] leading-tight group-hover:text-indigo-400 transition-colors">{author?.name || 'Anonymous'}</h3>
            <p className="text-slate-500 text-[12px] font-medium">{course || 'General'} · {timeAgo || 'Just now'}</p>
          </div>
        </div>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(o => !o)}
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
              {currentUser?.id === authorId && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      {type === 'poll' && Array.isArray(props.options) ? (
        <div className="mb-3">
          <p className="text-slate-100 font-semibold text-[15px] leading-snug mb-3">{content}</p>
          <div className="flex flex-col gap-2">
            {props.options.map((option, idx) => {
              const votesForOption = pollVotes[idx] || 0;
              const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);
              const percentage = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
              const isSelected = userVote === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleVote(idx)}
                  disabled={isVoting}
                  className={`relative w-full overflow-hidden rounded-xl border text-left p-3 flex items-center justify-between transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  {userVote !== null && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-700 ${isSelected ? 'bg-indigo-500' : 'bg-slate-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <span className={`font-semibold text-[14px] z-10 ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>{option}</span>
                  {userVote !== null && (
                    <span className={`font-bold text-sm z-10 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`}>{percentage}%</span>
                  )}
                </button>
              );
            })}
          </div>
          {userVote !== null && (
            <p className="text-xs text-slate-500 text-center mt-2">{Object.values(pollVotes).reduce((a, b) => a + b, 0)} votes</p>
          )}
        </div>
      ) : (
        <div className="mb-3">
          {props.attachmentImage && (
            <div className="mb-3 rounded-xl overflow-hidden border border-slate-800">
              <img src={props.attachmentImage} alt="Attachment" className="w-full object-cover max-h-80" />
            </div>
          )}
          {content && (
            <div>
              <div className="text-slate-200 text-[15px] leading-relaxed text-left markdown-body">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {displayContent}
                </ReactMarkdown>
              </div>
              {isLongContent && (
                <button
                  onClick={() => setIsExpanded(e => !e)}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[13px] font-semibold mt-1 transition-colors"
                >
                  {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>}
                </button>
              )}
            </div>
          )}
          {type === 'bounty' && props.bountyAmount && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-bold px-2.5 py-1 rounded-full">
              🪙 {props.bountyAmount} C-Coin bounty
            </div>
          )}
        </div>
      )}

      {/* ── Action Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-1">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${
              isLiked
                ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-pink-400' : ''}`} />
            <span>{likeCount || 0}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setIsCommentsOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${
              isCommentsOpen
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount || 0}</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${
              isSaved
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Ask AI */}
        <button
          onClick={handleAskAI}
          disabled={isAITyping}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded-full text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-60"
        >
          <Bot className={`w-4 h-4 ${isAITyping ? 'animate-pulse' : ''}`} />
          {isAITyping ? 'Asking…' : 'Ask AI'}
        </button>
      </div>

      {/* ── Comments Drawer (inline, below card) ───────────────────── */}
      {isCommentsOpen && (
        <CommentErrorBoundary>
          <div className="mt-3 border-t border-slate-800 pt-3">
            {/* Comments list */}
            <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-hide mb-3">
              {isLoadingComments ? (
                <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : commentsError ? (
                <p className="text-red-400 text-sm text-center py-2">{commentsError}</p>
              ) : (() => {
                const safe = Array.isArray(comments) ? comments : [];
                if (safe.length === 0) return (
                  <p className="text-slate-500 text-sm text-center py-3">No answers yet. Be the first!</p>
                );
                return safe.map(comment => {
                  if (!comment?.content) return null;
                  const isSamuel = comment.content.startsWith('[AI_SAMUEL_RESPONSE]');
                  const clean = isSamuel ? comment.content.replace('[AI_SAMUEL_RESPONSE]', '').trim() : comment.content;
                  return (
                    <div key={comment.id} className="flex gap-2.5">
                      {isSamuel ? (
                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <Avatar url={comment.profiles?.avatar_url} name={comment.profiles?.full_name || comment.profiles?.username} size="sm" />
                      )}
                      <div className={`rounded-2xl rounded-tl-sm px-3 py-2 flex-1 ${
                        isSamuel
                          ? 'bg-indigo-950/60 border border-indigo-800/60'
                          : 'bg-slate-800 border border-slate-700'
                      }`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[12px] font-bold ${isSamuel ? 'text-indigo-300' : 'text-slate-200'}`}>
                            {isSamuel ? 'Samuel AI' : (comment.profiles?.full_name || comment.profiles?.username || 'Anonymous')}
                          </span>
                          <span className="text-[11px] text-slate-600">
                            {comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className={`text-sm leading-relaxed markdown-body ${isSamuel ? 'text-indigo-100' : 'text-slate-300'}`}>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {clean}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {isAITyping && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="bg-indigo-950/60 border border-indigo-800/60 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                    <span className="text-sm text-indigo-300 font-medium">Samuel is typing</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSubmitComment} className="flex gap-2 items-center">
              <Avatar url={currentUser?.avatar} name={currentUser?.name} size="sm" />
              <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 focus-within:border-indigo-600 transition-colors">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write an answer, or tag @Samuel…"
                  className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="ml-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </CommentErrorBoundary>
      )}
    </div>
  );
});

export function LiveRoomCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-3 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </div>
        <div>
          <h3 className="font-bold text-slate-100">Quiet Pomodoro Sprint</h3>
          <p className="text-slate-500 text-xs">Lofi soundscape · 24 studying</p>
        </div>
        <span className="ml-auto bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
      </div>
      <div className="flex justify-center -space-x-2 mb-4">
        {['J','S','M'].map((l, i) => (
          <div key={i} className={`w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white ${['bg-blue-500','bg-emerald-500','bg-amber-500'][i]}`}>{l}</div>
        ))}
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">+21</div>
      </div>
      <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-colors active:scale-[0.98] text-sm">
        Join Sprint
      </button>
    </div>
  );
}
