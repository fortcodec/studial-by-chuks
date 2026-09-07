import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '../supabaseClient'; // Adjusted path to root src
import QuizModal from './QuizModal';

const PostCard = ({ post, currentUser }) => {
  const [pollData, setPollData] = useState(post.poll_data);
  const [hasVoted, setHasVoted] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  // Check if user has already voted on this poll
  useEffect(() => {
    const checkIfVoted = async () => {
      if (!currentUser || !post.poll_data) return;
      
      const { data } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)
        .single();
      
      if (data) setHasVoted(true);
    };
    checkIfVoted();
  }, [post.id, currentUser, post.poll_data]);

  // Calculate total votes for percentage bars
  const totalVotes = pollData?.options 
    ? pollData.options.reduce((sum, opt) => sum + Object.values(opt)[0], 0) 
    : 0;

  const handleVote = async (optionKey) => {
    if (hasVoted || !currentUser) return;
    
    // 1. Optimistic UI Update for instant feedback
    const newOptions = pollData.options.map(opt => {
      const key = Object.keys(opt)[0];
      if (key === optionKey) {
        return { [key]: opt[key] + 1 };
      }
      return opt;
    });
    
    setPollData({ options: newOptions });
    setHasVoted(true);

    try {
      // 2. Insert the vote record
      await supabase.from('poll_votes').insert({
        post_id: post.id,
        user_id: currentUser.id,
        voted_option: optionKey
      });

      // 3. Update the post's JSONB poll_data
      await supabase.from('posts').update({
        poll_data: { options: newOptions }
      }).eq('id', post.id);

    } catch (error) {
      console.error('Error recording vote:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4 mb-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
          {post.author_username?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 leading-none">{post.author_username || 'Anonymous'}</span>
          <span className="text-xs text-gray-500 mt-1">2 hours ago</span>
        </div>
      </div>
      
      {/* Content */}
      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
        {post.content}
      </p>
      
      {/* Media Player */}
      {post.media_url && (
        <div className="rounded-xl overflow-hidden relative pt-[56.25%] bg-black mt-2">
          <ReactPlayer 
            url={post.media_url} 
            className="absolute top-0 left-0"
            width="100%" 
            height="100%" 
            controls 
            light={true}
          />
        </div>
      )}

      {/* Interactive Poll */}
      {pollData?.options && (
        <div className="flex flex-col gap-2 mt-3">
          {pollData.options.map((opt, index) => {
            const key = Object.keys(opt)[0];
            const votes = opt[key];
            const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
            
            return (
              <button
                key={index}
                onClick={() => handleVote(key)}
                disabled={hasVoted}
                className={`relative h-11 w-full rounded-lg border overflow-hidden text-left focus:outline-none transition-all duration-300 disabled:cursor-default
                  ${hasVoted ? 'border-indigo-200' : 'border-gray-200 hover:border-indigo-300 active:scale-[0.98]'}`}
              >
                {/* Animated Progress Bar */}
                <div 
                  className={`absolute top-0 left-0 h-full ${hasVoted ? 'bg-indigo-100' : 'bg-transparent'}`}
                  style={{ width: `${hasVoted ? percentage : 0}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
                
                <div className="absolute inset-0 flex justify-between items-center px-4">
                  <span className={`font-medium z-10 ${hasVoted ? 'text-indigo-900' : 'text-gray-700'}`}>
                    {key}
                  </span>
                  {hasVoted && (
                    <span className="text-sm font-semibold text-indigo-700 z-10">{percentage}%</span>
                  )}
                </div>
              </button>
            );
          })}
          <div className="text-xs text-gray-500 font-medium mt-1 ml-1">{totalVotes} votes</div>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-3 border-t border-gray-50 mt-2">
        <button 
          onClick={() => setIsQuizModalOpen(true)}
          className="flex items-center justify-center w-full gap-2 bg-indigo-50 text-indigo-600 font-semibold py-2.5 rounded-xl hover:bg-indigo-100 active:bg-indigo-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
          Test My Knowledge
        </button>
      </div>

      <QuizModal 
        isOpen={isQuizModalOpen} 
        onClose={() => setIsQuizModalOpen(false)} 
        postContent={post.content} 
        currentUser={currentUser}
      />
    </div>
  );
};

export default PostCard;
