/**
 * AI Service for calling OpenRouter
 * Enforces use of free models to prevent rate limits and cost.
 */
import { GEMINI_KEY } from '../config';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODELS = [
  'google/gemini-2.5-flash:free',
  'google/gemini-2.5-flash-lite:free',
  'google/gemini-2.5-flash-exp:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'huggingfaceh4/zephyr-7b-beta:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free',
  'meta-llama/llama-3.2-1b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'liquid/lfm-40b:free',
  'openchat/openchat-7b:free',
  'gryphe/mythomax-l2-13b:free',
  'undi95/toppy-m-7b:free',
  'openrouter/free'
];

export async function callAI({ systemInstruction, contents, temperature = 0.7, maxTokens = 600, key = null }) {
  const apiKey = key || GEMINI_KEY;
  if (!apiKey) {
    throw new Error('API key is missing.');
  }

  // Convert Gemini payload format to OpenAI Chat format
  const messages = [];

  if (systemInstruction) {
    messages.push({
      role: 'system',
      content: systemInstruction
    });
  }

  // contents can be in format: [{ role: 'user' | 'model', parts: [{ text: '...' }] }]
  // Or it could be a simple prompt string.
  if (Array.isArray(contents)) {
    contents.forEach(msg => {
      const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user';
      const text = msg.parts?.[0]?.text || msg.content || msg.text || '';
      messages.push({ role, content: text });
    });
  } else if (typeof contents === 'string') {
    messages.push({ role: 'user', content: contents });
  }

  let lastError = null;
  for (const model of FREE_MODELS) {
    try {
      console.log(`[aiService] Attempting LLM request with model: ${model}`);
      const res = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Financial OS',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Status code ${res.status}`);
      }

      // Return formatted response compatible with the original Gemini parsing structure
      const content = data.choices?.[0]?.message?.content || '';
      return {
        candidates: [
          {
            content: {
              parts: [{ text: content }]
            }
          }
        ]
      };
    } catch (e) {
      console.warn(`[aiService] Failed with model ${model}: ${e.message}. Attempting fallback...`);
      lastError = e;
    }
  }

  throw new Error(`All fallback models failed. Last error: ${lastError?.message}`);
}

export async function extractProfileFact(userMessage, apiKey) {
  const prompt = `You are a user profile memory extractor. Analyze the user's message and determine if the user has shared any new, stable facts about themselves, their job, their location, their preferences, their life, or recurring finances (e.g., "I am a freelancer", "I bought a bike", "I got a dog", "My salary changed to 20k", "I am a teacher", "I want to save for a laptop").
  
If they revealed something new, write a ONE-sentence factual observation about them (e.g., "User is a freelancer", "User is a teacher", "User wants to save for a laptop").
If they did not reveal any new personal profile facts (e.g. they just asked a financial question, logged an expense, or chatted generally), reply ONLY with the word "NONE". Do not write any explanation.`;

  try {
    const data = await callAI({
      systemInstruction: prompt,
      contents: userMessage,
      temperature: 0.1,
      maxTokens: 100,
      key: apiKey
    });
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NONE';
    if (result.toUpperCase() === 'NONE' || result.includes('NONE') || result.length < 3) return null;
    return result;
  } catch (e) {
    return null;
  }
}
