import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabaseClient';

export async function askSamuel(payloadOrPrompt, userId) {
  try {
    let payload = {};
    if (typeof payloadOrPrompt === 'string') {
      payload = { prompt: payloadOrPrompt };
    } else if (payloadOrPrompt && typeof payloadOrPrompt === 'object') {
      payload = { ...payloadOrPrompt };
    }

    const targetUserId = userId || payload.userId;
    let finalUserId = targetUserId;
    if (!finalUserId) {
      const { data } = await supabase.auth.getUser();
      finalUserId = data?.user?.id;
    }
    if (!finalUserId) throw new Error("You must be logged in to ask Samuel.");

    payload.userId = finalUserId;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    let response;
    try {
      response = await fetch('/api/ask-samuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detailedMessage = err.error || err.details || `Server returned HTTP ${response.status}`;
      console.error('[Samuel/gemini.js] Backend error response:', { status: response.status, error: detailedMessage, full: err });
      throw new Error(detailedMessage);
    }

    if (!response.body) {
      throw new Error("No response body received from API");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      aiResponse += decoder.decode(value, { stream: true });
    }
    return aiResponse;
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error('[Samuel/gemini.js] Request timed out after 50 seconds.');
      throw new Error('Samuel took too long to respond. Please try again.');
    }
    const errMsg = error?.message || String(error);
    console.error('[Samuel/gemini.js] Connection error:', errMsg, error);
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
