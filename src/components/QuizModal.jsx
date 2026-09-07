import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Adjusted path to root src

// Simulated AI API call
const generateQuiz = async (textContent) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          question: "Based on the post, what is the main concept discussed?",
          options: ["Database Architecture", "React State Management", "Tailwind styling", "Edge Functions"],
          answer: 1 // index 1 is correct
        },
        {
          id: 2,
          question: "Which of the following describes the C_Coins system?",
          options: ["A crypto token", "A social learning reward currency", "A fiat currency", "A reputation badge"],
          answer: 1
        },
        {
          id: 3,
          question: "What format does the poll_data utilize in the schema?",
          options: ["XML", "CSV", "JSONB", "VARCHAR"],
          answer: 2
        }
      ]);
    }, 1800); // Simulate network AI latency
  });
};

const QuizModal = ({ isOpen, onClose, postContent, currentUser }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setLoading(true);
      setCurrentQIndex(0);
      setSelectedAnswers({});
      setIsFinished(false);
      
      generateQuiz(postContent).then((qs) => {
        setQuestions(qs);
        setLoading(false);
      });
    }
  }, [isOpen, postContent]);

  if (!isOpen) return null;

  const handleSelectOption = (optionIndex) => {
    setSelectedAnswers(prev => ({...prev, [currentQIndex]: optionIndex}));
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      // Tally final score
      let calculatedScore = 0;
      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.answer) {
          calculatedScore += 1;
        }
      });
      setScore(calculatedScore);
      setIsFinished(true);

      // Secure Database Update for Perfect Score
      if (calculatedScore === questions.length && currentUser?.id) {
        // We do NOT await this promise, allowing the UI to show the celebration instantly.
        // Any errors are caught silently in the background.
        supabase.rpc('reward_quiz_coin', { target_user_id: currentUser.id })
          .then(({ error }) => {
            if (error) console.error("Silent Error: Failed to reward coin in DB", error);
          })
          .catch(err => {
            console.error("Silent Error: RPC Exception", err);
          });
      }
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
          ) : isFinished ? (
            <div className="text-center py-8 flex flex-col items-center gap-5">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-inner ${score === 3 ? 'bg-green-100' : 'bg-orange-100'}`}>
                {score === 3 ? '🎉' : '🧠'}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  You scored {score}/{questions.length}
                </h3>
                <p className="text-gray-500 mt-1">
                  {score === 3 ? "Flawless victory!" : "Good effort, keep learning!"}
                </p>
              </div>
              
              {score === 3 && (
                <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 w-full mt-2 animate-bounce-short">
                  <p className="font-bold text-lg flex items-center justify-center gap-2">
                    <span className="text-2xl">🪙</span> +1 C Coin Earned!
                  </p>
                  <p className="text-sm mt-1 opacity-80">Added to your wallet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center text-xs font-bold text-indigo-400 tracking-wider uppercase">
                <span>Question {currentQIndex + 1} of {questions.length}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 leading-snug">
                {questions[currentQIndex].question}
              </h3>
              <div className="flex flex-col gap-3 mt-2">
                {questions[currentQIndex].options.map((opt, i) => {
                  const isSelected = selectedAnswers[currentQIndex] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(i)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' 
                          : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-gray-300'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                        </div>
                        <span className="font-medium">{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !isFinished && (
          <div className="p-4 border-t border-gray-100 bg-white pb-safe">
            <button
              onClick={handleNext}
              disabled={selectedAnswers[currentQIndex] === undefined}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-lg disabled:opacity-50 disabled:bg-gray-300 hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-sm disabled:shadow-none"
            >
              {currentQIndex === questions.length - 1 ? 'Finish & Check Score' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizModal;
