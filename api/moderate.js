import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Initialize Supabase Client with Service Role Key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

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

    // 2. Gemini AI Evaluation
    const prompt = `
Analyze this campus forum post. Does it contain hate speech, severe bullying, illegal content, or severe profanity?
Respond ONLY with a JSON object: { "flagged": true/false, "reason": "Brief explanation if flagged" }.
Post Content: "${content}"
    `;

    let aiResponse;
    try {
      // Timeout wrapper (15 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timed out')), 15000);
      });

      const aiPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              flagged: { type: "BOOLEAN" },
              reason: { type: "STRING" }
            },
            required: ["flagged", "reason"]
          }
        }
      });

      aiResponse = await Promise.race([aiPromise, timeoutPromise]);
    } catch (aiError) {
      console.error("AI Evaluation failed or timed out:", aiError);
      // Fallback: If AI fails, do not shadow ban. Let it pass regex or fail safe.
      return res.status(200).json({ status: 'ok', flagged: false, reason: 'AI service unavailable' });
    }

    let result = { flagged: false, reason: "" };
    
    try {
      const textResponse = aiResponse.text();
      result = JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback
      if (aiResponse && aiResponse.text && aiResponse.text().includes('"flagged": true')) {
         result = { flagged: true, reason: "AI flagged content but returned invalid JSON" };
      }
    }

    // 3. Database Update if Flagged
    if (result.flagged) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_shadow_banned: true, 
          shadow_ban_reason: result.reason || "Automated AI Flag" 
        })
        .eq('id', user_id);

      if (updateError) {
        console.error("Failed to update user profile:", updateError);
        return res.status(500).json({ error: 'Failed to apply shadow ban' });
      }

      console.log(`User ${user_id} was shadow banned. Reason: ${result.reason}`);
    }

    return res.status(200).json({ status: 'ok', flagged: result.flagged, reason: result.reason });
  } catch (error) {
    console.error("Moderation API Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
