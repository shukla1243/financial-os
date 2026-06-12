const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function calculateFinancialHealth({
  totalIncome,
  savingsRate,
  categorySpend = {},
  budgets = {},
  goals = [],
  hasTransactions = false,
  hasIncomeEntries = false,
  hasSavingsActivity = false,
}) {
  const applicableBudgets = Object.entries(budgets).filter(([, budget]) => Number(budget) > 0);
  const hasEnoughData = Number(totalIncome) > 0 &&
    (hasTransactions || hasIncomeEntries || hasSavingsActivity || applicableBudgets.length > 0);

  if (!hasEnoughData) return null;

  const safeSavingsRate = clamp(Number(savingsRate) || 0, 0, 100);
  const savingsScore = Math.min((safeSavingsRate / 30) * 50, 50);
  const compliantBudgets = applicableBudgets.filter(
    ([category, budget]) => (Number(categorySpend[category]) || 0) <= Number(budget)
  ).length;
  const budgetScore = applicableBudgets.length > 0
    ? (compliantBudgets / applicableBudgets.length) * 30
    : 0;
  const fundedGoals = goals.filter(goal => Number(goal.saved) > 0).length;
  const goalScore = goals.length > 0 ? Math.min((fundedGoals / goals.length) * 20, 20) : 0;

  return clamp(Math.round(savingsScore + budgetScore + goalScore), 0, 100);
}
