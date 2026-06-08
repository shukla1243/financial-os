const TRANSIENT_PATTERNS = [
  'having trouble reaching ai services',
  'your data remains safe',
  'please try again shortly',
  'something went wrong',
  'too many requests',
  'rate limit',
  'temporarily unavailable',
  'overloaded',
  'ai is taking too long',
];

export function isValidMemoryObservation(observation) {
  const value = String(observation || '').trim().toLowerCase();
  return value.length >= 3 && !TRANSIENT_PATTERNS.some(pattern => value.includes(pattern));
}
