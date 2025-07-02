import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SavedFlashcardSet } from '../types';
import { StorageService } from '../services/storageService';

interface SavedSetsProps {
  onLoadSet: (set: SavedFlashcardSet) => void;
  onClose: () => void;
}

export const SavedSets: React.FC<SavedSetsProps> = ({ onLoadSet, onClose }) => {
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    // Save current body overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
    
    // Focus the modal for proper keyboard navigation
    if (modalRef.current) {
      modalRef.current.focus();
    }
    
    // Cleanup function to restore body scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  // Handle keyboard events (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close modal on Escape key
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Prevent keyboard events from reaching elements behind the modal
      e.stopPropagation();
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function to remove event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Load saved sets on component mount
  useEffect(() => {
    const sets = StorageService.getSavedFlashcardSets();
    setSavedSets(sets);
  }, []);

  // Handle deleting a set
  const handleDelete = useCallback((id: string) => {
    if (deleteConfirm === id) {
      StorageService.deleteFlashcardSet(id);
      setSavedSets(prev => prev.filter(set => set.id !== id));
      setDeleteConfirm(null);
      
      // Track deletion event
      if (window.trackUserEngagement) {
        window.trackUserEngagement('flashcard_set_deleted', id);
      }
    } else {
      setDeleteConfirm(id);
    }
  }, [deleteConfirm]);

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    // Prevent clicks on the backdrop from affecting background content
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Close modal when clicking on the backdrop (but not when clicking on the modal itself)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
        tabIndex={-1} // Make modal focusable but not in tab order
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Your Saved Flashcard Sets</h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Close saved sets"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {savedSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">No Saved Sets</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                After creating a flashcard set, use the "Save Set" button to save it for later study sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSets.map(set => (
                <div 
                  key={set.id}
                  className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">{set.name}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDelete(set.id)}
                        className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                        aria-label="Delete set"
                      >
                        {deleteConfirm === set.id ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex space-x-3 mb-2">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{set.cards.length} Cards</span>
                      </div>
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {SUPPORTED_LANGUAGES.find(lang => lang.code === set.language)?.name || set.language}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(set.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onLoadSet(set)}
                    className="w-full py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Study This Set
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-800 dark:text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];