import React from 'react';
import { ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  onThemeToggle: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  onShowSavedSets?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  theme, 
  onThemeToggle, 
  showBackButton = false, 
  onBackClick,
  onShowSavedSets
}) => {
  return (
    <header className="mb-12">
      {/* Apple-style floating header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center px-6 py-4">
          {/* Left section - Logo and back navigation */}
          <div className="flex items-center space-x-4">
            {/* Logo moved to far left */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white dark:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h1 className="text-xl font-light text-slate-900 dark:text-white tracking-tight hidden sm:block">
                FlashCards
              </h1>
            </div>
            
            {showBackButton && onBackClick && (
              <button
                onClick={onBackClick}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 rounded-xl transition-all duration-200 group ml-2"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium text-sm">Back</span>
              </button>
            )}
          </div>
          
          {/* Middle section - empty */}
          <div className="flex-1"></div>

          {/* Right section */}
          <div className="flex items-center justify-end space-x-2">
            {onShowSavedSets && (
              <button
                onClick={onShowSavedSets}
                className="group flex items-center justify-center px-3 py-2 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-all duration-200"
                title="View saved flashcard sets"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-medium text-sm">My Sets</span>
              </button>
            )}
            
            <button
              onClick={onThemeToggle}
              className="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-all duration-200 hover:scale-105"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646A9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};