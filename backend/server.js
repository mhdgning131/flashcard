const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size

// Rate limiting
const createFlashcardsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many flashcard generation requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
const validateInput = (req, res, next) => {
  const { context, language, count } = req.body;
  
  if (!context || typeof context !== 'string') {
    return res.status(400).json({ error: 'Invalid context provided' });
  }
  
  if (context.length > 50000) { // 50KB limit
    return res.status(400).json({ error: 'Context too long. Please limit to 50,000 characters.' });
  }
  
  if (context.trim().length < 3) {
    return res.status(400).json({ error: 'Context too short. Please provide more detailed content.' });
  }

  // Validate language parameter
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Invalid language provided' });
  }

  const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
  if (!supportedLanguages.includes(language)) {
    return res.status(400).json({ error: 'Unsupported language. Please choose from supported languages.' });
  }

  // Validate count parameter
  if (!count || typeof count !== 'number' || count < 5 || count > 20) {
    return res.status(400).json({ error: 'Invalid count. Please choose between 5 and 20 flashcards.' });
  }
  
  // Basic sanitization - remove potential script tags
  const sanitizedContext = context.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  req.body.context = sanitizedContext;
  
  next();
};

// Initialize Gemini AI
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Language-specific instructions
const getLanguageInstruction = (language) => {
  const languageMap = {
    'en': 'English',
    'fr': 'French (Français)',
    'es': 'Spanish (Español)', 
    'de': 'German (Deutsch)',
    'it': 'Italian (Italiano)',
    'pt': 'Portuguese (Português)',
    'ru': 'Russian (Русский)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'zh': 'Chinese (中文)',
    'ar': 'Arabic (العربية)',
    'hi': 'Hindi (हिन्दी)'
  };

  const languageName = languageMap[language] || 'English';
  
  return `You are an expert in creating educational materials. Based on the following text or topic, generate exactly the requested number of flashcards in ${languageName}. Each flashcard must have a 'term' (a concise word or question) and a 'definition' (a more detailed explanation or answer).

IMPORTANT INSTRUCTIONS:
- Generate flashcards in ${languageName} language only
- Both 'term' and 'definition' must be in ${languageName}
- Create exactly the requested number of flashcards
- Respond ONLY with a valid JSON array of objects
- Do not include any other text, explanations, or markdown fences
- The JSON must be in this exact format: [{"term": "string", "definition": "string"}, ...]
- Ensure all content is educational and appropriate
- Do not generate content that could be harmful, offensive, or inappropriate`;
};

// API endpoint for flashcard generation
app.post('/api/generate-flashcards', createFlashcardsLimiter, validateInput, async (req, res) => {
  try {
    const { context, language, count } = req.body;
    
    console.log(`Generating ${count} flashcards in ${language} for context length: ${context.length}`);
    
    const systemInstruction = getLanguageInstruction(language);
    const prompt = `Create exactly ${count} flashcards about: ${context}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    let jsonStr = response.text.trim();
    console.log('Raw AI response:', jsonStr);

    // Enhanced JSON cleaning and validation
    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    // Additional cleanup for common AI response issues
    // Remove any leading/trailing non-JSON text
    const jsonStartMatch = jsonStr.match(/\[.*\]/s);
    if (jsonStartMatch) {
      jsonStr = jsonStartMatch[0];
    }

    // Fix common JSON formatting issues
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .replace(/:\s*'([^']*?)'/g, ': "$1"') // Replace single quotes with double quotes
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs

    console.log('Cleaned JSON string:', jsonStr);

    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Problematic JSON:', jsonStr);
      
      // Try to extract valid flashcards using regex as fallback
      const termDefMatches = jsonStr.match(/"term"\s*:\s*"([^"]*?)"\s*,\s*"definition"\s*:\s*"([^"]*?)"/g);
      if (termDefMatches && termDefMatches.length > 0) {
        parsedData = termDefMatches.map(match => {
          const termMatch = match.match(/"term"\s*:\s*"([^"]*?)"/);
          const defMatch = match.match(/"definition"\s*:\s*"([^"]*?)"/);
          return {
            term: termMatch ? termMatch[1] : 'Unknown',
            definition: defMatch ? defMatch[1] : 'Unknown'
          };
        });
        console.log('Extracted flashcards using regex fallback:', parsedData.length);
      } else {
        throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
      }
    }

    // Validate response format
    if (!Array.isArray(parsedData)) {
      throw new Error("AI response is not an array");
    }

    const validCards = parsedData.filter(item => 
      item && 
      typeof item === 'object' && 
      typeof item.term === 'string' && 
      typeof item.definition === 'string' &&
      item.term.trim().length > 0 && 
      item.definition.trim().length > 0
    );

    if (validCards.length === 0) {
      throw new Error("No valid flashcards found in AI response");
    }

    // Ensure we have the requested number of cards (or as close as possible)
    const finalCards = validCards.slice(0, count);

    // Additional content validation and sanitization
    const sanitizedCards = finalCards.map(card => ({
      term: card.term.trim().substring(0, 500).replace(/[<>]/g, ''), // Remove potential HTML tags
      definition: card.definition.trim().substring(0, 2000).replace(/[<>]/g, '') // Remove potential HTML tags
    }));

    console.log(`Successfully generated ${sanitizedCards.length} flashcards in ${language}`);
    res.json({ flashcards: sanitizedCards });

  } catch (error) {
    console.error("Error generating flashcards:", error);
    
    if (error.message.includes('API')) {
      res.status(503).json({ error: 'AI service temporarily unavailable. Please try again later.' });
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      res.status(500).json({ error: 'The AI generated an invalid response. Please try rephrasing your input or try again.' });
    } else if (error.message.includes('No valid flashcards')) {
      res.status(400).json({ error: 'Unable to generate valid flashcards from this content. Please try providing more detailed or educational content.' });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🔒 Secure backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});