import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK
// The user must provide VITE_GEMINI_API_KEY in their .env file
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function askSamuel(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are Samuel, a friendly and helpful AI Tutor for a study platform called Studial. Your goal is to explain concepts clearly, without dense academic jargon. Use step-by-step breakdowns when appropriate.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error communicating with Samuel (Gemini API):", error);
    throw error;
  }
}
