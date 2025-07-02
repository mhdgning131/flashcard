import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SavedFlashcardSet } from '../types';
import { StorageService } from '../services/storageService';

interface SavedSetsProps {
  onLoadSet: (set: SavedFlashcardSet) => void;
  onClose: () => void;
}

// Enhanced interfaces for the new functionality
interface LoadingState {
  isLoading: boolean;
  operation?: string;
}

interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

interface SearchState {
  query: string;
  language: string;
  sortBy: 'name' | 'createdAt' | 'cardCount';
  sortOrder: 'asc' | 'desc';
}

interface BulkOperations {
  selectedIds: Set<string>;
  showBulkActions: boolean;
}

// Toast notification component
const Toast: React.FC<{ 
  message: string; 
  type: 'success' | 'error' | 'info'; 
  onClose: () => void 
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-[60] max-w-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const SavedSets: React.FC<SavedSetsProps> = ({ onLoadSet, onClose }) => {
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });
  const [error, setError] = useState<ErrorState>({ hasError: false });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Search and filter state
  const [search, setSearch] = useState<SearchState>({
    query: '',
    language: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Bulk operations state
  const [bulk, setBulk] = useState<BulkOperations>({
    selectedIds: new Set(),
    showBulkActions: false
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError({ hasError: false });
  }, []);

  // Load saved sets with enhanced error handling
  const loadSavedSets = useCallback(async () => {
    setLoading({ isLoading: true, operation: 'Loading saved sets...' });
    setError({ hasError: false });
    
    try {
      // Use the new search functionality
      const result = StorageService.searchFlashcardSets({
        query: search.query,
        language: search.language || undefined,
        sortBy: search.sortBy,
        sortOrder: search.sortOrder
      });
      
      if (result.success) {
        setSavedSets(result.data!);
      } else {
        throw new Error(result.error || 'Failed to load saved sets');
      }
    } catch (err) {
      console.error('Error loading saved sets:', err);
      setError({
        hasError: true,
        message: err instanceof Error ? err.message : 'Failed to load saved sets',
        code: 'LOAD_ERROR'
      });
      setSavedSets([]);
    } finally {
      setLoading({ isLoading: false });
    }
  }, [search]);

  // Handle deleting a single set
  const handleDelete = useCallback(async (id: string) => {
    if (deleteConfirm === id) {
      setLoading({ isLoading: true, operation: 'Deleting set...' });
      
      try {
        const result = StorageService.deleteFlashcardSet(id);
        
        if (result.success && result.data) {
          setSavedSets(prev => prev.filter(set => set.id !== id));
          setDeleteConfirm(null);
          showToast('Set deleted successfully', 'success');
          
          // Track deletion event
          if (window.trackUserEngagement) {
            window.trackUserEngagement('flashcard_set_deleted', id);
          }
        } else {
          throw new Error(result.error || 'Failed to delete set');
        }
      } catch (err) {
        console.error('Error deleting set:', err);
        const message = err instanceof Error ? err.message : 'Failed to delete set';
        setError({ hasError: true, message, code: 'DELETE_ERROR' });
        showToast(message, 'error');
      } finally {
        setLoading({ isLoading: false });
      }
    } else {
      setDeleteConfirm(id);
    }
  }, [deleteConfirm, showToast]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Array.from(bulk.selectedIds);
    if (selectedIds.length === 0) return;

    setLoading({ isLoading: true, operation: `Deleting ${selectedIds.length} sets...` });
    
    try {
      const result = StorageService.bulkDeleteFlashcardSets(selectedIds);
      
      if (result.success) {
        const deletedCount = result.data!;
        setSavedSets(prev => prev.filter(set => !selectedIds.includes(set.id)));
        setBulk({ selectedIds: new Set(), showBulkActions: false });
        showToast(`${deletedCount} sets deleted successfully`, 'success');
      } else {
        throw new Error(result.error || 'Failed to delete sets');
      }
    } catch (err) {
      console.error('Error in bulk delete:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete sets';
      setError({ hasError: true, message, code: 'BULK_DELETE_ERROR' });
      showToast(message, 'error');
    } finally {
      setLoading({ isLoading: false });
    }
  }, [bulk.selectedIds, showToast]);

  // Handle export
  const handleExport = useCallback(async () => {
    const selectedIds = Array.from(bulk.selectedIds);
    
    setLoading({ isLoading: true, operation: 'Exporting sets...' });
    
    try {
      const result = StorageService.exportFlashcardSets(selectedIds.length > 0 ? selectedIds : undefined);
      
      if (result.success) {
        const blob = new Blob([result.data!], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcard-sets-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const count = selectedIds.length > 0 ? selectedIds.length : savedSets.length;
        showToast(`${count} sets exported successfully`, 'success');
      } else {
        throw new Error(result.error || 'Failed to export sets');
      }
    } catch (err) {
      console.error('Error exporting sets:', err);
      const message = err instanceof Error ? err.message : 'Failed to export sets';
      setError({ hasError: true, message, code: 'EXPORT_ERROR' });
      showToast(message, 'error');
    } finally {
      setLoading({ isLoading: false });
    }
  }, [bulk.selectedIds, savedSets.length, showToast]);

  // Toggle set selection for bulk operations
  const toggleSetSelection = useCallback((id: string) => {
    setBulk(prev => {
      const newSelectedIds = new Set(prev.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      
      return {
        selectedIds: newSelectedIds,
        showBulkActions: newSelectedIds.size > 0
      };
    });
  }, []);

  // Select all/none
  const handleSelectAll = useCallback(() => {
    setBulk(prev => {
      const allSelected = prev.selectedIds.size === savedSets.length;
      const newSelectedIds = allSelected ? new Set<string>() : new Set(savedSets.map(set => set.id));
      
      return {
        selectedIds: newSelectedIds,
        showBulkActions: newSelectedIds.size > 0
      };
    });
  }, [savedSets]);

  // Filtered and sorted sets
  const filteredSets = useMemo(() => {
    return savedSets; // Already filtered by the search functionality in loadSavedSets
  }, [savedSets]);

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Load sets when search parameters change
  useEffect(() => {
    loadSavedSets();
  }, [loadSavedSets]);

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

  // Error and toast handling UI
  if (error.hasError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Error Loading Saved Sets</h2>
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
          
          <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-xl font-medium text-red-600 dark:text-red-400 mb-2">An error occurred</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {error.message || 'Failed to load saved flashcard sets. Please try again later.'}
              </p>
              <button
                onClick={() => {
                  clearError();
                  loadSavedSets();
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors mr-2"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-800 dark:text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        tabIndex={-1} // Make modal focusable but not in tab order
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Header with title and close button */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Your Saved Flashcard Sets</h2>
            {savedSets.length > 0 && (
              <span className="ml-3 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-full">
                {savedSets.length} sets
              </span>
            )}
          </div>
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

        {/* Search and Filter Controls */}
        {savedSets.length > 0 && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search sets by name or content..."
                    value={search.query}
                    onChange={(e) => setSearch(prev => ({ ...prev, query: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {search.query && (
                    <button
                      onClick={() => setSearch(prev => ({ ...prev, query: '' }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Language Filter */}
              <div className="min-w-[160px]">
                <select
                  value={search.language}
                  onChange={(e) => setSearch(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Languages</option>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {/* Sort Controls */}
              <div className="flex gap-2">
                <select
                  value={search.sortBy}
                  onChange={(e) => setSearch(prev => ({ ...prev, sortBy: e.target.value as 'name' | 'createdAt' | 'cardCount' }))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="name">Name</option>
                  <option value="cardCount">Card Count</option>
                </select>
                
                <button
                  onClick={() => setSearch(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  title={`Sort ${search.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  <svg className={`w-4 h-4 transition-transform ${search.sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulk.showBulkActions && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {bulk.selectedIds.size} set{bulk.selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setBulk({ selectedIds: new Set(), showBulkActions: false })}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      disabled={loading.isLoading}
                      className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Export Selected
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={loading.isLoading}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {loading.isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {loading.operation || 'Loading...'}
              </p>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">
                {search.query || search.language ? 'No Matching Sets' : 'No Saved Sets'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                {search.query || search.language 
                  ? 'No sets match your current search criteria. Try adjusting your filters.'
                  : 'After creating a flashcard set, use the "Save Set" button to save it for later study sessions.'
                }
              </p>
              {(search.query || search.language) && (
                <button
                  onClick={() => setSearch({ query: '', language: '', sortBy: 'createdAt', sortOrder: 'desc' })}
                  className="mt-4 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Select All Checkbox */}
              {filteredSets.length > 1 && (
                <div className="mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulk.selectedIds.size === filteredSets.length}
                      onChange={handleSelectAll}
                      className="mr-2 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Select all ({filteredSets.length} sets)
                    </span>
                  </label>
                </div>
              )}

              {/* Sets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSets.map(set => (
                  <div 
                    key={set.id}
                    className={`bg-slate-50 dark:bg-slate-700/50 border rounded-xl p-4 hover:shadow-md transition-all group ${
                      bulk.selectedIds.has(set.id) 
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start flex-1">
                        <input
                          type="checkbox"
                          checked={bulk.selectedIds.has(set.id)}
                          onChange={() => toggleSetSelection(set.id)}
                          className="mr-3 mt-1 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white truncate">
                            {set.name}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => handleDelete(set.id)}
                          disabled={loading.isLoading}
                          className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
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
                    
                    {/* Set Metadata */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span>{set.cards.length} Cards</span>
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          <span>
                            {SUPPORTED_LANGUAGES.find(lang => lang.code === set.language)?.name || set.language}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatDate(set.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Study Button */}
                    <button
                      onClick={() => onLoadSet(set)}
                      disabled={loading.isLoading}
                      className="w-full py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Study This Set
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={loading.isLoading || filteredSets.length === 0}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors disabled:opacity-50"
            >
              Export All
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-800 dark:text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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