import { isValidMemoryObservation } from './memoryGuard';

test('rejects transient AI fallback messages', () => {
  expect(isValidMemoryObservation("I'm having trouble reaching AI services right now. Your data remains safe.")).toBe(false);
});

test('accepts stable user profile facts', () => {
  expect(isValidMemoryObservation('User works as a video editor.')).toBe(true);
});
