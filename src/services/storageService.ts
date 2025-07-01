import { AppSettings, StudyStats, ThemeMode } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'flashcards_settings',
  STATS: 'flashcards_stats',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
};

const DEFAULT_STATS: StudyStats = {
  totalCardsStudied: 0,
  totalCorrectAnswers: 0,
  currentStreak: 0,
  studyTime: 0,
  favoriteCards: 0,
};

export class StorageService {
  static getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } else {
        // If no stored settings, detect system preference
        const systemPrefersDark = typeof window !== 'undefined' && 
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        return { theme: systemPrefersDark ? 'dark' : 'light' };
      }
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static updateTheme(theme: ThemeMode): void {
    const settings = this.getSettings();
    this.saveSettings({ ...settings, theme });
  }

  static getStats(): StudyStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  }

  static saveStats(stats: StudyStats): void {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  static updateStats(correct: boolean): void {
    const stats = this.getStats();
    const updatedStats = {
      ...stats,
      totalCardsStudied: stats.totalCardsStudied + 1,
      totalCorrectAnswers: correct ? stats.totalCorrectAnswers + 1 : stats.totalCorrectAnswers,
      currentStreak: correct ? stats.currentStreak + 1 : 0,
    };
    this.saveStats(updatedStats);
  }
}