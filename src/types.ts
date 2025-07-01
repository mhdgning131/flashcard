export interface FlashcardData {
    term: string;
    definition: string;
  }
  
  export interface FlashcardOptions {
    language: string;
    count: number;
  }
  
  export interface StudyStats {
    totalCardsStudied: number;
    totalCorrectAnswers: number;
    currentStreak: number;
    studyTime: number; // in seconds
    favoriteCards: number;
  }
  
  export type ThemeMode = 'light' | 'dark';
  
  export interface AppSettings {
    theme: ThemeMode;
  }
  
  export enum InputMode {
    DESCRIBE = 'Describe Topic',
    PASTE = 'Paste Text',
    UPLOAD = 'Upload File',
  }
  
  export const SUPPORTED_LANGUAGES = [
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
  
  export const FLASHCARD_COUNT_OPTIONS = [5, 8, 10, 12, 15, 20];
