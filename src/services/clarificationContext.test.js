import { buildClarifiedInput } from './clarificationContext';

test('combines one pending request with its clarification', () => {
  expect(buildClarifiedInput('this month SIP 2500', 'add expense')).toBe(
    'Original request: this month SIP 2500\nUser clarification: add expense'
  );
});

test('uses the latest message when no clarification is pending', () => {
  expect(buildClarifiedInput('', 'coffee 200')).toBe('coffee 200');
});
