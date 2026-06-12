import { calculateSavingsAccounting, createGoalContribution, getMonthlySavings } from './savingsAccounting';

test('goal balance increases create a dated savings contribution', () => {
  const contribution = createGoalContribution(
    { id: 1, name: 'Emergency fund', saved: 1000 },
    { id: 1, name: 'Emergency fund', saved: 1500 },
    new Date(2026, 5, 13)
  );
  expect(contribution).toMatchObject({
    goalId: '1', goalName: 'Emergency fund', amount: 500,
    date: '2026-06-13', month: 'Jun', year: 2026,
  });
});

test('goal withdrawals reduce savings without becoming expenses', () => {
  const contribution = createGoalContribution(
    { id: 1, name: 'Emergency fund', saved: 1500 },
    { id: 1, name: 'Emergency fund', saved: 1200 },
    new Date(2026, 5, 13)
  );
  expect(contribution.amount).toBe(-300);
});

test('monthly savings only includes contributions from the selected month', () => {
  expect(getMonthlySavings([
    { month: 'Jun', year: 2026, amount: 500 },
    { month: 'Jun', year: 2026, amount: -100 },
    { month: 'May', year: 2026, amount: 900 },
  ], 'Jun', 2026)).toBe(400);
});

test('savings reduce spendable buffer but do not inflate expenses', () => {
  expect(calculateSavingsAccounting({
    totalIncome: 10000,
    totalExpenses: 3000,
    contributions: [{ month: 'Jun', year: 2026, amount: 2000 }],
    month: 'Jun',
    year: 2026,
  })).toEqual({
    totalSavings: 2000,
    grossSurplus: 7000,
    buffer: 5000,
    savingsRate: '20.0',
  });
});
