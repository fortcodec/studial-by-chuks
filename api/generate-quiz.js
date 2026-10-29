import { createClient } from '@supabase/supabase-js';
import { generatePremiumQuiz } from '../lib/ai-router.js';

export const maxDuration = 60; // 60 seconds limit for serverless execution
export const config = {
  maxDuration: 60,
};

const QUIZ_COST = 5; // C-Coin cost for premium quiz generation with deep reasoning

/**
 * API Route Handler for Studial Premium Quiz Engine (gemini-3.1-pro)
 * Generates university-level multiple-choice questions from lecture / study material.
 */
export default async function handler(req, res) {
  // CORS Preflight
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
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ error: errorMsg });
    }
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { pdfText, userId, questionCount = 5 } = body;

    if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length === 0) {
      const errPayload = { error: 'Missing pdfText parameter for quiz generation.' };
      if (res && typeof res.status === 'function') {
        return res.status(400).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional user coin validation if userId provided
    let userProfile = null;
    if (userId) {
      const { data, error: userError } = await supabase
        .from('profiles')
        .select('c_coins')
        .eq('id', userId)
        .single();

      if (!userError && data) {
        userProfile = data;
        if (userProfile.c_coins < QUIZ_COST) {
          const errPayload = {
            error: 'INSUFFICIENT_COINS',
            message: `Insufficient C-Coins. Premium Professor Quiz requires ${QUIZ_COST} C-Coins. You have ${userProfile.c_coins} C-Coins.`,
            required: QUIZ_COST,
            current: userProfile.c_coins,
          };
          if (res && typeof res.status === 'function') {
            return res.status(402).json(errPayload);
          }
          return new Response(JSON.stringify(errPayload), {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Call centralized Gemini 3.1 Pro Quiz Engine with Medium thinking tier
    const result = await generatePremiumQuiz(pdfText, {
      questionCount: Number(questionCount) || 5,
      timeoutMs: 55000,
    });

    if (!result.success) {
      // If timed out or failed, no coins are deducted!
      const status = result.timedOut ? 504 : 500;
      if (res && typeof res.status === 'function') {
        return res.status(status).json(result);
      }
      return new Response(JSON.stringify(result), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Deduct coins only after successful generation
    if (userId && userProfile) {
      const newBalance = Math.max(0, userProfile.c_coins - QUIZ_COST);
      await supabase.from('profiles').update({ c_coins: newBalance }).eq('id', userId);

      supabase.from('c_coin_transactions').insert({
        user_id: userId,
        amount: `-${QUIZ_COST} C`,
        description: 'Premium AI Professor Quiz Generation',
      }).catch(err => console.warn('[Quiz] Transaction log error:', err));
    }

    if (res && typeof res.status === 'function') {
      return res.status(200).json(result);
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Quiz API] Fatal error:', error);
    const errPayload = {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Internal server error while generating quiz.',
    };
    if (res && typeof res.status === 'function') {
      return res.status(500).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
