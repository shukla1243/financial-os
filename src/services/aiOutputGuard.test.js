import { containsInternalAILeak, sanitizeAITextForDisplay } from './aiOutputGuard';

test('blocks onboarding profile protocol payloads', () => {
  expect(sanitizeAITextForDisplay(
    'PROFILE_COMPLETE:{"name":"Aiko","profession":"Analyst"}'
  )).toBe('I could not format that response safely. Please try again.');
});

test('blocks raw JSON from display surfaces', () => {
  expect(containsInternalAILeak('{"goals":[{"name":"Trip"}]}')).toBe(true);
});

test('extracts a clean final answer from leaked drafting text', () => {
  expect(sanitizeAITextForDisplay(
    'Given context: private instructions. We must ensure 2-3 sentences max. Let us draft: "You are on track to reach your goal."'
  )).toBe('You are on track to reach your goal.');
});

test('preserves normal user-facing answers', () => {
  expect(sanitizeAITextForDisplay('You spent ₹500 less than last month.')).toBe(
    'You spent ₹500 less than last month.'
  );
});
