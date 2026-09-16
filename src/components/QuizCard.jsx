import { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, Award } from 'lucide-react';

export default function QuizCard({ quizData, onComplete, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = quizData[currentIndex];

  const handleSelect = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < quizData.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      // Pass the final score up to handle C Coin rewards in the parent component
      onComplete(score, quizData.length);
    }
  };

  if (showResults) {
    return (
      <div className="bg-white/90 backdrop-blur shadow-sm rounded-2xl p-6 text-center">
        <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">Quiz Complete!</h2>
        <p className="text-gray-600 mb-6">You scored {score} out of {quizData.length}</p>
        <button 
          onClick={onClose}
          className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl active:scale-[0.98] transition-transform">
          Claim C Coins & Return
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur shadow-sm rounded-2xl p-6 mb-4">
      <div className="flex justify-between items-center mb-6 text-sm text-gray-500 font-medium">
        <span>Question {currentIndex + 1} of {quizData.length}</span>
        <span>Score: {score}</span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-6">{currentQuestion.question}</h3>

      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, idx) => {
          const isCorrect = option === currentQuestion.correctAnswer;
          const isSelected = selectedOption === option;

          let buttonStyle = "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100";
          
          if (isAnswered) {
            if (isCorrect) buttonStyle = "bg-green-50 border-green-500 text-green-700";
            else if (isSelected && !isCorrect) buttonStyle = "bg-red-50 border-red-500 text-red-700";
            else buttonStyle = "bg-gray-50 opacity-50 border-gray-200 text-gray-400";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              disabled={isAnswered}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${buttonStyle}`}
            >
              <span className="font-medium">{option}</span>
              {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-green-500 shrink-0 ml-2" />}
              {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="bg-indigo-50 p-4 rounded-xl mb-6">
          <p className="text-sm text-indigo-900">
            <span className="font-bold">Explanation:</span> {currentQuestion.explanation}
          </p>
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!isAnswered}
        className={`w-full font-semibold py-3 rounded-xl flex items-center justify-center transition-transform ${isAnswered ? 'bg-indigo-600 text-white active:scale-[0.98]' : 'bg-gray-200 text-gray-400'}`}
      >
        {currentIndex + 1 === quizData.length ? 'See Results' : 'Next Question'}
        <ChevronRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  );
}
