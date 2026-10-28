import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Configure execution time for serverless function (60 seconds)
export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

// Exponential backoff helper for Gemini API with detailed retry logging
async function fetchWithBackoff(operation, maxRetries = 3) {
  let attempt = 0;
  let baseDelay = 1000;
  
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
      const isOverloaded = error?.status === 503 || error?.message?.includes('503');

      if ((isRateLimit || isOverloaded) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`[Samuel Backoff] Temporary rate limit or 503. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
}

// Helper to reliably parse request body across Node.js and Edge/Web environments
async function parseRequestBody(req) {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  if (typeof req.json === 'function') {
    return await req.json();
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        console.error('[Samuel] Failed to parse raw stream body:', err);
        resolve({});
      }
    });
    req.on('error', (err) => {
      console.error('[Samuel] Request stream error:', err);
      resolve({});
    });
  });
}

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log('[Samuel] ---> Incoming AI Tutor Request:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    const errorMsg = 'Method not allowed. Only POST is accepted.';
    console.warn(`[Samuel Warning] Invalid method ${req.method}`);
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ error: errorMsg });
    }
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Parse and Validate Request Payload
    const body = await parseRequestBody(req);
    const { prompt, userId, postContent, postTopic, userDepartment } = body || {};

    console.log('[Samuel] Payload parsed successfully:', {
      hasPrompt: Boolean(prompt),
      hasPostContent: Boolean(postContent),
      userId: userId || 'MISSING',
      postTopic: postTopic || 'default',
      userDepartment: userDepartment || 'default',
    });

    if ((!prompt && !postContent) || !userId) {
      const missingFields = [];
      if (!prompt && !postContent) missingFields.push('prompt/postContent');
      if (!userId) missingFields.push('userId');
      console.error('[Samuel ERROR] Malformed payload. Missing fields:', missingFields.join(', '));

      const errPayload = { error: `Missing required field(s): ${missingFields.join(', ')}` };
      if (res && typeof res.status === 'function') {
        return res.status(400).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build context-injected prompt
    let finalPrompt = prompt || '';
    if (postContent) {
      finalPrompt = `Academic Context:
- Student Department: ${userDepartment || 'University Student'}
- Topic/Course: ${postTopic || 'General Academia'}

Feed Post Content to Analyze:
"""
${postContent}
"""

Student Request:
${prompt || 'Please analyze this post content and provide a helpful, structured, and concise academic breakdown or answer.'}`;
    }

    // 2. Initialize Supabase Admin client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Samuel ERROR] Missing Supabase credentials:', {
        hasUrl: Boolean(supabaseUrl),
        hasKey: Boolean(supabaseServiceKey),
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const QUERY_COST = 5;

    // 3. Verify Student Balance
    console.log(`[Samuel] Verifying C-Coin balance for user: ${userId}`);
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('c_coins')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !userProfile) {
      console.error('[Samuel ERROR] Failed to fetch user profile:', fetchError || 'User profile not found');
      const errPayload = { error: 'User profile not found in Studial records' };
      if (res && typeof res.status === 'function') {
        return res.status(404).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if ((userProfile.c_coins || 0) < QUERY_COST) {
      console.warn(`[Samuel Warning] Insufficient funds for user ${userId}. Balance: ${userProfile.c_coins}, Cost: ${QUERY_COST}`);
      const errPayload = { error: `Insufficient C-Coins. You need at least ${QUERY_COST} C-Coins to consult Samuel.` };
      if (res && typeof res.status === 'function') {
        return res.status(403).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Verify Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Samuel FATAL] No Gemini API key found! Checked GEMINI_API_KEY and VITE_GEMINI_API_KEY in process.env.');
      const errPayload = { error: 'Gemini AI API Key is not configured on the server. Please check environment variables.' };
      if (res && typeof res.status === 'function') {
        return res.status(500).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Samuel] Gemini API key confirmed (length: ${apiKey.length}). Initializing @google/genai SDK...`);
    const ai = new GoogleGenAI({ apiKey });

    // Academic tutor system prompt
    const systemInstruction = `You are Samuel, an expert academic tutor and study mentor for university students on Studial.
Your goal is to help university students deeply understand concepts, master complex topics, and succeed in their coursework.
When analyzing a post:
- Respond specifically as an academic tutor for university students.
- Analyze the passed post content and provide a helpful, structured, and concise breakdown or answer.
- Tailor your explanations to the student's department and course topic when provided.
- Use clear formatting with bullet points, numbered steps, and key takeaways where helpful.
- Support mathematical expressions with LaTeX syntax ($...$ or $$...$$) and code with markdown blocks.
- Maintain an intellectual, encouraging, and supportive tone.
- Never state that you are an AI or language model; speak naturally as Samuel, their trusted academic mentor on Studial.`;

    // 5. Initiate Gemini Stream with Backoff using gemini-1.5-flash
    console.log('[Samuel] Dispatching request to model: gemini-1.5-flash');
    const streamResponse = await fetchWithBackoff(async () => {
      return await ai.models.generateContentStream({
        model: 'gemini-1.5-flash',
        contents: finalPrompt,
        config: {
          systemInstruction,
          maxOutputTokens: 2048,
        },
      });
    });

    console.log('[Samuel] Gemini 1.5 Flash stream initiated successfully. Deducting C-Coins...');

    // 6. Deduct coins & log transaction
    const newBalance = Math.max(0, userProfile.c_coins - QUERY_COST);
    await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', userId);
    
    // Background transaction log
    supabase.from('c_coin_transactions').insert({
      user_id: userId,
      amount: `-${QUERY_COST} C`,
      description: 'Samuel AI Tutor Consultation'
    }).catch(err => console.warn('[Samuel] Transaction log non-blocking notice:', err));

    // 7. Handle Streaming Response (Supports Node.js Serverless res & Web standard Response)
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        for await (const chunk of streamResponse) {
          if (chunk.text) {
            res.write(chunk.text);
          }
        }
        res.end();
        console.log(`[Samuel] Stream completed in ${Date.now() - startTime}ms`);
        return;
      } catch (streamErr) {
        console.error('[Samuel Streaming Error]:', streamErr);
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }
    }

    // Web Standard Response fallback
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
          console.log(`[Samuel] Web Stream completed in ${Date.now() - startTime}ms`);
        } catch (err) {
          console.error('[Samuel Web Stream Chunk Error]:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    const status = error?.status || error?.code || 500;
    const message = error?.message || String(error);

    // Detailed error logging with root-cause identification
    console.error(`[Samuel FATAL ERROR after ${elapsed}ms]:`, {
      name: error?.name,
      message: message,
      status: status,
      code: error?.code,
      stack: error?.stack,
    });

    if (message.includes('API_KEY') || status === 401 || status === 403) {
      console.error('[Samuel Diagnosis] Authentication failure: Please verify GEMINI_API_KEY has valid Google GenAI permissions.');
    } else if (status === 429 || message.includes('RESOURCE_EXHAUSTED')) {
      console.error('[Samuel Diagnosis] Rate limit exceeded on Google Gemini project quota.');
    } else if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('DEADLINE_EXCEEDED')) {
      console.error('[Samuel Diagnosis] Request timed out while communicating with Gemini API.');
    }

    const errorResponse = {
      error: message.includes('API_KEY') 
        ? 'Gemini API key is invalid or not authorized.'
        : 'Samuel is currently resting his circuits. Please try again in a moment.',
      details: message,
      status: status
    };

    if (res && typeof res.status === 'function') {
      return res.status(500).json(errorResponse);
    }
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}
