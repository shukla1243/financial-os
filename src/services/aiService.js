/**
 * AI Service for calling OpenRouter
 * Enforces use of free models to prevent rate limits and cost.
 */
import { PROXY_URL } from '../config';
import { getCurrentUser } from './googleAuth';
import { proxyAI } from './proxyService';

const inFlightRequests = new Map();
const AI_TIMEOUT_MS = 25000;

export async function callAI({ systemInstruction, contents, temperature = 0.7, maxTokens = 600 }) {
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

  const user = getCurrentUser();
  if (!PROXY_URL || !user?.email) throw new Error('Authenticated AI gateway is unavailable.');
  const request = { messages, temperature, maxTokens };
  const requestKey = `${user.sub}:${JSON.stringify(request)}`;
  if (inFlightRequests.has(requestKey)) return inFlightRequests.get(requestKey);

  const pending = Promise.race([
    proxyAI(PROXY_URL, user.email, request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS)
    )
  ])
    .then(data => {
      const content = String(data?.content || '').trim();
      if (!content) throw new Error('AI gateway returned an empty response.');
      return { candidates: [{ content: { parts: [{ text: content }] } }] };
    })
    .catch((err) => {
      const msg = err?.message || '';
      if (msg === 'AI_TIMEOUT') {
        throw new Error('AI is taking too long to respond. Please try again.');
      }
      if (msg.toLowerCase().includes('rate limit')) {
        throw new Error("You've sent too many requests. Please wait 60 seconds.");
      }
      throw err;
    })
    .finally(() => inFlightRequests.delete(requestKey));
  inFlightRequests.set(requestKey, pending);
  return pending;
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
