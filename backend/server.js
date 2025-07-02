const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
  const { context, language, count, level } = req.body;
  
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

  // Validate level parameter
  if (!level || typeof level !== 'string') {
    return res.status(400).json({ error: 'Invalid difficulty level provided' });
  }

  const supportedLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  if (!supportedLevels.includes(level)) {
    return res.status(400).json({ error: 'Invalid difficulty level. Please choose from: beginner, intermediate, advanced, expert.' });
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

const genAI = new GoogleGenerativeAI(API_KEY);

// Enhanced language-specific instructions with stronger difficulty level enforcement
const getSystemInstruction = (language, level) => {
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
  
  const baseInstruction = `You are an expert educational content creator. You MUST create flashcards in ${languageName} language only. Both the term and definition must be in ${languageName}.

CRITICAL: You must respond ONLY with a valid JSON array. No markdown fences, no explanations, no additional text.

Format: [{"term": "string", "definition": "string"}, ...]`;

  const levelInstructions = {
    'beginner': `${baseInstruction}

DIFFICULTY LEVEL: BEGINNER
- Use simple, everyday language
- Focus on basic definitions and fundamental concepts
- Avoid technical jargon
- Explain concepts as if teaching a complete newcomer
- Use analogies and simple examples`,

    'intermediate': `${baseInstruction}

DIFFICULTY LEVEL: INTERMEDIATE  
- Use moderate complexity and some technical terminology
- Include important concepts for someone with basic knowledge
- Provide detailed explanations with context
- Balance accessibility with depth`,

    'advanced': `${baseInstruction}

DIFFICULTY LEVEL: ADVANCED
- Use sophisticated vocabulary and complex concepts
- Include technical details and specialized terminology
- Assume substantial background knowledge
- Focus on nuanced understanding and advanced applications`,

    'expert': `${baseInstruction}

DIFFICULTY LEVEL: EXPERT - MANDATORY REQUIREMENTS:

==> CRITICAL: You MUST NOT generate any basic, intermediate, or simple content. 
==> REJECT any attempt to create beginner-level flashcards.
==> Every single flashcard MUST be at graduate/doctoral/professional level.

EXPERT LEVEL REQUIREMENTS (NON-NEGOTIABLE):
==> Use ONLY highly specialized technical terminology
==> Include cutting-edge research concepts and methodologies  
==> Assume PhD-level or professional expertise in the field
==> Use advanced mathematical formulations where applicable
==> Include complex theories, specialized procedures, and professional jargon
==> Reference advanced research, specialized equipment, or expert methodologies
==> Use terminology that only field experts would understand
==> Include complex interdisciplinary concepts
==> Focus on latest developments, advanced techniques, expert-only knowledge

EXAMPLES OF EXPERT-LEVEL TERMS:
- Technical: "Quantum decoherence", "Epigenetic modifications", "Stochastic gradient descent"
- Medical: "Pharmacokinetic parameters", "Immunohistochemistry protocols", "Cytokine storm cascades"  
- Engineering: "Finite element analysis", "Signal-to-noise ratio optimization", "Thermal conductivity coefficients"
- Research: "Meta-analytical frameworks", "Confounding variable control", "Statistical power calculations"

==> FORBIDDEN: Simple definitions, basic concepts, introductory explanations
==> NO basic vocabulary or elementary concepts
==> NO "introduction to..." or beginner-friendly content

If the provided context seems too basic for expert-level flashcards, you must elevate it to expert level by focusing on the most advanced aspects, latest research, technical implementations, or professional applications.`
  };

  return levelInstructions[level] || levelInstructions['intermediate'];
};

// Create enhanced user prompt based on level
const getUserPrompt = (context, count, level) => {
  const baseParts = [
    `Create exactly ${count} flashcards about the following content:`,
    `Content: ${context}`
  ];

  if (level === 'expert') {
    baseParts.push(`
==> EXPERT LEVEL ENFORCEMENT:
- Transform ANY basic content into expert-level concepts
- Focus on the most advanced, technical, and specialized aspects
- Use professional terminology and cutting-edge knowledge
- Assume extensive expertise and advanced education
- Include complex methodologies, advanced theories, or specialized procedures
- Every flashcard must be at graduate/professional level or higher`);
  }

  return baseParts.join('\n\n');
};

// API endpoint for flashcard generation
app.post('/api/generate-flashcards', createFlashcardsLimiter, validateInput, async (req, res) => {
  try {
    const { context, language, count, level } = req.body;
    
    console.log(`Generating ${count} flashcards in ${language} at ${level} level for context length: ${context.length}`);
    
    // Get the correct model (use the most recent available)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: getSystemInstruction(language, level),
      generationConfig: {
        temperature: level === 'expert' ? 0.3 : 0.7, // Lower temperature for expert level for more consistent technical content
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
      },
    });

    const userPrompt = getUserPrompt(context, count, level);
    
    console.log('System Instruction Length:', getSystemInstruction(language, level).length);
    console.log('User Prompt Length:', userPrompt.length);
    
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    let jsonStr = response.text().trim();
    
    console.log('Raw AI response:', jsonStr.substring(0, 500) + '...');

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
      .replace(/\\n/g, '\\\\n') // Escape newlines properly
      .replace(/\\r/g, '\\\\r') // Escape carriage returns
      .replace(/\\t/g, '\\\\t'); // Escape tabs

    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Problematic JSON:', jsonStr.substring(0, 1000));
      
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

    // Expert level validation - check if content is actually expert level
    if (level === 'expert') {
      const expertKeywords = [
        'advanced', 'sophisticated', 'complex', 'specialized', 'technical', 'methodology',
        'parameter', 'protocol', 'algorithm', 'optimization', 'coefficient', 'analysis',
        'synthesis', 'implementation', 'configuration', 'calibration', 'specification',
        'framework', 'architecture', 'paradigm', 'mechanism', 'phenomenon', 'theoretical',
        'quantum', 'differential', 'molecular', 'computational', 'neural', 'cryptographic',
        'stochastic', 'multivariate', 'probabilistic', 'algorithmic', 'thermodynamic'
      ];

      const bannedSimpleTerms = [
        'basic', 'simple', 'easy', 'introduction to', 'beginner', 'fundamental',
        'overview', 'elementary', 'starting', 'first step', 'learn about'
      ];
      
      const hasExpertContent = validCards.every(card => {
        const combined = (card.term + ' ' + card.definition).toLowerCase();
        
        // Check for banned simple terms that should never appear in expert content
        const hasSimpleTerms = bannedSimpleTerms.some(term => 
          combined.includes(term)
        );
        
        if (hasSimpleTerms) return false;
        
        // More stringent criteria for expert content:
        // 1. Must contain at least 2 expert keywords
        // 2. Definition must be substantially detailed (>150 chars)
        const expertKeywordCount = expertKeywords.filter(keyword => 
          combined.includes(keyword)
        ).length;
        
        return expertKeywordCount >= 2 && card.definition.length > 150;
      });
      
      if (!hasExpertContent) {
        console.warn('Generated content is not expert level, regenerating...');
        
        // Try one more time with even stronger emphasis on expert-level content
        const enhancedPrompt = getUserPrompt(context, count, level) + `\n\nCRITICAL REQUIREMENT: Previous attempt was not expert level. This MUST be graduate/professional level content with advanced terminology, specialized concepts, and technical depth. DO NOT simplify content. DO NOT use beginner-friendly language.`;
        
        try {
          console.log('Attempting regeneration with enhanced expert prompting...');
          const regenResult = await model.generateContent(enhancedPrompt);
          const regenResponse = await regenResult.response;
          let regenJsonStr = regenResponse.text().trim();
          
          // Same cleaning and validation as before
          const regenMatch = regenJsonStr.match(fenceRegex);
          if (regenMatch && regenMatch[2]) {
            regenJsonStr = regenMatch[2].trim();
          }
          
          const regenJsonStartMatch = regenJsonStr.match(/\[.*\]/s);
          if (regenJsonStartMatch) {
            regenJsonStr = regenJsonStartMatch[0];
          }
          
          // Apply the same JSON cleanup
          regenJsonStr = regenJsonStr
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
            .replace(/:\s*'([^']*?)'/g, ': "$1"')
            .replace(/\\n/g, '\\\\n')
            .replace(/\\r/g, '\\\\r')
            .replace(/\\t/g, '\\\\t');
            
          // Try to parse and validate regenerated content
          const regenParsedData = JSON.parse(regenJsonStr);
          
          if (Array.isArray(regenParsedData) && regenParsedData.length > 0) {
            // Replace the original data with regenerated data
            parsedData = regenParsedData;
            console.log('Successfully regenerated higher-quality expert content');
          }
        } catch (regenError) {
          console.error('Error during content regeneration:', regenError.message);
          // Continue with original content if regeneration fails
        }
      }
    }

    // Ensure we have the requested number of cards (or as close as possible)
    const finalCards = validCards.slice(0, count);

    // Additional content validation and sanitization
    const sanitizedCards = finalCards.map(card => ({
      term: card.term.trim().substring(0, 500).replace(/[<>]/g, ''), // Remove potential HTML tags
      definition: card.definition.trim().substring(0, 2000).replace(/[<>]/g, '') // Remove potential HTML tags
    }));

    console.log(`Successfully generated ${sanitizedCards.length} flashcards in ${language} at ${level} level`);
    
    // Log first card for debugging expert level
    if (sanitizedCards.length > 0) {
      console.log('Sample flashcard:', {
        term: sanitizedCards[0].term.substring(0, 50) + '...',
        definition: sanitizedCards[0].definition.substring(0, 100) + '...'
      });
    }
    
    res.json({ flashcards: sanitizedCards });

  } catch (error) {
    console.error("Error generating flashcards:", error);
    
    if (error.message.includes('API') || error.message.includes('quota')) {
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