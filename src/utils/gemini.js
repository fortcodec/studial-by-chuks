import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabaseClient';

export async function askSamuel(prompt) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GEMINI_API_KEY is missing. AI Tutor will not function.");
      return "AI Tutor is currently unavailable. Please configure the API key.";
    }
    
    // Initialize the Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

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

let cachedSamuelId = null;

export async function getSamuelProfileId() {
  if (cachedSamuelId) return cachedSamuelId;
  
  const SAMUEL_UUID = '00000000-0000-0000-0000-000000samuel'; // Deterministic fallback
  
  try {
    // Check if Samuel exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'Samuel')
      .single();

    if (data && data.id) {
      cachedSamuelId = data.id;
      return cachedSamuelId;
    }

    // Generate deterministic UUID for Samuel
    // In PostgreSQL UUID v4 format.
    const deterministicId = '00000000-0000-4000-a000-000000000000';
    
    // Try to insert Samuel
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: deterministicId,
        username: 'Samuel',
        full_name: 'Samuel (AI)',
        role: 'ai',
      }, { onConflict: 'username' })
      .select('id')
      .single();

    if (insertData && insertData.id) {
      cachedSamuelId = insertData.id;
      return cachedSamuelId;
    } else if (insertError) {
      console.warn("Failed to create Samuel's profile in DB. RLS or foreign key might block it.", insertError);
      return deterministicId;
    }
  } catch (err) {
    console.warn("Error getting Samuel profile ID:", err);
  }
  
  return '00000000-0000-4000-a000-000000000000'; // Fallback
}
