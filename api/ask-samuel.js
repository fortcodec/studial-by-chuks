import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

// Exponential backoff helper for Gemini API
async function fetchWithBackoff(operation, maxRetries = 3) {
  let attempt = 0;
  let baseDelay = 1000;
  
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (error?.status === 429 && attempt < maxRetries - 1) {
        attempt++;
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { prompt, userId } = await req.json();

    if (!prompt || !userId) {
      return new Response(JSON.stringify({ error: 'Missing prompt or userId' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase Admin to verify and deduct balance securely
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const QUERY_COST = 5;

    // 1. Verify Balance
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('c_coins')
      .eq('id', userId)
      .single();

    if (fetchError || !userProfile) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if ((userProfile.c_coins || 0) < QUERY_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient C-Coins' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Prepare Gemini Client
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI API Key not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = "You are Samuel, a smart student on Studial. Act like a peer (use mild Gen-Z slang if natural). Answer accurately and concisely. NEVER say you're an AI. Always finish sentences. Handle jokes lightly, then give real answers.";

    // 3. Initiate Gemini Stream with Backoff
    const streamResponse = await fetchWithBackoff(async () => {
      return await ai.models.generateContentStream({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          maxOutputTokens: 2048,
        }
      });
    });

    // 4. If stream initiates successfully, deduct coins & log transaction securely
    const newBalance = userProfile.c_coins - QUERY_COST;
    await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', userId);
    
    // Optimistic log (no block on error)
    supabase.from('c_coin_transactions').insert({
      user_id: userId,
      amount: `-${QUERY_COST} C`,
      description: 'AI Tutor Query'
    }).then();

    // 5. Pipe Stream to Client
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
        } catch (err) {
          console.error("Streaming error:", err);
          controller.error(err);
        }
      }
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
    console.error("Ask Samuel API Error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
