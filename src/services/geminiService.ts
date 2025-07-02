import { FlashcardData, FlashcardOptions, GenerationMode } from "../types";
import { QuizQuestion } from "../components/QuizView";

// Use Cloudflare Worker URL for production, localhost for development
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://ai-flashcards-worker.gningmoustapha078.workers.dev/api';

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
        count: options.count,
        level: options.level
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

export const generateStudyNotes = async (context: string, options: FlashcardOptions): Promise<string> => {
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

    const response = await fetch(`${API_BASE_URL}/generate-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        context: context.trim(),
        language: options.language,
        level: options.level
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
        throw new Error(errorData.error || 'Failed to generate study notes');
      }
    }

    const data = await response.json();
    
    if (!data.notes || typeof data.notes !== 'string') {
      throw new Error('Invalid response format from server');
    }

    return data.notes;

  } catch (error) {
    console.error("Error generating notes:", error);
    throw error;
  }
};

export const generateQuiz = async (context: string, options: FlashcardOptions): Promise<QuizQuestion[]> => {
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

    const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        context: context.trim(),
        language: options.language,
        count: options.count,
        level: options.level
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
        throw new Error(errorData.error || 'Failed to generate quiz');
      }
    }

    const data = await response.json();
    
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format from server');
    }

    // Validate each quiz question
    const validQuestions = data.questions.filter((question: any) => 
      question && 
      typeof question.question === 'string' && 
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      typeof question.correctAnswer === 'number' &&
      question.correctAnswer >= 0 &&
      question.correctAnswer < 4 &&
      typeof question.explanation === 'string'
    );

    if (validQuestions.length === 0) {
      throw new Error("No valid quiz questions could be generated from this content");
    }

    return validQuestions as QuizQuestion[];

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

// Generic content generation function that routes to the appropriate generator based on mode
export const generateContent = async (context: string, options: FlashcardOptions): Promise<FlashcardData[] | string | QuizQuestion[]> => {
  switch (options.generationMode) {
    case GenerationMode.FLASHCARDS:
      return generateFlashcards(context, options);
    case GenerationMode.NOTES:
      return generateStudyNotes(context, options);
    case GenerationMode.QUIZ:
      return generateQuiz(context, options);
    default:
      throw new Error(`Unsupported generation mode: ${options.generationMode}`);
  }
};
