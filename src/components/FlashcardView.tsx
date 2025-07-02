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
  options?: { language: string; count: number; };
  initialCardIndex?: number;
  onCardIndexChange?: (index: number) => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({ 
  cards, 
  onCreateNew, 
  options,
  initialCardIndex = 0,
  onCardIndexChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialCardIndex);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setName, setSetName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notify parent component when card index changes
  useEffect(() => {
    if (onCardIndexChange) {
      onCardIndexChange(currentIndex);
    }
  }, [currentIndex, onCardIndexChange]);

  // Handle saving the flashcard set
  const handleSave = useCallback(() => {
    if (!setName.trim()) return;
    
    const language = options?.language || 'en';
    const count = options?.count || cards.length;
    
    StorageService.saveFlashcardSet(setName.trim(), cards, language, count);
    setSaveSuccess(true);
    setSetName('');
    
    // Hide success message after 2 seconds
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaveModalOpen(false);
    }, 2000);
    
    // Track save event
    if (window.trackUserEngagement) {
      window.trackUserEngagement('flashcard_set_saved', `cards_${cards.length}`);
    }
  }, [cards, setName, options]);

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

      {/* Action buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setIsSaveModalOpen(true)}
          className="group relative overflow-hidden px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ease-out border border-slate-200 dark:border-slate-700"
        >
          <span className="relative z-10 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Set
          </span>
        </button>
        
        <button
          onClick={onCreateNew}
          className="group relative overflow-hidden px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ease-out"
        >
          <span className="relative z-10">Create New Set</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>

      {/* Save modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Save Flashcard Set</h3>
              <button 
                onClick={() => {setIsSaveModalOpen(false); setSaveSuccess(false);}}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {saveSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">Set Saved Successfully</p>
                <p className="text-slate-500 dark:text-slate-400">You can access it anytime from your saved sets</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="set-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name your set
                  </label>
                  <input
                    type="text"
                    id="set-name"
                    placeholder="e.g. Spanish Vocabulary, Biology Terms"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  This will save all {cards.length} flashcards in this set
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsSaveModalOpen(false)}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!setName.trim()}
                    className={`px-4 py-2 rounded-lg ${
                      setName.trim() 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-300 cursor-not-allowed text-white'
                    }`}
                  >
                    Save Set
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
