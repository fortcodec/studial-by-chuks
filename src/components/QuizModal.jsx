import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Adjusted path to root src
import QuizCard from './QuizCard';

// Simulated AI API call
const generateQuiz = async (textContent) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          question: "Based on the post, what is the main concept discussed?",
          options: ["Database Architecture", "React State Management", "Tailwind styling", "Edge Functions"],
          correctAnswer: "React State Management",
          explanation: "The text heavily references React state handling."
        },
        {
          id: 2,
          question: "Which of the following describes the C_Coins system?",
          options: ["A crypto token", "A social learning reward currency", "A fiat currency", "A reputation badge"],
          correctAnswer: "A social learning reward currency",
          explanation: "C-Coins are explicitly used as a learning reward inside Studial."
        },
        {
          id: 3,
          question: "What format does the poll_data utilize in the schema?",
          options: ["XML", "CSV", "JSONB", "VARCHAR"],
          correctAnswer: "JSONB",
          explanation: "Supabase and Postgres use JSONB for nested poll data structures."
        }
      ]);
    }, 1800); // Simulate network AI latency
  });
};

const QuizModal = ({ isOpen, onClose, postContent, currentUser }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      generateQuiz(postContent).then((qs) => {
        setQuestions(qs);
        setLoading(false);
      });
    }
  }, [isOpen, postContent]);

  if (!isOpen) return null;

  const handleQuizComplete = (finalScore, totalQs) => {
    // Secure Database Update for Perfect Score
    if (finalScore === totalQs && currentUser?.id) {
      supabase.rpc('reward_quiz_coin', { target_user_id: currentUser.id })
        .catch(err => console.error("Silent Error: RPC Exception", err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-slide-up sm:animate-fade-in">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-indigo-50/50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-indigo-900">Knowledge Check</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-indigo-100 text-indigo-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium animate-pulse text-sm">AI is reading the post...</p>
            </div>
          ) : (
            <QuizCard 
              quizData={questions} 
              onComplete={handleQuizComplete} 
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
