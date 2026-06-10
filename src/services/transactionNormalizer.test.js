import { normalizeExpense, normalizeIncome } from './transactionNormalizer';

test('derives tracker date fields from the authoritative date', () => {
  expect(normalizeExpense({ date: '2026-06-06', month: '', year: '', day: '' }, new Date(2020, 0, 1))).toMatchObject({
    date: '2026-06-06',
    month: 'Jun',
    year: 2026,
    day: 'Sat',
  });
});

test('uses a fallback date when AI omits or returns an invalid date', () => {
  expect(normalizeExpense({ date: 'not-a-date' }, new Date(2026, 5, 11))).toMatchObject({
    date: '2026-06-11',
    month: 'Jun',
    year: 2026,
    day: 'Thu',
  });
});

test('normalizes income month and year too', () => {
  expect(normalizeIncome({ date: '2025-12-31', amount: '500' })).toMatchObject({
    date: '2025-12-31',
    month: 'Dec',
    year: 2025,
    amount: 500,
  });
});
