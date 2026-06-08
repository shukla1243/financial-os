import { calculateFinancialHealth } from './financialHealth';

test('new users have no financial health score', () => {
  expect(calculateFinancialHealth({ totalIncome: 0 })).toBeNull();
});

test('zero budgets do not inflate the score', () => {
  expect(calculateFinancialHealth({
    totalIncome: 10000,
    savingsRate: 30,
    budgets: { Other: 0 },
    hasIncomeEntries: true,
  })).toBe(50);
});

test('score is based on the current user financial inputs', () => {
  expect(calculateFinancialHealth({
    totalIncome: 10000,
    savingsRate: 20,
    budgets: { Food: 2000, Travel: 1000 },
    categorySpend: { Food: 1500, Travel: 1500 },
    goals: [{ saved: 500 }, { saved: 0 }],
    hasTransactions: true,
  })).toBe(58);
});

test('negative savings cannot produce a negative score', () => {
  expect(calculateFinancialHealth({
    totalIncome: 10000,
    savingsRate: -20,
    hasTransactions: true,
  })).toBe(0);
});
