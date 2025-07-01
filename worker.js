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
        const { context, language, count } = body;

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

        // Call Google Gemini AI using the REST API
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert in creating educational materials. Generate exactly ${count} flashcards in ${language} language about: ${sanitizedContext}. Respond ONLY with a valid JSON array in this format: [{"term": "string", "definition": "string"}, ...]`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
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

        const finalCards = validCards.slice(0, count);
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