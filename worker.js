// Cloudflare Worker for AI Flashcards Backend
export default {
  async fetch(request, env, ctx) {
    // CORS headers - Update to allow your domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // In production, replace with your actual domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ 
        status: 'OK', 
        timestamp: new Date().toISOString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Flashcard generation endpoint
    if (url.pathname === '/api/generate-flashcards' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { context, language, count, level } = body;

        // Input validation
        if (!context || typeof context !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid context provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (context.length > 50000) {
          return new Response(JSON.stringify({ error: 'Context too long. Please limit to 50,000 characters.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (context.trim().length < 3) {
          return new Response(JSON.stringify({ error: 'Context too short. Please provide more detailed content.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
        if (!language || !supportedLanguages.includes(language)) {
          return new Response(JSON.stringify({ error: 'Unsupported language. Please choose from supported languages.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!count || typeof count !== 'number' || count < 5 || count > 20) {
          return new Response(JSON.stringify({ error: 'Invalid count. Please choose between 5 and 20 flashcards.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Validate level parameter
        if (!level || typeof level !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid difficulty level provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const supportedLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        if (!supportedLevels.includes(level)) {
          return new Response(JSON.stringify({ error: 'Invalid difficulty level. Please choose from: beginner, intermediate, advanced, expert.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Rate limiting using client IP
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateLimitKey = `rate_limit:${clientIP}`;
        
        if (env.RATE_LIMIT_KV) {
          const currentCount = await env.RATE_LIMIT_KV.get(rateLimitKey);
          if (currentCount && parseInt(currentCount) >= 10) {
            return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Sanitize context
        const sanitizedContext = context.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // Create level-specific instruction
        const levelInstructions = {
          'beginner': 'Use simple, clear language with basic concepts. Create flashcards with fundamental terms, basic definitions, and easy-to-understand explanations. Avoid jargon and complex terminology.',
          'intermediate': 'Use moderate complexity with detailed explanations. Include important concepts, standard terminology, and more comprehensive definitions. Assume some background knowledge.',
          'advanced': 'Use sophisticated concepts with in-depth explanations. Include complex terminology, detailed technical concepts, and comprehensive analysis. Assume solid background knowledge.',
          'expert': 'Use extremely technical and specialized terminology. Create flashcards with graduate-level or professional-level concepts, advanced theories, complex methodologies, and highly specialized jargon. Assume deep expertise and years of experience in the field. Include cutting-edge concepts, advanced mathematical formulations, specialized procedures, and expert-only terminology.'
        };

        const levelInstruction = levelInstructions[level] || levelInstructions['intermediate'];

        // Create enhanced prompt with much more explicit level-specific requirements
        const levelSpecificPrompts = {
          'beginner': 'Focus on basic vocabulary and simple concepts. Use everyday language. Avoid technical terms.',
          'intermediate': 'Include standard concepts and some technical terminology. Provide moderate detail.',
          'advanced': 'Use sophisticated vocabulary and complex concepts. Include technical details and assume good background knowledge.',
          'expert': 'CRITICAL: Generate ONLY expert-level content. Use highly specialized terminology, advanced concepts, professional jargon, and technical language that only experts would understand. Include complex methodologies, advanced theories, cutting-edge research concepts, and specialized procedures. Assume the user has extensive professional experience and advanced education in this field.'
        };

        const levelSpecificPrompt = levelSpecificPrompts[level];

        // Create enhanced prompt with clearer level guidance
        const prompt = `You are an expert educator creating flashcards for ${level.toUpperCase()} level learners. Generate exactly ${count} flashcards in ${language} language about: ${sanitizedContext}

DIFFICULTY LEVEL: ${level.toUpperCase()}
LEVEL REQUIREMENTS: ${levelInstruction}

${levelSpecificPrompt}

${level === 'expert' ? `
EXPERT LEVEL REQUIREMENTS (MANDATORY):
- Use ONLY highly technical and specialized terminology
- Include advanced theories, methodologies, and cutting-edge concepts
- Assume extensive professional experience and graduate-level education
- Use professional jargon and field-specific terminology
- Include complex processes, advanced calculations, or specialized procedures
- NO basic explanations or simple concepts
- Every term must be at graduate/professional level or higher

EXAMPLES OF EXPERT-LEVEL TERMS:
- Technical: "Quantum decoherence", "Epigenetic modifications", "Stochastic gradient descent"
- Medical: "Pharmacokinetic parameters", "Immunohistochemistry protocols", "Cytokine storm cascades"  
- Engineering: "Finite element analysis", "Signal-to-noise ratio optimization", "Thermal conductivity coefficients"
- Research: "Meta-analytical frameworks", "Confounding variable control", "Statistical power calculations"

==> FORBIDDEN: Simple definitions, basic concepts, introductory explanations
==> NO basic vocabulary or elementary concepts
==> NO "introduction to..." or beginner-friendly content
` : ''}

IMPORTANT: The flashcards MUST match the ${level} difficulty level precisely. ${level === 'expert' ? 'Reject any basic or intermediate concepts - ONLY expert-level content.' : ''}

Respond ONLY with a valid JSON array in this format: [{"term": "string", "definition": "string"}, ...]`;

        // Call Google Gemini AI using the REST API
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: level === 'expert' ? 0.2 : 0.7, // Lower temperature for expert level for more consistent technical content
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('Gemini API Error:', errorText);
          throw new Error('AI service error');
        }

        const aiData = await aiResponse.json();
        let jsonStr = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!jsonStr) {
          throw new Error('No response from AI service');
        }

        // Clean and parse JSON response
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }

        const jsonStartMatch = jsonStr.match(/\[.*\]/s);
        if (jsonStartMatch) {
          jsonStr = jsonStartMatch[0];
        }

        jsonStr = jsonStr
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
          .replace(/:\s*'([^']*?)'/g, ': "$1"');

        let parsedData;
        try {
          parsedData = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          throw new Error('Failed to parse AI response');
        }

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
        
        // For expert level, implement stricter validation and regeneration if needed
        let finalCards = validCards.slice(0, count);
        
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
          
          // Check if all cards meet expert criteria
          const isExpertContent = finalCards.every(card => {
            const combined = (card.term + ' ' + card.definition).toLowerCase();
            
            // Check for banned simple terms
            const hasSimpleTerms = bannedSimpleTerms.some(term => combined.includes(term));
            if (hasSimpleTerms) return false;
            
            // Check for expert keywords and definition length
            const expertKeywordCount = expertKeywords.filter(keyword => combined.includes(keyword)).length;
            return expertKeywordCount >= 2 && card.definition.length > 150;
          });
          
          // If not expert enough, try regenerating once with stricter prompt
          if (!isExpertContent) {
            console.log('Content not expert level - attempting regeneration');
            
            const enhancedPrompt = prompt + `\n\nCRITICAL: Previous attempt generated content that was NOT expert level. 
Every term and definition MUST be at PhD/professional level with highly specialized terminology.
Content must be EXTREMELY technical, using professional jargon, complex methodologies, and advanced theories.
DO NOT simplify anything - this is for experts with extensive education in the field.`;
            
            try {
              const regenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: enhancedPrompt
                    }]
                  }],
                  generationConfig: {
                    temperature: 0.1, // Even lower temperature for stricter expert content
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                  }
                })
              });
              
              if (regenResponse.ok) {
                const regenData = await regenResponse.json();
                const regenText = regenData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                
                if (regenText) {
                  // Process the regenerated response using the same parsing logic
                  let regenJsonStr = regenText;
                  
                  const regenMatch = regenJsonStr.match(fenceRegex);
                  if (regenMatch && regenMatch[2]) {
                    regenJsonStr = regenMatch[2].trim();
                  }
                  
                  const regenJsonStartMatch = regenJsonStr.match(/\[.*\]/s);
                  if (regenJsonStartMatch) {
                    regenJsonStr = regenJsonStartMatch[0];
                  }
                  
                  regenJsonStr = regenJsonStr
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                    .replace(/,(\s*[}\]])/g, '$1')
                    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
                    .replace(/:\s*'([^']*?)'/g, ': "$1"');
                  
                  const regenParsedData = JSON.parse(regenJsonStr);
                  
                  if (Array.isArray(regenParsedData) && regenParsedData.length > 0) {
                    const regenValidCards = regenParsedData.filter(item => 
                      item && 
                      typeof item === 'object' && 
                      typeof item.term === 'string' && 
                      typeof item.definition === 'string' &&
                      item.term.trim().length > 0 && 
                      item.definition.trim().length > 0
                    );
                    
                    if (regenValidCards.length > 0) {
                      finalCards = regenValidCards.slice(0, count);
                      console.log('Successfully regenerated expert-level content');
                    }
                  }
                }
              }
            } catch (regenError) {
              console.error('Error during expert content regeneration:', regenError);
              // Continue with original content if regeneration fails
            }
          }
        }

        const sanitizedCards = finalCards.map(card => ({
          term: card.term.trim().substring(0, 500).replace(/[<>]/g, ''),
          definition: card.definition.trim().substring(0, 2000).replace(/[<>]/g, '')
        }));

        // Update rate limit counter
        if (env.RATE_LIMIT_KV) {
          const currentCount = await env.RATE_LIMIT_KV.get(rateLimitKey) || '0';
          await env.RATE_LIMIT_KV.put(rateLimitKey, String(parseInt(currentCount) + 1), { expirationTtl: 900 }); // 15 minutes
        }

        return new Response(JSON.stringify({ flashcards: sanitizedCards }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Error generating flashcards:', error);
        
        let errorMessage = 'An unexpected error occurred. Please try again.';
        let statusCode = 500;

        if (error.message.includes('AI service')) {
          errorMessage = 'AI service temporarily unavailable. Please try again later.';
          statusCode = 503;
        } else if (error.message.includes('JSON') || error.message.includes('parse')) {
          errorMessage = 'The AI generated an invalid response. Please try rephrasing your input or try again.';
        } else if (error.message.includes('No valid flashcards')) {
          errorMessage = 'Unable to generate valid flashcards from this content. Please try providing more detailed or educational content.';
          statusCode = 400;
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 404 for other routes
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};