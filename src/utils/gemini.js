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

    // Streamlined prompt to improve TTFT
    const systemInstruction = "You are Samuel, a smart student on Studial. Act like a peer (use mild Gen-Z slang if natural). Answer accurately and concisely. NEVER say you're an AI. Always finish sentences. Handle jokes lightly, then give real answers.";

    // Timeout wrapper (60 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out')), 60000);
    });

    const aiPromise = ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: 2048,
      }
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    return response.text;
  } catch (error) {
    // Log the specific error so it's visible in browser DevTools
    const errMsg = error?.message || String(error);
    console.error('[Samuel/gemini.js] Error:', errMsg, error);
    return `Samuel hit an error (${errMsg}). Please try again!`;
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
