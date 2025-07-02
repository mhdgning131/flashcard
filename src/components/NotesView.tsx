import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { marked } from 'marked';

interface NotesViewProps {
  content: string;
  onCreateNew: () => void;
  options?: { language: string };
}

export const NotesView: React.FC<NotesViewProps> = ({ content, onCreateNew, options }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(content);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [notesTitle, setNotesTitle] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    setEditableContent(content);
  }, [content]);

  const renderHTML = (markdown: string) => {
    try {
      const result = marked(markdown);
      const html = typeof result === 'string' ? result : markdown;
      return { __html: html };
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return { __html: markdown };
    }
  };

  const handleSaveNotes = () => {
    if (!notesTitle.trim() || !editableContent.trim()) return;
    
    const language = options?.language || 'en';
    
    StorageService.saveNotes(notesTitle.trim(), editableContent, language);
    setSaveSuccess(true);
    setNotesTitle('');
    
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaveModalOpen(false);
    }, 2000);
    
    if (window.trackUserEngagement) {
      window.trackUserEngagement('notes_saved', `notes_${editableContent.length}`);
    }
  };

  const handleExportNotes = () => {
    const blob = new Blob([editableContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notesTitle || 'study-notes'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (window.trackUserEngagement) {
      window.trackUserEngagement('notes_exported', `notes_${editableContent.length}`);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 max-w-4xl mx-auto">
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8 overflow-hidden">
        {/* Header with actions */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-medium text-slate-900 dark:text-white">
            Study Notes
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600"
            >
              {isEditing ? 'Preview' : 'Edit'}
            </button>
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
            >
              Save
            </button>
          </div>
        </div>

        {/* Notes content */}
        <div className="flex-1 overflow-auto">
          {isEditing ? (
            <div className="h-full p-0">
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full h-full p-6 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-0 focus:ring-0 resize-none"
                placeholder="Write your study notes here. Markdown formatting is supported."
              />
            </div>
          ) : (
            <div 
              className="notes-content p-6 prose dark:prose-invert prose-slate max-w-none h-full overflow-auto" 
              dangerouslySetInnerHTML={renderHTML(editableContent)}
            />
          )}
        </div>

        {/* Footer with editing tips */}
        {isEditing && (
          <div className="bg-slate-50 dark:bg-slate-700 p-4 border-t border-slate-200 dark:border-slate-600">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>Formatting tips:</strong> Use # for headings, * for lists, **bold** for bold text, *italic* for italics, and [link](url) for links.
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-between mb-8">
        <button
          onClick={() => handleExportNotes()}
          className="px-6 py-3 flex items-center text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download as Markdown
        </button>

        <button
          onClick={onCreateNew}
          className="group relative overflow-hidden px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ease-out"
        >
          <span className="relative z-10">Create New Notes</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>

      {/* Save modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Save Study Notes</h3>
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
                <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">Notes Saved Successfully</p>
                <p className="text-slate-500 dark:text-slate-400">You can access them anytime from your saved notes</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="notes-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name your notes
                  </label>
                  <input
                    type="text"
                    id="notes-title"
                    placeholder="e.g. Biology Study Notes"
                    value={notesTitle}
                    onChange={(e) => setNotesTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsSaveModalOpen(false)}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={!notesTitle.trim()}
                    className={`px-4 py-2 rounded-lg ${
                      notesTitle.trim() 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-300 cursor-not-allowed text-white'
                    }`}
                  >
                    Save Notes
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