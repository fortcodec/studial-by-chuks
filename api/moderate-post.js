import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30; // 30 seconds limit

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required for moderation.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are an academic moderator for a university social platform. 
Your job is to classify the provided text as 'ALLOWED' or 'REJECTED'.
Reject if it is not related to education, university life, technology, studying, or career development.
Respond with EXACTLY ONE WORD: ALLOWED or REJECTED. Do not add any punctuation or extra text.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Text to moderate: "${content}"` }
    ]);
    
    const text = result.response.text().trim().toUpperCase();

    if (text === 'REJECTED') {
      return res.status(200).json({ status: 'REJECTED', message: 'Post violates academic guidelines.' });
    } else {
      return res.status(200).json({ status: 'ALLOWED' });
    }

  } catch (error) {
    console.error('Moderation error:', error);
    // Fail open if AI fails, so users aren't blocked
    return res.status(200).json({ status: 'ALLOWED' });
  }
}
