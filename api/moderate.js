import { createClient } from '@supabase/supabase-js';
import { runSentinelModeration } from '../lib/ai-router.js';

// Initialize Supabase Client with Service Role Key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Comprehensive baseline list of generic offensive terms, hate speech, and severe profanity
const flaggedKeywords = [
  'kill', 'murder', 'suicide', 'die', 'bomb', 'terrorist', 'shoot', 'gun', 'weapon',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kyps', 'kys', 'rape', 'assault',
  'pedophile', 'pedo', 'childporn', 'cp', 'slut', 'whore', 'cunt', 'bitch', 'motherfucker',
  'dick', 'cock', 'pussy', 'nazi', 'hitler', 'slave', 'chink', 'spic', 'wetback'
];

export default async function handler(req, res) {
  // Allow CORS for local development if needed, though Vercel handles this mostly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { post_id, content, user_id, type = 'post' } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!content || !user_id) {
      return res.status(400).json({ error: 'Missing content or user_id' });
    }

    // 1. Cost-Control Regex / Keyword Check
    const lowerContent = content.toLowerCase();
    const containsKeyword = flaggedKeywords.some(kw => {
      // Create a regex to match the keyword as a whole word to reduce false positives
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerContent);
    });

    if (!containsKeyword) {
      return res.status(200).json({ status: 'ok', flagged: false, reason: 'Passed regex check' });
    }

    // 2. AI Sentinel Evaluation (gemini-3.5-flash)
    const verdict = await runSentinelModeration(content, { timeoutMs: 15000 });
    const isFlagged = verdict === 'FLAG';
    const reason = isFlagged ? 'Toxic campus drama, hate speech, or bullying detected by Sentinel' : '';

    // 3. Database Update if Flagged
    if (isFlagged) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_shadow_banned: true, 
          shadow_ban_reason: reason || "Automated AI Flag" 
        })
        .eq('id', user_id);

      if (updateError) {
        console.error("Failed to update user profile:", updateError);
        return res.status(500).json({ error: 'Failed to apply shadow ban' });
      }

      console.log(`User ${user_id} was shadow banned by Sentinel. Reason: ${reason}`);
    }

    return res.status(200).json({ status: 'ok', flagged: isFlagged, reason });
  } catch (error) {
    console.error("Moderation API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
