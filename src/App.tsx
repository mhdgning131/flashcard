import React, { useState, useCallback, useEffect } from 'react';
import { CreationView } from './components/CreationView';
import { FlashcardView } from './components/FlashcardView';
import { NotesView } from './components/NotesView';
import { QuizView } from './components/QuizView';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { SavedSets } from './components/SavedSets';
import { generateContent } from './services/geminiService';
import { StorageService } from './services/storageService';
import { FlashcardData, FlashcardOptions, ThemeMode, SavedFlashcardSet, GenerationMode } from './types';
import { QuizQuestion } from './components/QuizView';

// Session storage key for current cards
const SESSION_STORAGE_KEY = 'flashcards_current_session';

const App: React.FC = () => {
  const [cards, setCards] = useState<FlashcardData[] | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [currentOptions, setCurrentOptions] = useState<FlashcardOptions | null>(null);
  const [showSavedSets, setShowSavedSets] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

  // Load settings and current session on mount
  useEffect(() => {
    const settings = StorageService.getSettings();
    setTheme(settings.theme);
    
    // Apply theme to document
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Restore session state on page load
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        const { savedCards, savedNotes, savedQuizQuestions, savedOptions, cardIndex = 0 } = JSON.parse(sessionData);
        
        if (savedOptions) {
          setCurrentOptions(savedOptions);
          
          if (savedOptions.generationMode === GenerationMode.FLASHCARDS && savedCards && Array.isArray(savedCards) && savedCards.length > 0) {
            setCards(savedCards);
            setCurrentCardIndex(cardIndex);
          } else if (savedOptions.generationMode === GenerationMode.NOTES && savedNotes) {
            setNotes(savedNotes);
          } else if (savedOptions.generationMode === GenerationMode.QUIZ && savedQuizQuestions && Array.isArray(savedQuizQuestions)) {
            setQuizQuestions(savedQuizQuestions);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
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

  // Save current state to session storage when it changes
  useEffect(() => {
    const saveToSessionStorage = () => {
      if (!currentOptions) return;

      try {
        const sessionData: any = {
          savedOptions: currentOptions
        };

        if (currentOptions.generationMode === GenerationMode.FLASHCARDS && cards && cards.length > 0) {
          sessionData.savedCards = cards;
          sessionData.cardIndex = currentCardIndex;
        } else if (currentOptions.generationMode === GenerationMode.NOTES && notes) {
          sessionData.savedNotes = notes;
        } else if (currentOptions.generationMode === GenerationMode.QUIZ && quizQuestions && quizQuestions.length > 0) {
          sessionData.savedQuizQuestions = quizQuestions;
        } else {
          // Don't save if we don't have valid content
          return;
        }

        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (error) {
        console.error('Error saving session:', error);
      }
    };

    saveToSessionStorage();
  }, [cards, notes, quizQuestions, currentOptions, currentCardIndex]);

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

  const handleCreateContent = useCallback(async (context: string, options: FlashcardOptions) => {
    setIsLoading(true);
    setError(null);
    setCards(null);
    setNotes(null);
    setQuizQuestions(null);
    setCurrentOptions(options);
    
    // Clear any previous session data when creating new content
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    try {
      const generatedContent = await generateContent(context, options);
      
      if (options.generationMode === GenerationMode.FLASHCARDS) {
        const flashcardData = generatedContent as FlashcardData[];
        if (flashcardData.length === 0) {
          setError("The AI couldn't generate flashcards for this topic. Please try being more specific.");
        } else {
          setCards(flashcardData);
        }
      } else if (options.generationMode === GenerationMode.NOTES) {
        const notesData = generatedContent as string;
        if (!notesData || notesData.trim().length === 0) {
          setError("The AI couldn't generate study notes for this topic. Please try being more specific.");
        } else {
          setNotes(notesData);
        }
      } else if (options.generationMode === GenerationMode.QUIZ) {
        const quizData = generatedContent as QuizQuestion[];
        if (quizData.length === 0) {
          setError("The AI couldn't generate quiz questions for this topic. Please try being more specific.");
        } else {
          setQuizQuestions(quizData);
        }
      }
    } catch (e: any) {
      console.error('Content generation error:', e);
      
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
        setError('An error occurred while generating content. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateNew = useCallback(() => {
    setCards(null);
    setNotes(null);
    setQuizQuestions(null);
    setError(null);
    setIsLoading(false);
    setCurrentOptions(null);
    setCurrentCardIndex(0);
    
    // Clear session data when intentionally creating new content
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const handleToggleSavedSets = useCallback(() => {
    setShowSavedSets(prev => !prev);
  }, []);

  const handleLoadSavedSet = useCallback((set: SavedFlashcardSet) => {
    setCards(set.cards);
    setCurrentCardIndex(0); // Reset to first card when loading a saved set
    setCurrentOptions({
      language: set.language,
      count: set.count,
      level: 'intermediate', // Default level as it's not stored
      generationMode: GenerationMode.FLASHCARDS // Saved sets are always flashcards for now
    });
    setShowSavedSets(false);
    
    // Save loaded set to session storage
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        savedCards: set.cards,
        savedOptions: {
          language: set.language,
          count: set.count,
          level: 'intermediate',
          generationMode: GenerationMode.FLASHCARDS
        },
        cardIndex: 0 // Start from the first card
      }));
    } catch (error) {
      console.error('Error saving loaded set to session:', error);
    }
    
    // Track loading of saved set
    if (window.trackUserEngagement) {
      window.trackUserEngagement('saved_set_loaded', set.name);
    }
  }, []);

  // Track card index changes from the FlashcardView component
  const handleCardIndexChange = useCallback((index: number) => {
    setCurrentCardIndex(index);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center flex-1 min-h-[60vh]">
          <div className="relative">
            <Loader />
          </div>
          <div className="mt-8 space-y-3">
            <h2 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">
              Crafting your study material
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-light max-w-md mx-auto leading-relaxed">
              Our AI is analyzing your content and creating personalized study materials for optimal learning.
            </p>
          </div>
        </div>
      );
    }

    // Render based on the current generation mode
    if (currentOptions?.generationMode === GenerationMode.FLASHCARDS && cards) {
      return <FlashcardView 
        cards={cards} 
        onCreateNew={handleCreateNew} 
        options={currentOptions ? {
          language: currentOptions.language,
          count: currentOptions.count
        } : undefined}
        initialCardIndex={currentCardIndex}
        onCardIndexChange={handleCardIndexChange}
      />;
    } else if (currentOptions?.generationMode === GenerationMode.NOTES && notes) {
      return <NotesView 
        content={notes} 
        onCreateNew={handleCreateNew} 
        options={currentOptions ? {
          language: currentOptions.language
        } : undefined}
      />;
    } else if (currentOptions?.generationMode === GenerationMode.QUIZ && quizQuestions) {
      return <QuizView 
        questions={quizQuestions} 
        onCreateNew={handleCreateNew} 
      />;
    }

    return <CreationView onCreate={handleCreateContent} error={error} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white transition-all duration-300">
      {/* Background texture */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100/20 via-transparent to-slate-200/20 dark:from-slate-700/10 dark:via-transparent dark:to-slate-800/10"></div>
      
      <div className="relative min-h-screen flex flex-col">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col flex-1 max-w-7xl">
          <Header 
            theme={theme}
            onThemeToggle={handleThemeToggle}
            showBackButton={!!cards || !!notes || !!quizQuestions}
            onBackClick={cards || notes || quizQuestions ? handleCreateNew : undefined}
            onShowSavedSets={handleToggleSavedSets}
          />
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {showSavedSets && (
        <SavedSets
          onLoadSet={handleLoadSavedSet}
          onClose={() => setShowSavedSets(false)}
        />
      )}
    </div>
  );
};

export default App;