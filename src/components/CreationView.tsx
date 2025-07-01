import React, { useState, useCallback } from 'react';
import { InputMode, FlashcardOptions, SUPPORTED_LANGUAGES, FLASHCARD_COUNT_OPTIONS } from '../types';
import { validateContent, sanitizeContent, truncateContent, processUploadedFile, validateUploadedFile } from '../utils/sanitization';

// Extend the Window interface to include the trackFlashcardEvent function
declare global {
  interface Window {
    trackFlashcardEvent?: (action: string, count: number, language: string, mode: InputMode) => void;
  }
}

interface CreationViewProps {
  onCreate: (context: string, options: FlashcardOptions) => void;
  error: string | null;
}

// Intelligent Segmented Control with professional design
const SegmentedControl: React.FC<{
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}> = ({ activeMode, onModeChange }) => {
  const modes = [
    { 
      key: InputMode.DESCRIBE, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ), 
      label: 'Describe', 
      fullLabel: 'Describe Topic',
      description: 'Tell us what you want to learn'
    },
    { 
      key: InputMode.PASTE, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ), 
      label: 'Paste', 
      fullLabel: 'Paste Text',
      description: 'Import your study material'
    },
    { 
      key: InputMode.UPLOAD, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ), 
      label: 'Upload', 
      fullLabel: 'Upload File',
      description: 'Drop your documents here'
    }
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center justify-center mb-6 w-full max-w-md mx-auto border border-slate-200 dark:border-slate-700">
      {modes.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onModeChange(mode.key)}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 px-3 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
            activeMode === mode.key
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title={mode.description}
        >
          {mode.icon}
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

// Intelligent Collapsible Options Panel
const CollapsibleOptionsPanel: React.FC<{
  options: FlashcardOptions;
  onOptionsChange: (options: FlashcardOptions) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}> = ({ options, onOptionsChange, isCollapsed, onToggle }) => {
  const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === options.language);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm mb-6 overflow-hidden">
      {/* Quick Preview Bar */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200" 
        onClick={onToggle}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-slate-600 dark:bg-slate-500 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedLanguage?.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Language
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-slate-600 dark:bg-slate-500 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {options.count} cards
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Study set size
              </div>
            </div>
          </div>
        </div>
        
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600">
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Options */}
      <div className={`transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
        <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Language
              </label>
              <select
                value={options.language}
                onChange={(e) => onOptionsChange({ ...options, language: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Count Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Number of Cards
              </label>
              <select
                value={options.count}
                onChange={(e) => onOptionsChange({ ...options, count: parseInt(e.target.value) })}
                className="w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
              >
                {FLASHCARD_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count} cards
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Professional recommendation panel */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-md p-3 border border-slate-200 dark:border-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-slate-600 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                  Recommendation
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  For optimal learning, we recommend 10-15 cards per session. You can always generate more later.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Smart Text Area with intelligent features
const SmartTextArea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mode: InputMode;
}> = ({ value, onChange, placeholder, mode }) => {
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const maxChars = 50000;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const truncated = truncateContent(newValue, maxChars);
    onChange(truncated);
    setCharCount(truncated.length);
  };

  const getSmartPlaceholder = () => {
    const examples = {
      [InputMode.DESCRIBE]: "Example: Advanced calculus concepts including derivatives, integrals, and their real-world applications in physics and engineering",
      [InputMode.PASTE]: "Paste your study material here - articles, lecture notes, textbook chapters, or any educational content you'd like to turn into flashcards",
      [InputMode.UPLOAD]: placeholder
    };
    return examples[mode];
  };

  const getCharacterProgress = () => {
    const percentage = (charCount / maxChars) * 100;
    let colorClass = 'text-green-500';
    if (percentage > 80) colorClass = 'text-orange-500';
    if (percentage > 95) colorClass = 'text-red-500';
    return { percentage, colorClass };
  };

  const { percentage, colorClass } = getCharacterProgress();

  return (
    <div className="relative flex-1 flex flex-col bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={getSmartPlaceholder()}
          className="w-full h-full bg-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none p-6 text-base leading-relaxed"
          maxLength={maxChars}
        />
        
        {/* Focus ring */}
        {isFocused && (
          <div className="absolute inset-0 rounded-2xl ring-2 ring-indigo-500 ring-opacity-50 pointer-events-none" />
        )}
      </div>
      
      {/* Enhanced character counter with progress bar */}
      <div className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-700/50 border-t border-slate-200/50 dark:border-slate-600/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                percentage > 95 ? 'bg-red-500' : percentage > 80 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${colorClass}`}>
            {charCount.toLocaleString()} / {maxChars.toLocaleString()}
          </span>
        </div>
        
        {charCount > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ≈ {Math.ceil(charCount / 250)} minutes to read
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced File Upload Component with actual processing
const IntelligentFileUpload: React.FC<{
  onFileSelect: (file: File) => void;
  onTextExtracted: (text: string) => void;
  error: string | null;
}> = ({ onFileSelect, onTextExtracted, error }) => {
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleFileProcess = async (file: File) => {
    // Validate file first
    const validation = validateUploadedFile(file);
    if (!validation.isValid) {
      onFileSelect(file); // This will trigger error display
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Reading file...');
    
    try {
      // Process the file and extract text
      const extractedText = await processUploadedFile(file);
      
      if (extractedText && extractedText.trim().length > 0) {
        setProcessingStatus('File processed successfully!');
        // Pass the extracted text back to the parent component
        onTextExtracted(extractedText);
        
        // Clear processing state after a brief delay
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStatus('');
        }, 1000);
      } else {
        throw new Error('No readable content found in the file.');
      }
    } catch (error) {
      setIsProcessing(false);
      setProcessingStatus('');
      // Create a mock file event to trigger error handling
      onFileSelect(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      await handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      await handleFileProcess(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-2xl shadow-lg p-6">
      <div 
        className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 transition-all duration-300 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
            : 'border-slate-300 dark:border-slate-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Processing File
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {processingStatus}
            </p>
          </div>
        ) : (
          <>
            <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {fileName ? 'File Ready' : 'Upload Your File'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {fileName
                  ? `Selected file: ${fileName}`
                  : 'Drag and drop your TXT file here, or click to select.'}
              </p>
             
              <input 
                type="file" 
                accept=".txt,.pdf,.docx,.doc"
                onChange={handleFileChange}
                className="hidden"
                id="fileUpload"
              />
              <label 
                htmlFor="fileUpload"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm cursor-pointer transition-all duration-200 hover:bg-indigo-700"
              >
                {fileName ? 'Replace File' : 'Select File'}
              </label>
            </div>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
};

export const CreationView: React.FC<CreationViewProps> = ({ onCreate, error }) => {
  const [mode, setMode] = useState<InputMode>(InputMode.DESCRIBE);
  const [text, setText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [options, setOptions] = useState<FlashcardOptions>({
    language: 'en',
    count: 10
  });

  const handleTextChange = (newText: string) => {
    const truncated = truncateContent(newText, 50000);
    setText(truncated);
  };

  const handleFileSelect = async (file: File) => {
    // Validate the file and set appropriate error message
    const validation = validateUploadedFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid file selected.');
      return;
    }

    try {
      // This will only be called for unsupported file types (PDF, DOCX)
      const extractedText = await processUploadedFile(file);
      setText(extractedText);
      setUploadError(null);
    } catch (error: any) {
      setUploadError(error.message || 'Failed to process the uploaded file.');
    }
  };

  const handleTextExtracted = (extractedText: string) => {
    // Handle successful text extraction from file upload
    setText(extractedText);
    setUploadError(null);
    // Switch to paste mode to show the extracted text
    setMode(InputMode.PASTE);
  };

  const handleSubmit = useCallback(() => {
    const trimmedText = text.trim();
    if (trimmedText) {
      if (!validateContent(trimmedText)) {
        setUploadError('Content contains suspicious elements and cannot be processed.');
        return;
      }
      
      if (trimmedText.length < 3) {
        setUploadError('Please provide more detailed content (at least 10 characters).');
        return;
      }
      
      // Track flashcard generation event
      if (window.trackFlashcardEvent) {
        window.trackFlashcardEvent('generate_flashcards', options.count, options.language, mode);
      }
      
      onCreate(trimmedText, options);
    }
  }, [text, options, onCreate, mode]);

  const placeholderText = {
    [InputMode.DESCRIBE]: "Describe the topic you want to study...",
    [InputMode.PASTE]: "Paste your study material here...",
    [InputMode.UPLOAD]: "Upload your document to get started",
  };

  const isContentReady = text.trim().length >= 3;
  const hasGoodContent = text.trim().length >= 50;
  const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === options.language);

  return (
    <div className="w-full flex flex-col h-full min-h-0 space-y-6">
      {/* Apple-style Hero Section */}
      <div className="text-center flex-shrink-0">
        <h1 className="text-4xl sm:text-5xl font-light text-slate-900 dark:text-white mb-4 tracking-tight">
          Create Flashcards
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-light max-w-xl mx-auto leading-relaxed">
          Transform any topic into personalized study cards
        </p>
      </div>

      {/* Compact Options Bar - Reduced padding and spacing */}
      <div className="flex-shrink-0">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Language Selector - More compact */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Language</span>
              </div>
              
              <div className="relative">
                <select
                  value={options.language}
                  onChange={(e) => setOptions({ ...options, language: e.target.value })}
                  className="appearance-none bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-600/50 rounded-lg px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-transparent transition-all duration-200 cursor-pointer hover:bg-white dark:hover:bg-slate-700"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Compact Divider */}
            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-600"></div>

            {/* Card Count Selector - More compact */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 01-2-2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Cards</span>
              </div>
              
              <div className="relative">
                <select
                  value={options.count}
                  onChange={(e) => setOptions({ ...options, count: parseInt(e.target.value) })}
                  className="appearance-none bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-600/50 rounded-lg px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-transparent transition-all duration-200 cursor-pointer hover:bg-white dark:hover:bg-slate-700"
                >
                  {FLASHCARD_COUNT_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Apple-style Mode Selector */}
      <div className="flex-shrink-0">
        <SegmentedControl activeMode={mode} onModeChange={setMode} />
      </div>

      {/* Content Area - with updated file upload */}
      <div className="flex-1 min-h-[280px] flex">
        {mode === InputMode.UPLOAD ? (
          <IntelligentFileUpload
            onFileSelect={handleFileSelect}
            onTextExtracted={handleTextExtracted}
            error={uploadError}
          />
        ) : (
          <SmartTextArea
            value={text}
            onChange={handleTextChange}
            placeholder={placeholderText[mode]}
            mode={mode}
          />
        )}
      </div>

      {/* Enhanced Error Display */}
      {(error || uploadError) && (
        <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/30 rounded-2xl p-4 shadow-lg flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error || uploadError}</p>
          </div>
        </div>
      )}
      
      {/* Apple-style Action Button */}
      <div className="flex-shrink-0 flex flex-col items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!isContentReady}
          className={`group relative overflow-hidden font-medium py-4 px-12 rounded-full shadow-xl transition-all duration-300 transform ${
            isContentReady
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-2xl hover:scale-105 active:scale-95'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          <span className="relative z-10 flex items-center gap-3 text-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Generate Flashcards</span>
          </span>
          
          {/* Apple-style shimmer effect */}
          {isContentReady && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          )}
        </button>
        
        {/* Refined content indicator */}
        {text.trim().length > 0 && (
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {hasGoodContent 
                ? "Ready to create amazing flashcards"
                : text.trim().length >= 3
                  ? "Add more detail for better results"
                  : "Start by adding your content"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
