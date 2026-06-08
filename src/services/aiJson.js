export function extractJsonObject(text, marker = '') {
  const source = String(text || '');
  const marked = marker && source.includes(marker) ? source.slice(source.indexOf(marker) + marker.length) : source;
  const cleaned = marked.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('AI response did not contain JSON.');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error('AI response contained incomplete JSON.');
}
