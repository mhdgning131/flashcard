import { FlashcardData, FlashcardOptions } from "../types";

// Use Cloudflare Worker URL for production, localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-flashcards-worker.gningmoustapha078.workers.dev/api';

export const generateFlashcards = async (context: string, options: FlashcardOptions): Promise<FlashcardData[]> => {
  try {
    // Input validation on client side as well
    if (!context || typeof context !== 'string') {
      throw new Error('Invalid context provided');
    }
    
    if (context.trim().length < 3) {
      throw new Error('Please provide more detailed content (at least 10 characters)');
    }
    
    if (context.length > 50000) {
      throw new Error('Content too long. Please limit to 50,000 characters.');
    }

    const response = await fetch(`${API_BASE_URL}/generate-flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        context: context.trim(),
        language: options.language,
        count: options.count
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      } else if (response.status === 400) {
        throw new Error(errorData.error || 'Invalid input provided');
      } else if (response.status === 503) {
        throw new Error('AI service is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }
    }

    const data = await response.json();
    
    if (!data.flashcards || !Array.isArray(data.flashcards)) {
      throw new Error('Invalid response format from server');
    }

    // Validate each flashcard
    const validFlashcards = data.flashcards.filter((card: any) => 
      card && 
      typeof card.term === 'string' && 
      typeof card.definition === 'string' &&
      card.term.trim().length > 0 && 
      card.definition.trim().length > 0
    );

    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards could be generated from this content");
    }

    return validFlashcards as FlashcardData[];

  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
};
