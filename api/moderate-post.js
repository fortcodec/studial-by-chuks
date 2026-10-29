import { runSentinelModeration } from '../lib/ai-router.js';

export const maxDuration = 30; // 30 seconds limit

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { content } = body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required for moderation.' });
    }

    // Run Sentinel binary moderation using gemini-3.5-flash
    const verdict = await runSentinelModeration(content, { timeoutMs: 15000 });

    if (verdict === 'FLAG') {
      return res.status(200).json({
        status: 'REJECTED',
        verdict: 'FLAG',
        message: 'Post flagged for toxic campus drama, hate speech, or bullying.',
      });
    }

    return res.status(200).json({
      status: 'ALLOWED',
      verdict: 'SAFE',
    });
  } catch (error) {
    console.error('Moderation error:', error);
    // Fail safe / open if AI fails, so students are not unjustly blocked
    return res.status(200).json({ status: 'ALLOWED', verdict: 'SAFE' });
  }
}
