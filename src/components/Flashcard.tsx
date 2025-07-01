import React, { useState, useEffect, useCallback } from 'react';
import { FlashcardData } from '../types';
import { sanitizeForDisplay, validateContent, truncateContent } from '../utils/sanitization';

interface FlashcardProps {
  card: FlashcardData;
  onAnswerResponse: (correct: boolean) => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ card, onAnswerResponse }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleFlip = useCallback(() => {
    setIsFlipped(f => !f);
  }, []);

  const handleResponse = useCallback((correct: boolean) => {
    if (!hasAnswered) {
      setHasAnswered(true);
      onAnswerResponse(correct);
    }
  }, [hasAnswered, onAnswerResponse]);

  useEffect(() => {
    setIsFlipped(false);
    setHasAnswered(false);
  }, [card]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFlip]);

  const safeTerm = validateContent(card.term) ? sanitizeForDisplay(truncateContent(card.term, 500)) : 'Invalid content';
  const safeDefinition = validateContent(card.definition) ? sanitizeForDisplay(truncateContent(card.definition, 2000)) : 'Invalid content';

  return (
    <div className="w-full h-[350px] sm:h-[400px] lg:h-[500px] cursor-pointer perspective-1000" onClick={handleFlip}>
      <div
        className={`relative w-full h-full transform-style-3d transition-all duration-700 ease-out ${
          isFlipped ? '[transform:rotateX(180deg)]' : ''
        }`}
      >
        {/* Front of card - Apple-style design */}
        <div className="absolute w-full h-full backface-hidden bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-3xl shadow-2xl flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-slate-100/5 dark:from-slate-700/10 dark:via-transparent dark:to-slate-900/5 rounded-3xl"></div>
          
          <div className="relative z-10 flex-1 flex items-center justify-center text-center">
            <div className="space-y-4">
              {/* Apple-style typography */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-slate-900 dark:text-white leading-tight tracking-tight">
                {safeTerm}
              </h2>
              
              {/* Subtle tap indicator */}
              <div className="flex items-center justify-center space-x-2 pt-4 sm:pt-6 lg:pt-8">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 tracking-wide">
                  tap to reveal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card - Apple-style design */}
        <div className="absolute w-full h-full backface-hidden bg-slate-900/95 dark:bg-white/95 backdrop-blur-xl border border-slate-700/30 dark:border-white/20 rounded-3xl shadow-2xl flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 [transform:rotateX(180deg)] text-white dark:text-slate-900">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 via-transparent to-slate-900/5 dark:from-white/10 dark:via-transparent dark:to-slate-100/5 rounded-3xl"></div>
          
          <div className="relative z-10 flex-1 flex items-center justify-center text-center mb-6 sm:mb-8">
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-light leading-relaxed tracking-wide max-w-lg">
              {safeDefinition}
            </p>
          </div>
          
          {/* Apple-style response buttons */}
          <div className="relative z-10 flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={(e) => { e.stopPropagation(); handleResponse(false); }}
              className={`group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-300 ${
                hasAnswered 
                  ? 'cursor-not-allowed opacity-40 bg-slate-600 dark:bg-slate-300' 
                  : 'bg-red-500/90 hover:bg-red-500 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl'
              }`}
              disabled={hasAnswered}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="w-px h-6 sm:h-8 bg-white/20 dark:bg-slate-900/20"></div>
            
            <button
              onClick={(e) => { e.stopPropagation(); handleResponse(true); }}
              className={`group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-300 ${
                hasAnswered 
                  ? 'cursor-not-allowed opacity-40 bg-slate-600 dark:bg-slate-300' 
                  : 'bg-green-500/90 hover:bg-green-500 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl'
              }`}
              disabled={hasAnswered}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
          
          {/* Subtle instruction text */}
          <div className="relative z-10 mt-4 sm:mt-6 text-center">
            <span className="text-xs font-medium text-white/60 dark:text-slate-900/60 tracking-wide">
              How well did you know this?
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
