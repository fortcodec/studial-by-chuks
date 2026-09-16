import React, { useState } from 'react';
import { MoreHorizontal, ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Share2, Download, Radio, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function PostCard({ type, author, course, topic, timeAgo, content, stats, currentUser, authorId, onTipSuccess, onOpenQuiz, ...props }) {
  const [isTipping, setIsTipping] = useState(false);
  const [tipStatus, setTipStatus] = useState(null);

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
      
      if (error) {
        throw error;
      }
      
      setTipStatus('success');
      if (onTipSuccess) onTipSuccess();
      setTimeout(() => setTipStatus(null), 3000);
      
    } catch (err) {
      alert(err.message || "Failed to tip. Insufficient C Coins?");
    } finally {
      setIsTipping(false);
    }
  };
  return (
    <div className="bg-white rounded-[24px] shadow-surface-1 p-5 mb-5 border border-outline-variant/30">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {author.avatar && author.avatar.startsWith('http') ? (
            <img src={author.avatar} alt={author.name} className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {(author.name || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-bold text-on-surface leading-tight">{author.name}</h3>
              <span className="text-outline text-xs">&bull; {author.school}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="bg-primary-container/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                {course} &bull; {topic}
              </span>
              <span className="text-outline text-xs">{timeAgo}</span>
            </div>
          </div>
        </div>
        <button className="text-outline hover:text-on-surface">
          <MoreHorizontal className="w-5 h-5" />
        </button>
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
      <p className="text-[15px] text-on-surface-variant leading-relaxed mb-4">
        {content}
      </p>

      {/* Attachments */}
      {props.attachmentImage && (
        <div className="rounded-2xl border border-outline-variant/30 overflow-hidden mb-4 bg-surface-container-lowest">
          <img src={props.attachmentImage} alt="Attachment" className="w-full h-auto object-cover" />
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
      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
        <div className="flex items-center gap-4">
          {/* Upvote / Downvote Toggle */}
          <div className="flex items-center bg-primary/5 rounded-full border border-primary/10 overflow-hidden">
            <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-primary/10 text-primary transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-[13px] font-bold">{stats.upvotes}</span>
            </button>
            <div className="w-px h-4 bg-primary/20"></div>
            <button className="px-3 py-1.5 hover:bg-primary/10 text-outline hover:text-on-surface transition-colors">
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
          
          <button className="flex items-center gap-1.5 text-outline hover:text-on-surface transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="text-[13px] font-semibold">{stats.answers} {stats.answers === 1 ? 'Answer' : 'Answers'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
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
            className="flex items-center gap-1 border border-indigo-200 bg-indigo-50 text-indigo-700 text-[12px] font-bold px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-all active:scale-95"
          >
            🧠 Quiz Me
          </button>

          <button className="flex items-center gap-1 text-outline hover:text-on-surface transition-colors">
            <Bookmark className="w-4 h-4" />
            <span className="text-[13px] font-semibold hidden sm:inline">Save</span>
          </button>
          <button className="text-outline hover:text-on-surface transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
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
