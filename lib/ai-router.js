import { GoogleGenAI, ThinkingLevel } from '@google/genai';

/**
 * Studial Centralized AI Router & Multi-Model Engine
 * 
 * Dual-Model Architecture:
 * - Premium Quiz Engine: gemini-3.1-pro (configured with ThinkingLevel.MEDIUM for deep reasoning)
 * - AI Sentinel Moderation & Samuel Study Chat: gemini-3.5-flash (ultra-low latency)
 * 
 * NOTE: All legacy references to gemini-1.5-flash have been deprecated and replaced.
 */

export const AI_MODELS = Object.freeze({
  /** Premium reasoning model for university-level quiz synthesis */
  PREMIUM_QUIZ: 'gemini-3.1-pro',
  /** High-speed model for campus moderation */
  SENTINEL: 'gemini-3.5-flash',
  /** High-speed model for Samuel study chat tutor */
  SAMUEL_CHAT: 'gemini-3.5-flash',
  /** @deprecated Replaced by gemini-3.5-flash across all services */
  DEPRECATED_GEMINI_1_5_FLASH: 'gemini-1.5-flash',
});

export const THINKING_TIERS = Object.freeze({
  MINIMAL: ThinkingLevel?.MINIMAL || 'MINIMAL',
  LOW: ThinkingLevel?.LOW || 'LOW',
  MEDIUM: ThinkingLevel?.MEDIUM || 'MEDIUM',
  HIGH: ThinkingLevel?.HIGH || 'HIGH',
});

// Default configuration constants
const DEFAULT_TIMEOUT_QUIZ_MS = 60000;       // 60s for deep reasoning on pro model
const DEFAULT_TIMEOUT_SENTINEL_MS = 10000;   // 10s for fast binary moderation
const DEFAULT_TIMEOUT_CHAT_MS = 30000;       // 30s for study tutor chat

/**
 * System Prompts
 */
export const SYSTEM_PROMPTS = Object.freeze({
  QUIZ_PROFESSOR: `You are an esteemed university professor and academic curriculum specialist.
Your mission is to meticulously analyze the provided academic material (pdfText), identify the most critical foundational concepts, theories, analytical methodologies, and nuanced takeaways, and synthesize them into a rigorous JSON array of multiple-choice questions for university students.

Strict Pedagogical Guidelines:
1. Act strictly as a university professor. Questions must challenge students on conceptual depth, critical application, synthesis, and problem solving, avoiding superficial trivia.
2. Return ONLY a valid JSON array of question objects without conversational preambles, notes, or markdown commentary.
3. Every question object in the array MUST strictly conform to this JSON schema:
   - "id": integer starting at 1
   - "question": string containing the question prompt
   - "options": array of 4 distinct, plausible, university-level answer choices
   - "correctAnswer": string (must exactly match one of the entries in the "options" array)
   - "explanation": string providing a clear pedagogical explanation of why the correct answer is right and why the alternative distractors are incorrect.
4. Output must be strictly valid JSON.`,

  SENTINEL_MODERATION: 'Analyze this text for toxic campus drama, hate speech, or bullying. Return only the string FLAG or SAFE.',

  SAMUEL_STUDY_CHAT: `You are Samuel, an expert academic tutor and study mentor for university students on Studial.
Your goal is to help university students deeply understand concepts, master complex topics, and succeed in their coursework.
When interacting with students:
- Respond specifically as an academic tutor for university students.
- Analyze the user question or post content and provide a helpful, structured, and concise breakdown.
- Tailor explanations to the student's department and course topic when provided.
- Use clear formatting with bullet points, numbered steps, and key takeaways where helpful.
- Support mathematical expressions with LaTeX syntax ($...$ or $$...$$) and code with markdown blocks.
- Maintain an intellectual, encouraging, and supportive tone.
- Never state that you are an AI or language model; speak naturally as Samuel, their trusted academic mentor on Studial.`,
});

/**
 * Retrieve or initialize the Google GenAI client instance.
 * @param {string} [customApiKey] Optional API key override
 * @returns {GoogleGenAI}
 */
export function getGenAIClient(customApiKey) {
  const apiKey =
    customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY or VITE_GEMINI_API_KEY.'
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Utility helper to run an async operation with an AbortSignal timeout.
 * @template T
 * @param {function(AbortSignal): Promise<T>} operation
 * @param {number} timeoutMs
 * @param {string} timeoutMessage
 * @returns {Promise<T>}
 */
async function withTimeout(operation, timeoutMs, timeoutMessage) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const timeoutErr = new Error(timeoutMessage);
          timeoutErr.name = 'TimeoutError';
          timeoutErr.isTimeout = true;
          reject(timeoutErr);
        });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Robust JSON extraction helper that parses raw model output,
 * stripping markdown fences or stray whitespace if present.
 * @param {string} text
 * @returns {any}
 */
function parseJsonSafely(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty response received from model.');
  }

  const trimmed = text.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch (initialErr) {
    // Attempt fallback heuristic: locate the first '[' and last ']' or first '{' and last '}'
    const firstBracket = candidate.indexOf('[');
    const lastBracket = candidate.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const slice = candidate.substring(firstBracket, lastBracket + 1);
      return JSON.parse(slice);
    }

    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = candidate.substring(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    }

    throw new Error(`Failed to parse model output as valid JSON: ${initialErr.message}`);
  }
}

/**
 * Extract text safely across different SDK response representations.
 * @param {any} response
 * @returns {string}
 */
function extractResponseText(response) {
  if (!response) return '';
  if (typeof response.text === 'function') {
    return response.text();
  }
  if (typeof response.text === 'string') {
    return response.text;
  }
  if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  return '';
}

/**
 * -----------------------------------------------------------------------------
 * PREMIUM QUIZ ENGINE (gemini-3.1-pro)
 * -----------------------------------------------------------------------------
 * Paid C-Coin feature that activates deep reasoning ('Medium' tier) on gemini-3.1-pro
 * to extract key concepts from pdfText into a university-level multiple-choice quiz.
 * 
 * @param {string} pdfText - Extracted text content from course PDF/slides/document
 * @param {Object} [options]
 * @param {number} [options.questionCount=5] - Number of questions to generate
 * @param {number} [options.timeoutMs=60000] - Request timeout in milliseconds
 * @param {string} [options.apiKey] - Optional custom API key
 * @returns {Promise<{
 *   success: boolean,
 *   questions: Array<{ id: number, question: string, options: string[], correctAnswer: string, explanation: string }>,
 *   model?: string,
 *   thinkingTier?: string,
 *   timedOut?: boolean,
 *   error?: string,
 *   message?: string
 * }>}
 */
export async function generatePremiumQuiz(pdfText, options = {}) {
  const {
    questionCount = 5,
    timeoutMs = DEFAULT_TIMEOUT_QUIZ_MS,
    apiKey,
  } = options;

  // Validation
  if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length === 0) {
    return {
      success: false,
      timedOut: false,
      error: 'INVALID_INPUT',
      message: 'pdfText is required and must contain readable study material.',
      questions: [],
    };
  }

  const promptContent = `Extract key concepts and generate a rigorous ${questionCount}-question multiple-choice quiz based on the following university study material:\n\n=== BEGIN MATERIAL ===\n${pdfText.trim()}\n=== END MATERIAL ===`;

  try {
    const ai = getGenAIClient(apiKey);

    const response = await withTimeout(
      async (signal) => {
        return await ai.models.generateContent({
          model: AI_MODELS.PREMIUM_QUIZ,
          contents: promptContent,
          config: {
            systemInstruction: SYSTEM_PROMPTS.QUIZ_PROFESSOR,
            // Reasoning/thinking configuration parameter set to 'Medium' tier
            thinkingConfig: {
              thinkingLevel: THINKING_TIERS.MEDIUM,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              description: 'Array of university-level multiple-choice quiz questions',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'INTEGER' },
                  question: { type: 'STRING' },
                  options: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                  correctAnswer: { type: 'STRING' },
                  explanation: { type: 'STRING' },
                },
                required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
              },
            },
            abortSignal: signal,
          },
        });
      },
      timeoutMs,
      `University Professor Quiz Engine timed out after ${Math.round(timeoutMs / 1000)} seconds.`
    );

    const rawText = extractResponseText(response);
    const parsedData = parseJsonSafely(rawText);

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error('Model returned an empty or non-array JSON structure.');
    }

    // Sanitize and validate questions
    const sanitizedQuestions = parsedData.map((q, idx) => ({
      id: Number(q.id) || idx + 1,
      question: String(q.question || `Question ${idx + 1}`),
      options: Array.isArray(q.options)
        ? q.options.map(String)
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: String(q.correctAnswer || (q.options && q.options[0]) || ''),
      explanation: String(q.explanation || 'No explanation provided.'),
    }));

    return {
      success: true,
      timedOut: false,
      model: AI_MODELS.PREMIUM_QUIZ,
      thinkingTier: 'Medium',
      questions: sanitizedQuestions,
      count: sanitizedQuestions.length,
      usage: response?.usageMetadata || null,
    };
  } catch (error) {
    const isTimeout =
      error?.isTimeout === true ||
      error?.name === 'TimeoutError' ||
      error?.name === 'AbortError' ||
      error?.message?.includes('timed out');

    console.error('[Studial AI Router] generatePremiumQuiz error:', {
      isTimeout,
      message: error?.message,
      stack: error?.stack,
    });

    if (isTimeout) {
      return {
        success: false,
        timedOut: true,
        error: 'QUIZ_ENGINE_TIMEOUT',
        message:
          'The University Professor Quiz Engine timed out while processing with deep reasoning. No C-Coins have been deducted. Please try again with a shorter excerpt or retry in a few moments.',
        questions: [],
      };
    }

    return {
      success: false,
      timedOut: false,
      error: error?.code || 'QUIZ_GENERATION_FAILED',
      message: error?.message || 'Failed to generate quiz from the provided PDF text.',
      questions: [],
    };
  }
}

/**
 * -----------------------------------------------------------------------------
 * AI SENTINEL MODERATION (gemini-3.5-flash)
 * -----------------------------------------------------------------------------
 * Lightning-fast campus moderation model returning strictly binary 'FLAG' or 'SAFE'.
 * Replaces all previous references to gemini-1.5-flash.
 * 
 * @param {string} postText - Text of campus post, comment, or message to inspect
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=10000] - Moderation timeout limit (10s default)
 * @param {string} [options.apiKey] - Optional custom API key
 * @returns {Promise<'FLAG' | 'SAFE'>} - Returns strictly the string 'FLAG' or 'SAFE'
 */
export async function runSentinelModeration(postText, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_SENTINEL_MS,
    apiKey,
  } = options;

  // Edge case: Empty or non-string content is safe
  if (!postText || typeof postText !== 'string' || postText.trim().length === 0) {
    return 'SAFE';
  }

  try {
    const ai = getGenAIClient(apiKey);

    const response = await withTimeout(
      async (signal) => {
        return await ai.models.generateContent({
          model: AI_MODELS.SENTINEL,
          contents: `Content to evaluate:\n"""\n${postText.trim()}\n"""`,
          config: {
            systemInstruction: SYSTEM_PROMPTS.SENTINEL_MODERATION,
            maxOutputTokens: 16,
            temperature: 0.0, // Maximum determinism for binary classification
            abortSignal: signal,
          },
        });
      },
      timeoutMs,
      `Sentinel moderation timed out after ${Math.round(timeoutMs / 1000)} seconds.`
    );

    const outputText = extractResponseText(response).trim().toUpperCase();

    // Binary decision: Return strictly 'FLAG' or 'SAFE'
    if (outputText.includes('FLAG')) {
      return 'FLAG';
    }
    return 'SAFE';
  } catch (error) {
    const isTimeout =
      error?.isTimeout === true ||
      error?.name === 'TimeoutError' ||
      error?.name === 'AbortError' ||
      error?.message?.includes('timed out');

    console.warn('[Studial AI Router] runSentinelModeration fallback triggered:', {
      isTimeout,
      error: error?.message,
    });

    // Fail-safe: In academic social networks, fail open to avoid false shadow bans
    // while logging error for security observability.
    return 'SAFE';
  }
}

/**
 * Detailed variant of runSentinelModeration that returns an informative object.
 * @param {string} postText
 * @param {Object} [options]
 * @returns {Promise<{ verdict: 'FLAG' | 'SAFE', isFlagged: boolean, timedOut: boolean, model: string }>}
 */
export async function runSentinelModerationDetailed(postText, options = {}) {
  const verdict = await runSentinelModeration(postText, options);
  return {
    verdict,
    isFlagged: verdict === 'FLAG',
    model: AI_MODELS.SENTINEL,
  };
}

/**
 * -----------------------------------------------------------------------------
 * SAMUEL STUDY CHAT (gemini-3.5-flash)
 * -----------------------------------------------------------------------------
 * Standard study mentor and academic tutor chat using gemini-3.5-flash.
 * 
 * Supports both full non-streaming generation and streaming generators.
 */

/**
 * Run a standard non-streaming study consultation with Samuel.
 * @param {string | Array<{ role: string, parts: Array<{ text: string }> }>} promptOrMessages
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=30000]
 * @param {string} [options.department]
 * @param {string} [options.topic]
 * @param {string} [options.apiKey]
 * @returns {Promise<{ success: boolean, text: string, timedOut?: boolean, error?: string, model: string }>}
 */
export async function runSamuelChat(promptOrMessages, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_CHAT_MS,
    department,
    topic,
    apiKey,
  } = options;

  let contents = promptOrMessages;
  if (typeof promptOrMessages === 'string') {
    const contextPrefix = [
      department ? `Student Department: ${department}` : null,
      topic ? `Course Topic: ${topic}` : null,
    ].filter(Boolean).join(' | ');

    contents = contextPrefix
      ? `[Context: ${contextPrefix}]\n\n${promptOrMessages}`
      : promptOrMessages;
  }

  try {
    const ai = getGenAIClient(apiKey);

    const response = await withTimeout(
      async (signal) => {
        return await ai.models.generateContent({
          model: AI_MODELS.SAMUEL_CHAT,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPTS.SAMUEL_STUDY_CHAT,
            maxOutputTokens: 2048,
            temperature: 0.7,
            abortSignal: signal,
          },
        });
      },
      timeoutMs,
      `Samuel took too long to respond (${Math.round(timeoutMs / 1000)}s timeout).`
    );

    const replyText = extractResponseText(response);

    return {
      success: true,
      text: replyText,
      model: AI_MODELS.SAMUEL_CHAT,
      usage: response?.usageMetadata || null,
    };
  } catch (error) {
    const isTimeout =
      error?.isTimeout === true ||
      error?.name === 'TimeoutError' ||
      error?.name === 'AbortError' ||
      error?.message?.includes('timed out');

    console.error('[Studial AI Router] runSamuelChat error:', {
      isTimeout,
      message: error?.message,
    });

    if (isTimeout) {
      return {
        success: false,
        timedOut: true,
        error: 'CHAT_TIMEOUT',
        text: 'Samuel took too long to respond. Please try again.',
        model: AI_MODELS.SAMUEL_CHAT,
      };
    }

    return {
      success: false,
      timedOut: false,
      error: error?.code || 'CHAT_ERROR',
      text: 'Sorry, I encountered an issue processing your study inquiry. Please try again.',
      model: AI_MODELS.SAMUEL_CHAT,
    };
  }
}

/**
 * Stream a study consultation with Samuel (for Server-Sent Events or Web Streams).
 * @param {string | Array<any>} promptOrMessages
 * @param {Object} [options]
 * @returns {Promise<AsyncGenerator<string, void, unknown>>}
 */
export async function streamSamuelChat(promptOrMessages, options = {}) {
  const {
    department,
    topic,
    apiKey,
  } = options;

  let contents = promptOrMessages;
  if (typeof promptOrMessages === 'string') {
    const contextPrefix = [
      department ? `Student Department: ${department}` : null,
      topic ? `Course Topic: ${topic}` : null,
    ].filter(Boolean).join(' | ');

    contents = contextPrefix
      ? `[Context: ${contextPrefix}]\n\n${promptOrMessages}`
      : promptOrMessages;
  }

  const ai = getGenAIClient(apiKey);

  const streamResponse = await ai.models.generateContentStream({
    model: AI_MODELS.SAMUEL_CHAT,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPTS.SAMUEL_STUDY_CHAT,
      maxOutputTokens: 2048,
    },
  });

  return streamResponse;
}

export default {
  AI_MODELS,
  THINKING_TIERS,
  SYSTEM_PROMPTS,
  getGenAIClient,
  generatePremiumQuiz,
  runSentinelModeration,
  runSentinelModerationDetailed,
  runSamuelChat,
  streamSamuelChat,
};
