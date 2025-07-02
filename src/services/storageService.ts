import { AppSettings, StudyStats, ThemeMode, FlashcardData, SavedFlashcardSet, GenerationMode, InputMode } from '../types';

interface SavedNote {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  language: string;
}

// Enhanced database-like interfaces
interface DatabaseMetadata {
  version: string;
  lastBackup: number;
  totalSets: number;
  totalCards: number;
  lastAccessed: number;
}

interface StorageOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface SearchOptions {
  query?: string;
  language?: string;
  sortBy?: 'name' | 'createdAt' | 'cardCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

const STORAGE_KEYS = {
  SETTINGS: 'flashcards_settings',
  STATS: 'flashcards_stats',
  SAVED_SETS: 'flashcards_saved_sets',
  SAVED_NOTES: 'flashcards_saved_notes',
  DATABASE_META: 'flashcards_db_meta',
};

const DATABASE_VERSION = '1.0.0';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

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

const DEFAULT_METADATA: DatabaseMetadata = {
  version: DATABASE_VERSION,
  lastBackup: 0,
  totalSets: 0,
  totalCards: 0,
  lastAccessed: Date.now(),
};

export class StorageService {
  // Database initialization and metadata management
  private static initializeDatabase(): void {
    try {
      const metadata = this.getDatabaseMetadata();
      if (!metadata || metadata.version !== DATABASE_VERSION) {
        this.migrateDatabaseIfNeeded(metadata?.version);
        this.updateDatabaseMetadata();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private static getDatabaseMetadata(): DatabaseMetadata | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DATABASE_META);
      return stored ? { ...DEFAULT_METADATA, ...JSON.parse(stored) } : null;
    } catch {
      return null;
    }
  }

  private static updateDatabaseMetadata(updates?: Partial<DatabaseMetadata>): void {
    try {
      const currentMeta = this.getDatabaseMetadata() || DEFAULT_METADATA;
      const sets = this.getSavedFlashcardSets();
      const totalCards = sets.reduce((sum, set) => sum + set.cards.length, 0);
      
      const newMeta: DatabaseMetadata = {
        ...currentMeta,
        totalSets: sets.length,
        totalCards,
        lastAccessed: Date.now(),
        ...updates,
      };
      
      localStorage.setItem(STORAGE_KEYS.DATABASE_META, JSON.stringify(newMeta));
    } catch (error) {
      console.error('Failed to update database metadata:', error);
    }
  }

  private static migrateDatabaseIfNeeded(currentVersion?: string): void {
    try {
      // Handle future database migrations
      if (!currentVersion) {
        // First time setup - validate existing data
        this.validateAndCleanupData();
      }
      // Add migration logic for future versions here
    } catch (error) {
      console.error('Database migration failed:', error);
    }
  }

  private static validateAndCleanupData(): void {
    try {
      // Validate and cleanup existing flashcard sets
      const sets = this.getSavedFlashcardSets();
      const validSets = sets.filter(set => this.validateFlashcardSet(set).isValid);
      
      if (validSets.length !== sets.length) {
        localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(validSets));
        console.log(`Cleaned up ${sets.length - validSets.length} invalid flashcard sets`);
      }
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }

  // Enhanced validation methods
  private static validateFlashcardSet(set: any): ValidationResult {
    const errors: string[] = [];
    
    if (!set || typeof set !== 'object') {
      errors.push('Set must be an object');
      return { isValid: false, errors };
    }
    
    if (!set.id || typeof set.id !== 'string') {
      errors.push('Set must have a valid ID');
    }
    
    if (!set.name || typeof set.name !== 'string' || set.name.trim().length === 0) {
      errors.push('Set must have a valid name');
    }
    
    if (!Array.isArray(set.cards)) {
      errors.push('Set must have a cards array');
    } else {
      set.cards.forEach((card: any, index: number) => {
        if (!card || typeof card !== 'object') {
          errors.push(`Card ${index} must be an object`);
        } else {
          if (!card.term || typeof card.term !== 'string' || card.term.trim().length === 0) {
            errors.push(`Card ${index} must have a valid term`);
          }
          if (!card.definition || typeof card.definition !== 'string' || card.definition.trim().length === 0) {
            errors.push(`Card ${index} must have a valid definition`);
          }
        }
      });
    }
    
    if (typeof set.createdAt !== 'number' || set.createdAt <= 0) {
      errors.push('Set must have a valid creation timestamp');
    }
    
    if (!set.language || typeof set.language !== 'string') {
      errors.push('Set must have a valid language');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // Storage quota management
  private static checkStorageQuota(): StorageOperationResult<number> {
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (key.startsWith('flashcards_')) {
          totalSize += localStorage.getItem(key)?.length || 0;
        }
      }
      
      return {
        success: true,
        data: totalSize,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check storage quota',
        code: 'QUOTA_CHECK_FAILED',
      };
    }
  }

  private static isStorageAvailable(additionalSize: number = 0): boolean {
    const quotaResult = this.checkStorageQuota();
    return quotaResult.success && (quotaResult.data! + additionalSize) < MAX_STORAGE_SIZE;
  }

  // Safe storage operations with error handling
  private static safeStorageOperation<T>(operation: () => T, errorMessage: string): StorageOperationResult<T> {
    try {
      const result = operation();
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          return {
            success: false,
            error: 'Storage quota exceeded. Please delete some saved sets to free up space.',
            code: 'QUOTA_EXCEEDED',
          };
        }
        return {
          success: false,
          error: `${errorMessage}: ${error.message}`,
          code: 'OPERATION_FAILED',
        };
      }
      return {
        success: false,
        error: errorMessage,
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  // Enhanced flashcard set operations
  static getSavedFlashcardSets(): SavedFlashcardSet[] {
    this.initializeDatabase();
    
    const result = this.safeStorageOperation(
      () => {
        const stored = localStorage.getItem(STORAGE_KEYS.SAVED_SETS);
        const sets = stored ? JSON.parse(stored) : [];
        
        // Validate each flashcard set
        return sets.filter((set: any) => this.validateFlashcardSet(set).isValid);
      },
      'Failed to retrieve flashcard sets'
    );
    
    return result.success ? result.data! : [];
  }

  static searchFlashcardSets(options: SearchOptions = {}): StorageOperationResult<SavedFlashcardSet[]> {
    const result = this.safeStorageOperation(
      () => {
        let sets = this.getSavedFlashcardSets();
        
        // Apply search filter
        if (options.query) {
          const query = options.query.toLowerCase();
          sets = sets.filter(set => 
            set.name.toLowerCase().includes(query) ||
            set.cards.some(card => 
              card.term.toLowerCase().includes(query) ||
              card.definition.toLowerCase().includes(query)
            )
          );
        }
        
        // Apply language filter
        if (options.language) {
          sets = sets.filter(set => set.language === options.language);
        }
        
        // Apply sorting
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder || 'desc';
        
        sets.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (sortBy) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'cardCount':
              aValue = a.cards.length;
              bValue = b.cards.length;
              break;
            case 'createdAt':
            default:
              aValue = a.createdAt;
              bValue = b.createdAt;
              break;
          }
          
          const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        // Apply pagination
        if (options.offset || options.limit) {
          const start = options.offset || 0;
          const end = options.limit ? start + options.limit : undefined;
          sets = sets.slice(start, end);
        }
        
        return sets;
      },
      'Failed to search flashcard sets'
    );
    
    return result;
  }

  static saveFlashcardSet(name: string, cards: FlashcardData[], language: string, count: number, originalPrompt?: string, inputMode?: InputMode): StorageOperationResult<SavedFlashcardSet> {
    // Input validation
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Set name cannot be empty', code: 'INVALID_NAME' };
    }
    
    if (!Array.isArray(cards) || cards.length === 0) {
      return { success: false, error: 'Cards array cannot be empty', code: 'INVALID_CARDS' };
    }
    
    if (!language || language.trim().length === 0) {
      return { success: false, error: 'Language cannot be empty', code: 'INVALID_LANGUAGE' };
    }
    
    // Check for duplicate names
    const existingSets = this.getSavedFlashcardSets();
    const trimmedName = name.trim();
    
    if (existingSets.some(set => set.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: 'A set with this name already exists', code: 'DUPLICATE_NAME' };
    }
    
    // Create new set
    const newSet: SavedFlashcardSet = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: trimmedName,
      cards: cards.map(card => ({
        term: card.term.trim(),
        definition: card.definition.trim(),
      })),
      createdAt: Date.now(),
      language: language.trim(),
      count,
      // Sauvegarder le prompt original et le mode d'entrée
      originalPrompt: originalPrompt?.trim(),
      inputMode
    };
    
    // Validate the new set
    const validation = this.validateFlashcardSet(newSet);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Invalid flashcard set: ${validation.errors.join(', ')}`, 
        code: 'VALIDATION_FAILED' 
      };
    }
    
    return this.safeStorageOperation(
      () => {
        // Check storage quota before saving
        const setSize = JSON.stringify(newSet).length;
        if (!this.isStorageAvailable(setSize)) {
          throw new Error('Not enough storage space available');
        }
        
        const sets = existingSets;
        sets.unshift(newSet);
        
        localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(sets));
        this.updateDatabaseMetadata();
        
        return newSet;
      },
      'Failed to save flashcard set'
    );
  }

  // Enhanced flashcard set operations with better error handling
  static getFlashcardSet(id: string): StorageOperationResult<SavedFlashcardSet | null> {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid ID provided', code: 'INVALID_ID' };
    }
    
    return this.safeStorageOperation(
      () => {
        const sets = this.getSavedFlashcardSets();
        return sets.find(set => set.id === id) || null;
      },
      'Failed to retrieve flashcard set'
    );
  }

  static deleteFlashcardSet(id: string): StorageOperationResult<boolean> {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid ID provided', code: 'INVALID_ID' };
    }
    
    return this.safeStorageOperation(
      () => {
        const sets = this.getSavedFlashcardSets();
        const newSets = sets.filter(set => set.id !== id);
        
        if (newSets.length !== sets.length) {
          localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(newSets));
          this.updateDatabaseMetadata();
          return true;
        }
        
        return false;
      },
      'Failed to delete flashcard set'
    );
  }

  static updateFlashcardSet(id: string, updates: Partial<SavedFlashcardSet>): StorageOperationResult<SavedFlashcardSet> {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid ID provided', code: 'INVALID_ID' };
    }
    
    return this.safeStorageOperation(
      () => {
        const sets = this.getSavedFlashcardSets();
        const setIndex = sets.findIndex(set => set.id === id);
        
        if (setIndex === -1) {
          throw new Error('Flashcard set not found');
        }
        
        const existingSet = sets[setIndex];
        const updatedSet = { ...existingSet, ...updates, id }; // Prevent ID changes
        
        // Validate the updated set
        const validation = this.validateFlashcardSet(updatedSet);
        if (!validation.isValid) {
          throw new Error(`Invalid update: ${validation.errors.join(', ')}`);
        }
        
        sets[setIndex] = updatedSet;
        localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(sets));
        this.updateDatabaseMetadata();
        
        return updatedSet;
      },
      'Failed to update flashcard set'
    );
  }

  static bulkDeleteFlashcardSets(ids: string[]): StorageOperationResult<number> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: 'Invalid IDs array provided', code: 'INVALID_IDS' };
    }
    
    return this.safeStorageOperation(
      () => {
        const sets = this.getSavedFlashcardSets();
        const newSets = sets.filter(set => !ids.includes(set.id));
        const deletedCount = sets.length - newSets.length;
        
        if (deletedCount > 0) {
          localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(newSets));
          this.updateDatabaseMetadata();
        }
        
        return deletedCount;
      },
      'Failed to bulk delete flashcard sets'
    );
  }

  // Export/Import functionality
  static exportFlashcardSets(ids?: string[]): StorageOperationResult<string> {
    return this.safeStorageOperation(
      () => {
        const sets = this.getSavedFlashcardSets();
        const setsToExport = ids ? sets.filter(set => ids.includes(set.id)) : sets;
        
        const exportData = {
          version: DATABASE_VERSION,
          exportedAt: Date.now(),
          sets: setsToExport,
          metadata: {
            totalSets: setsToExport.length,
            totalCards: setsToExport.reduce((sum, set) => sum + set.cards.length, 0),
          }
        };
        
        return JSON.stringify(exportData, null, 2);
      },
      'Failed to export flashcard sets'
    );
  }

  static importFlashcardSets(importData: string, options: { overwrite?: boolean } = {}): StorageOperationResult<{ imported: number; skipped: number; errors: string[] }> {
    return this.safeStorageOperation(
      () => {
        const data = JSON.parse(importData);
        const existingSets = this.getSavedFlashcardSets();
        const existingNames = new Set(existingSets.map(set => set.name.toLowerCase()));
        
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        
        if (!Array.isArray(data.sets)) {
          throw new Error('Invalid import data format');
        }
        
        const validSets: SavedFlashcardSet[] = [];
        
        for (const set of data.sets) {
          // Validate each set
          const validation = this.validateFlashcardSet(set);
          if (!validation.isValid) {
            errors.push(`Invalid set "${set.name || 'Unknown'}": ${validation.errors.join(', ')}`);
            continue;
          }
          
          // Check for name conflicts
          if (existingNames.has(set.name.toLowerCase())) {
            if (options.overwrite) {
              // Remove existing set with same name
              const existingIndex = existingSets.findIndex(existing => 
                existing.name.toLowerCase() === set.name.toLowerCase()
              );
              if (existingIndex !== -1) {
                existingSets.splice(existingIndex, 1);
              }
            } else {
              skipped++;
              continue;
            }
          }
          
          // Generate new ID for imported set
          const importedSet: SavedFlashcardSet = {
            ...set,
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            createdAt: Date.now(),
          };
          
          validSets.push(importedSet);
          existingNames.add(importedSet.name.toLowerCase());
          imported++;
        }
        
        if (validSets.length > 0) {
          const allSets = [...validSets, ...existingSets];
          localStorage.setItem(STORAGE_KEYS.SAVED_SETS, JSON.stringify(allSets));
          this.updateDatabaseMetadata();
        }
        
        return { imported, skipped, errors };
      },
      'Failed to import flashcard sets'
    );
  }

  // Backward compatibility methods (return simple values like before)
  static getFlashcardSetLegacy(id: string): SavedFlashcardSet | null {
    const result = this.getFlashcardSet(id);
    return result.success ? result.data! : null;
  }

  static deleteFlashcardSetLegacy(id: string): boolean {
    const result = this.deleteFlashcardSet(id);
    return result.success ? result.data! : false;
  }

  static saveFlashcardSetLegacy(name: string, cards: FlashcardData[], language: string, count: number, originalPrompt?: string, inputMode?: InputMode): SavedFlashcardSet {
    const result = this.saveFlashcardSet(name, cards, language, count, originalPrompt, inputMode);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save flashcard set');
    }
    return result.data!;
  }

  // Settings with enhanced error handling
  static getSettings(): AppSettings {
    const result = this.safeStorageOperation(
      () => {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } else {
          // If no stored settings, detect system preference
          const systemPrefersDark = typeof window !== 'undefined' && 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
          return { theme: systemPrefersDark ? 'dark' : 'light' };
        }
      },
      'Failed to retrieve settings'
    );
    
    return result.success ? result.data! : DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): StorageOperationResult<void> {
    return this.safeStorageOperation(
      () => {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      },
      'Failed to save settings'
    );
  }

  static updateTheme(theme: ThemeMode): StorageOperationResult<void> {
    return this.safeStorageOperation(
      () => {
        const settings = this.getSettings();
        const result = this.saveSettings({ ...settings, theme });
        if (!result.success) {
          throw new Error(result.error);
        }
      },
      'Failed to update theme'
    );
  }

  // Stats with enhanced error handling
  static getStats(): StudyStats {
    const result = this.safeStorageOperation(
      () => {
        const stored = localStorage.getItem(STORAGE_KEYS.STATS);
        return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : DEFAULT_STATS;
      },
      'Failed to retrieve stats'
    );
    
    return result.success ? result.data! : DEFAULT_STATS;
  }

  static saveStats(stats: StudyStats): StorageOperationResult<void> {
    return this.safeStorageOperation(
      () => {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      },
      'Failed to save stats'
    );
  }

  static updateStats(correct: boolean): StorageOperationResult<void> {
    return this.safeStorageOperation(
      () => {
        const stats = this.getStats();
        const updatedStats = {
          ...stats,
          totalCardsStudied: stats.totalCardsStudied + 1,
          totalCorrectAnswers: correct ? stats.totalCorrectAnswers + 1 : stats.totalCorrectAnswers,
          currentStreak: correct ? stats.currentStreak + 1 : 0,
        };
        const result = this.saveStats(updatedStats);
        if (!result.success) {
          throw new Error(result.error);
        }
      },
      'Failed to update stats'
    );
  }

  // Database utility methods
  static getDatabaseInfo(): StorageOperationResult<{
    metadata: DatabaseMetadata;
    storageUsage: number;
    totalSets: number;
    totalCards: number;
  }> {
    return this.safeStorageOperation(
      () => {
        const metadata = this.getDatabaseMetadata() || DEFAULT_METADATA;
        const quotaResult = this.checkStorageQuota();
        const sets = this.getSavedFlashcardSets();
        
        return {
          metadata,
          storageUsage: quotaResult.success ? quotaResult.data! : 0,
          totalSets: sets.length,
          totalCards: sets.reduce((sum, set) => sum + set.cards.length, 0),
        };
      },
      'Failed to get database info'
    );
  }

  static clearAllData(): StorageOperationResult<void> {
    return this.safeStorageOperation(
      () => {
        // Remove all flashcard-related data
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Reinitialize database
        this.initializeDatabase();
      },
      'Failed to clear all data'
    );
  }

  // Notes functionality (keeping original interface for compatibility)
  static getSavedNotes(): SavedNote[] {
    const result = this.safeStorageOperation(
      () => {
        const stored = localStorage.getItem(STORAGE_KEYS.SAVED_NOTES);
        return stored ? JSON.parse(stored) : [];
      },
      'Failed to retrieve notes'
    );
    
    return result.success ? result.data! : [];
  }

  static saveNotes(name: string, content: string, language: string): SavedNote {
    const result = this.safeStorageOperation(
      () => {
        const notes = this.getSavedNotes();
        
        // Create new note with unique ID
        const newNote: SavedNote = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          name,
          content,
          createdAt: Date.now(),
          language
        };
        
        // Add to beginning of array (newest first)
        notes.unshift(newNote);
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.SAVED_NOTES, JSON.stringify(notes));
        
        return newNote;
      },
      'Failed to save note'
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save note');
    }
    
    return result.data!;
  }

  static getNote(id: string): SavedNote | null {
    const result = this.safeStorageOperation(
      () => {
        const notes = this.getSavedNotes();
        return notes.find(note => note.id === id) || null;
      },
      'Failed to retrieve note'
    );
    
    return result.success ? result.data! : null;
  }

  static deleteNote(id: string): boolean {
    const result = this.safeStorageOperation(
      () => {
        const notes = this.getSavedNotes();
        const newNotes = notes.filter(note => note.id !== id);
        
        if (newNotes.length !== notes.length) {
          localStorage.setItem(STORAGE_KEYS.SAVED_NOTES, JSON.stringify(newNotes));
          return true;
        }
        
        return false;
      },
      'Failed to delete note'
    );
    
    return result.success ? result.data! : false;
  }
}