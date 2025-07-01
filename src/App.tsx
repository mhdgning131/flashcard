import React, { useState, useCallback, useEffect } from 'react';
import { CreationView } from './components/CreationView';
import { FlashcardView } from './components/FlashcardView';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { generateFlashcards } from './services/geminiService';
import { StorageService } from './services/storageService';
import { FlashcardData, FlashcardOptions, ThemeMode } from './types';

const App: React.FC = () => {
  const [cards, setCards] = useState<FlashcardData[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Load settings on mount
  useEffect(() => {
    const settings = StorageService.getSettings();
    setTheme(settings.theme);
    
    // Apply theme to document
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const storedSettings = StorageService.getSettings();
      if (!localStorage.getItem('flashcards_settings')) {
        const systemTheme: ThemeMode = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
        StorageService.updateTheme(systemTheme);
        
        if (systemTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const handleThemeToggle = useCallback(() => {
    console.log('Theme toggle clicked, current theme:', theme);
    const newTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    console.log('Switching to theme:', newTheme);
    
    setTheme(newTheme);
    StorageService.updateTheme(newTheme);
    
    // Apply theme to document with aggressive repaint
    console.log('Applying theme to document element');
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to document');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from document');
    }
    
    // Force immediate repaint and reflow
    const root = document.documentElement;
    root.style.display = 'none';
    root.offsetHeight; // Trigger reflow
    root.style.display = '';
    
    // Force Tailwind to re-process styles if available
    if ((window as any).tailwind && (window as any).tailwind.config) {
      // Trigger Tailwind observer if it exists
      const event = new Event('tailwind-theme-change');
      document.dispatchEvent(event);
    }
    
    // Verify the change
    setTimeout(() => {
      console.log('Document classes after change:', document.documentElement.className);
      console.log('Current stored theme:', StorageService.getSettings().theme);
      console.log('Computed background color:', getComputedStyle(document.body).backgroundColor);
    }, 100);
  }, [theme]);

  const handleCreateFlashcards = useCallback(async (context: string, options: FlashcardOptions) => {
    setIsLoading(true);
    setError(null);
    setCards(null);
    
    try {
      const generatedCards = await generateFlashcards(context, options);
      if (generatedCards.length === 0) {
        setError("The AI couldn't generate flashcards for this topic. Please try being more specific.");
      } else {
        setCards(generatedCards);
      }
    } catch (e: any) {
      console.error('Flashcard generation error:', e);
      
      // Handle specific error types with user-friendly messages
      if (e.message?.includes('Too many requests')) {
        setError('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (e.message?.includes('Invalid input')) {
        setError('The content provided contains invalid elements. Please check your input and try again.');
      } else if (e.message?.includes('temporarily unavailable')) {
        setError('AI service is temporarily unavailable. Please try again in a few moments.');
      } else if (e.message?.includes('Content too long')) {
        setError('Content is too long. Please limit your input to 50,000 characters or less.');
      } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An error occurred while generating flashcards. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateNew = useCallback(() => {
    setCards(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center flex-1 min-h-[60vh]">
          <div className="relative">
            <Loader />
            {/* Apple-style loading context */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 dark:bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <h2 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">
              Crafting your study set
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-light max-w-md mx-auto leading-relaxed">
              Our AI is analyzing your content and creating personalized flashcards for optimal learning.
            </p>
          </div>
        </div>
      );
    }

    if (cards) {
      return <FlashcardView cards={cards} onCreateNew={handleCreateNew} />;
    }

    return <CreationView onCreate={handleCreateFlashcards} error={error} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white transition-all duration-300">
      {/* Apple-style background texture */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100/20 via-transparent to-slate-200/20 dark:from-slate-700/10 dark:via-transparent dark:to-slate-800/10"></div>
      
      <div className="relative min-h-screen flex flex-col">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col flex-1 max-w-7xl">
          <Header 
            theme={theme}
            onThemeToggle={handleThemeToggle}
            showBackButton={!!cards}
            onBackClick={cards ? handleCreateNew : undefined}
          />
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;