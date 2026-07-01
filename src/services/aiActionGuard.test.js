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

test('keeps an explicitly requested withdrawal from a named goal', () => {
  const result = guardParsedActions(
    { goals: [{ id: 1, saved: 4000 }] },
    'I took 1000 from my Delhi Trip',
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

test('removes historical expenses and income replayed during a goal withdrawal', () => {
  const result = guardParsedActions(
    {
      expenses: Array.from({ length: 15 }, (_, index) => ({ amount: index + 1 })),
      income: [{ amount: 1000 }, { amount: 2000 }],
      goals: [{ id: 1, saved: 5000 }],
    },
    'took 5k from the goal because I was low on money',
    { savingsGoals: [{ id: 1, name: 'Meeting Sneha' }] }
  );
  expect(result.expenses).toEqual([]);
  expect(result.income).toEqual([]);
  expect(result.goals).toEqual([{ id: 1, saved: 5000 }]);
});

test('asks which goal when a generic goal request is ambiguous', () => {
  const result = guardParsedActions(
    { goals: [{ id: 1, saved: 5000 }, { id: 2, saved: 2000 }] },
    'took 1k from the goal',
    { savingsGoals: [{ id: 1, name: 'Trip' }, { id: 2, name: 'Emergency' }] }
  );
  expect(result.goals).toEqual([]);
  expect(result.needsClarification).toBe(true);
  expect(result.clarificationQuestion).toContain('Trip');
});

test('removes a bill payment whose id does not match the named bill in state', () => {
  const result = guardParsedActions(
    { bills: [{ id: 1, status: 'Paid' }] },
    'paid my credit card bill 2922',
    { billCalendar: [{ id: 1719835200000, name: 'Credit Card' }] }
  );
  expect(result.bills).toEqual([]);
});

test('keeps a bill payment whose id matches the named bill in state', () => {
  const result = guardParsedActions(
    { bills: [{ id: 1719835200000, status: 'Paid' }] },
    'paid my credit card bill',
    { billCalendar: [{ id: 1719835200000, name: 'Credit Card' }] }
  );
  expect(result.bills).toHaveLength(1);
});

test('keeps an expense stated as "paid X for Y" without the word "for"', () => {
  const result = guardParsedActions(
    { expenses: [{ amount: 5000, category: 'Housing', description: 'Rent' }] },
    'paid rent 5k',
    {}
  );
  expect(result.expenses).toHaveLength(1);
});

test('keeps explicit expense and income actions', () => {
  expect(guardParsedActions({ expenses: [{ amount: 100 }] }, 'spent 100 on lunch', {}).expenses).toHaveLength(1);
  expect(guardParsedActions({ income: [{ amount: 5000 }] }, 'received 5000 salary', {}).income).toHaveLength(1);
});
