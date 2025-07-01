import React, { useState, useEffect, useCallback } from 'react';
import { FlashcardData } from '../types';
import { Flashcard } from './Flashcard';
import { ArrowLeftIcon, ArrowRightIcon } from './icons';
import { StorageService } from '../services/storageService';

declare global {
  interface Window {
    trackUserEngagement?: (action: string, value: string) => void;
  }
}

interface FlashcardViewProps {
  cards: FlashcardData[];
  onCreateNew: () => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({ cards, onCreateNew }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAnswerResponse = useCallback((correct: boolean) => {
    StorageService.updateStats(correct);
    
    // Track user engagement with flashcards
    if (window.trackUserEngagement) {
      window.trackUserEngagement('flashcard_answered', correct ? 'correct' : 'incorrect');
    }
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
    
    // Track navigation events
    if (window.trackUserEngagement) {
      window.trackUserEngagement('navigate_next', `card_${currentIndex + 1}_of_${cards.length}`);
    }
  }, [cards.length, currentIndex]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
    
    // Track navigation events
    if (window.trackUserEngagement) {
      window.trackUserEngagement('navigate_previous', `card_${currentIndex + 1}_of_${cards.length}`);
    }
  }, [cards.length, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToNext, goToPrev]);

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No flashcards found</h3>
          <p className="text-slate-600 dark:text-slate-400">Please create some flashcards to get started</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercentage = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 max-w-4xl mx-auto">
      {/* Apple-style minimal progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <span className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">
            {currentIndex + 1}
          </span>
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
          <span className="text-lg font-light text-slate-500 dark:text-slate-400">
            of {cards.length}
          </span>
        </div>
        
        {/* Minimalist progress track */}
        <div className="flex-1 mx-8 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          {Math.round(progressPercentage)}%
        </span>
      </div>

      {/* Main card area with Apple-style centered focus */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 mb-12">
        <div className="w-full max-w-2xl">
          <Flashcard 
            card={currentCard} 
            onAnswerResponse={handleAnswerResponse}
          />
        </div>
      </div>

      {/* Apple-style floating navigation */}
      <div className="flex items-center justify-center space-x-6 mb-8">
        <button
          onClick={goToPrev}
          className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:scale-105 transition-all duration-200 ease-out"
        >
          <ArrowLeftIcon />
        </button>

        <div className="flex flex-col items-center space-y-1">
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(cards.length, 10) }, (_, i) => {
              const isActive = i === Math.floor((currentIndex / cards.length) * Math.min(cards.length, 10));
              return (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isActive 
                      ? 'bg-slate-900 dark:bg-white scale-125' 
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
            swipe or use arrow keys
          </span>
        </div>

        <button
          onClick={goToNext}
          className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:scale-105 transition-all duration-200 ease-out"
        >
          <ArrowRightIcon />
        </button>
      </div>

      {/* Apple-style prominent CTA */}
      <div className="flex justify-center">
        <button
          onClick={onCreateNew}
          className="group relative overflow-hidden px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ease-out"
        >
          <span className="relative z-10">Create New Set</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>
    </div>
  );
};
