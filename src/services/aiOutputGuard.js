const SAFE_FALLBACK = 'I could not format that response safely. Please try again.';

const INTERNAL_MARKERS = [
  'profile_complete:',
  'given context:',
  'system prompt',
  'developer message',
  'chain of thought',
  'let us draft:',
  "let's draft:",
  'we need to',
  'we must ensure',
  '2-3 sentences max',
  'respond only with',
];

function stripDraftWrapper(text) {
  const draftMatch = text.match(/(?:let us|let's)\s+draft\s*:\s*([\s\S]+)$/i);
  if (!draftMatch) return '';

  return draftMatch[1]
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function containsInternalAILeak(text) {
  const value = String(text || '').trim();
  const lower = value.toLowerCase();
  const looksLikeRawJson = /^[\[{]/.test(value) || /^```(?:json)?/i.test(value);
  return looksLikeRawJson || INTERNAL_MARKERS.some(marker => lower.includes(marker));
}

export function sanitizeAITextForDisplay(text, fallback = SAFE_FALLBACK) {
  const value = String(text || '').trim();
  if (!value) return fallback;
  if (!containsInternalAILeak(value)) return value;

  const draft = stripDraftWrapper(value);
  if (draft && !containsInternalAILeak(draft)) return draft;

  return fallback;
}

export { SAFE_FALLBACK };
