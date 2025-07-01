import DOMPurify from 'dompurify';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker with local fallback
if (typeof window !== 'undefined') {
  try {
    // Construct a full URL for the worker
    const workerUrl = new URL('/pdf.worker.min.js', window.location.origin);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;
    console.log('PDF.js configured with local worker:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  } catch (error) {
    console.warn('Failed to set local PDF.js worker, trying CDN fallback:', error);
    try {
      // Fallback to CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    } catch (fallbackError) {
      console.warn('Failed to set PDF.js worker from CDN:', fallbackError);
      // Will use no-worker mode as final fallback
    }
  }
}

// Configure DOMPurify for safe HTML sanitization
const sanitizeConfig = {
  ALLOWED_TAGS: [], // No HTML tags allowed in flashcard content
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_SCRIPT: true,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style', 'class'],
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
};

/**
 * Sanitizes user-generated content to prevent XSS attacks while preserving normal text
 * @param content - The content to sanitize
 * @returns Sanitized content safe for rendering
 */
export const sanitizeContent = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // For flashcard content from AI, we only need to remove potentially dangerous HTML
  // but preserve normal characters like apostrophes, accents, etc.
  
  // Use DOMPurify to remove any HTML tags and scripts
  const cleaned = DOMPurify.sanitize(content, sanitizeConfig);
  
  // Additional cleanup for any remaining suspicious patterns
  return cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove any remaining script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Lighter sanitization for display purposes - only removes dangerous HTML
 * @param content - The content to sanitize for display
 * @returns Content safe for display with preserved formatting
 */
export const sanitizeForDisplay = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // Only remove dangerous elements, preserve normal text and characters
  return DOMPurify.sanitize(content, {
    ...sanitizeConfig,
    ALLOWED_TAGS: ['br'], // Allow line breaks for better formatting
  });
};

/**
 * Validates that content doesn't contain suspicious patterns
 * @param content - The content to validate
 * @returns true if content is safe, false otherwise
 */
export const validateContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(content));
};

/**
 * Truncates content to a safe length to prevent DoS attacks
 * @param content - The content to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated content
 */
export const truncateContent = (content: string, maxLength: number = 2000): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength - 3) + '...';
};

// File processing utilities for upload functionality

/**
 * Processes uploaded files and extracts text content
 * @param file - The uploaded file
 * @returns Promise with extracted text content
 */
export const processUploadedFile = async (file: File): Promise<string> => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Please upload files smaller than 10MB.');
  }
  
  // Process based on file type
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await processTextFile(file);
  } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await processPDFFile(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    return await processWordFile(file);
  } else {
    throw new Error('Unsupported file type. Please upload TXT, PDF, or DOCX files.');
  }
};

/**
 * Process text files
 */
const processTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || text.trim().length === 0) {
        reject(new Error('The text file appears to be empty.'));
        return;
      }
      resolve(text.trim());
    };
    reader.onerror = () => reject(new Error('Failed to read the text file.'));
    reader.readAsText(file);
  });
};

/**
 * Alternative PDF processing when PDF.js fails
 */
const processPDFFileAlternative = async (file: File): Promise<string> => {
  // Fallback: suggest manual text extraction
  throw new Error('PDF processing is currently unavailable. Please try one of these alternatives:\n\n1. Copy and paste the text content directly\n2. Convert the PDF to a TXT file using an online converter\n3. Use "Save As Text" from your PDF reader\n\nWe apologize for the inconvenience and are working to resolve this issue.');
};

/**
 * Process PDF files using PDF.js with improved error handling
 */
const processPDFFile = async (file: File): Promise<string> => {
  // First, check if PDF.js is properly configured
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    console.warn('PDF.js worker not configured, attempting to set up...');
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
    } catch (setupError) {
      console.error('Failed to setup PDF.js worker:', setupError);
      return await processPDFFileAlternative(file);
    }
  }

  try {
    // Ensure we have a proper arrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Invalid PDF file - file appears to be empty or corrupted.');
    }

    // Configure PDF.js loading options with better error handling
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Reduce console output
      disableFontFace: true, // Disable font loading for better compatibility
      disableRange: true, // Disable range requests
      disableStream: true, // Disable streaming
      isEvalSupported: false, // Disable eval for security
    });

    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF processing timeout')), 30000); // 30 second timeout
    });

    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as any;
    
    if (!pdf || pdf.numPages === 0) {
      throw new Error('PDF file appears to be empty or corrupted.');
    }
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages for performance
    
    // Extract text from each page with better error handling
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items with proper spacing
        const pageText = textContent.items
          .filter((item: any) => item && item.str) // Filter out invalid items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        if (pageText && pageText.length > 0) {
          fullText += pageText + '\n\n';
        }
      } catch (pageError) {
        console.warn(`Failed to process page ${pageNum}:`, pageError);
        // Continue processing other pages
        continue;
      }
    }
    
    // Clean up the PDF document
    try {
      await pdf.destroy();
    } catch (cleanupError) {
      console.warn('Failed to cleanup PDF document:', cleanupError);
    }
    
    if (!fullText.trim()) {
      throw new Error('No readable text found in the PDF. The file may contain only images, be scanned content, or be password protected.');
    }
    
    // Final cleanup of extracted text
    const cleanedText = fullText
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();
    
    if (cleanedText.length < 10) {
      throw new Error('Very little text content found in the PDF. Please ensure the PDF contains readable text content.');
    }
    
    return cleanedText;
    
  } catch (error: any) {
    console.error('PDF processing error:', error);
    
    // If it's a worker or network-related error, use alternative processing
    if (error.message.includes('worker') || 
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.name === 'NetworkError') {
      return await processPDFFileAlternative(file);
    }
    
    // Provide specific error messages based on the type of error
    if (error.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please provide an unlocked PDF or copy-paste the content.');
    }
    
    if (error.message.includes('Invalid PDF')) {
      throw new Error('Invalid PDF file. Please ensure the file is a valid PDF document.');
    }
    
    if (error.message.includes('No readable text found') || error.message.includes('Very little text content')) {
      throw error; // Re-throw our custom messages
    }
    
    // Generic fallback error
    throw new Error('Failed to process PDF file. The file may be corrupted, contain only images, or use an unsupported PDF format. Try copy-pasting the content instead.');
  }
};

/**
 * Process Word documents using mammoth.js
 */
const processWordFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text content found in the Word document. The document might be empty or contain only images.');
    }
    
    // Clean up the extracted text
    const cleanedText = result.value
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Log any conversion messages (for debugging)
    if (result.messages && result.messages.length > 0) {
      console.log('Word document conversion messages:', result.messages);
    }
    
    return cleanedText;
  } catch (error: any) {
    if (error.message.includes('No text content found')) {
      throw error;
    }
    throw new Error('Failed to process Word document. Please ensure it\'s a valid DOCX file, or try copy-pasting the content instead.');
  }
};

/**
 * Validates uploaded file before processing
 */
export const validateUploadedFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: 'File too large. Maximum size is 10MB.' };
  }
  
  // Check file type
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  const supportedTypes = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  const supportedExtensions = ['.txt', '.pdf', '.docx', '.doc'];
  
  const hasValidType = supportedTypes.includes(fileType);
  const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidType && !hasValidExtension) {
    return { 
      isValid: false, 
      error: 'Unsupported file type. Please upload TXT, PDF, or DOCX files.' 
    };
  }
  
  return { isValid: true };
};