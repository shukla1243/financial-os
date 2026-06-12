import { guardParsedActions } from './aiActionGuard';

test('removes hallucinated goal updates from an expense request', () => {
  const result = guardParsedActions(
    { expenses: [{ amount: 429 }], goals: [{ id: 1, saved: 5000 }] },
    'fresh wash for 429',
    { savingsGoals: [{ id: 1, name: 'Delhi Trip' }] }
  );
  expect(result.goals).toEqual([]);
  expect(result.expenses).toHaveLength(1);
});

test('keeps an explicitly requested named goal update', () => {
  const result = guardParsedActions(
    { goals: [{ id: 1, saved: 5000 }] },
    'add 500 to my Delhi Trip',
    { savingsGoals: [{ id: 1, name: 'Delhi Trip' }] }
  );
  expect(result.goals).toHaveLength(1);
});

test('removes hallucinated bill and deletion actions', () => {
  const result = guardParsedActions(
    { bills: [{ id: 1 }], deletions: [{ amount: 100 }] },
    'spent 100 on lunch',
    {}
  );
  expect(result.bills).toEqual([]);
  expect(result.deletions).toEqual([]);
});
