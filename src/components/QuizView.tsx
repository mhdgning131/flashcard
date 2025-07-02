import React, { useState, useEffect } from 'react';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizViewProps {
  questions: QuizQuestion[];
  onCreateNew: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ questions, onCreateNew }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  // Start timer when component mounts
  useEffect(() => {
    setStartTime(Date.now());
    
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswerRevealed) return; // Prevent changing answer after reveal
    setSelectedOption(optionIndex);
  };

  const handleRevealAnswer = () => {
    if (selectedOption !== null) {
      setIsAnswerRevealed(true);
      if (selectedOption === currentQuestion.correctAnswer) {
        setScore(score + 1);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      setQuizCompleted(true);
    }
  };

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render quiz completion view
  if (quizCompleted) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    
    let performanceMessage = '';
    if (percentage >= 90) {
      performanceMessage = 'Excellent! You have mastered this topic.';
    } else if (percentage >= 70) {
      performanceMessage = 'Great job! You have a good understanding of this material.';
    } else if (percentage >= 50) {
      performanceMessage = 'Good effort! With a bit more review, you\'ll master this content.';
    } else {
      performanceMessage = 'Keep practicing! This topic needs more review.';
    }

    return (
      <div className="w-full max-w-4xl mx-auto py-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-8 py-6 text-center">
            <div className="w-32 h-32 mx-auto relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - percentage / 100)}
                  className={`${
                    percentage >= 70 ? 'stroke-green-500' : percentage >= 40 ? 'stroke-yellow-500' : 'stroke-red-500'
                  } transition-all duration-1000 ease-out`}
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-3xl font-bold fill-slate-900 dark:fill-white"
                >
                  {percentage}%
                </text>
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-6 mb-2">Quiz Completed!</h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg mb-4">{performanceMessage}</p>
            
            <div className="flex justify-center space-x-8 mb-6">
              <div className="text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Score</p>
                <p className="text-slate-900 dark:text-white text-xl font-medium">{score} / {totalQuestions}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Time</p>
                <p className="text-slate-900 dark:text-white text-xl font-medium">{minutes}m {seconds}s</p>
              </div>
            </div>
            
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors duration-200 font-medium"
            >
              Create New Quiz
            </button>
          </div>
        </div>

        {/* Results breakdown */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-4">Performance Breakdown</h3>
          
          <ul className="space-y-4">
            {questions.map((q, index) => (
              <li key={index} className="border-b border-slate-200 dark:border-slate-700 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    index < currentQuestionIndex || quizCompleted ? 
                      (q.correctAnswer === questions[index].correctAnswer ? 'bg-green-500' : 'bg-red-500') :
                      'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className="text-xs text-white font-medium">{index + 1}</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-slate-900 dark:text-white font-medium">{q.question}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Correct answer: {q.options[q.correctAnswer]}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      {/* Progress bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Question counter and timer */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(timeSpent)}
        </div>
      </div>
      
      {/* Question card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex-1">
        {/* Question */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-medium text-slate-900 dark:text-white">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Answer options */}
        <div className="p-6">
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswerRevealed}
                className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                  selectedOption === index 
                    ? isAnswerRevealed 
                      ? index === currentQuestion.correctAnswer 
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                        : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                      : 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                    : isAnswerRevealed && index === currentQuestion.correctAnswer
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                      : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    selectedOption === index 
                      ? isAnswerRevealed 
                        ? index === currentQuestion.correctAnswer 
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-blue-600 text-white'
                      : isAnswerRevealed && index === currentQuestion.correctAnswer
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                  }`}>
                    <span className="text-xs font-medium">{String.fromCharCode(65 + index)}</span>
                  </div>
                  <span className={`${
                    (isAnswerRevealed && index === currentQuestion.correctAnswer) ? 'text-green-700 dark:text-green-300 font-medium' : 
                    (isAnswerRevealed && selectedOption === index) ? 'text-red-700 dark:text-red-300' : 
                    'text-slate-900 dark:text-slate-100'
                  }`}>
                    {option}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Explanation (shown only after answer is revealed) */}
        {isAnswerRevealed && (
          <div className="px-6 pb-6">
            <div className={`mt-4 p-4 rounded-lg ${
              selectedOption === currentQuestion.correctAnswer 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <p className={`text-sm font-medium ${
                selectedOption === currentQuestion.correctAnswer 
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}>
                {selectedOption === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
              </p>
              <p className="mt-1 text-slate-700 dark:text-slate-300">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
          {!isAnswerRevealed ? (
            <button
              onClick={handleRevealAnswer}
              disabled={selectedOption === null}
              className={`px-6 py-3 rounded-lg font-medium ${
                selectedOption !== null
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'View Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};