import { parseTransactionDate } from './transactionNormalizer';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeSavingsContribution(contribution = {}, fallback = new Date()) {
  const parsedDate = parseTransactionDate(contribution.date, fallback);
  return {
    ...contribution,
    id: contribution.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: localIsoDate(parsedDate),
    month: MONTHS[parsedDate.getMonth()],
    year: parsedDate.getFullYear(),
    goalId: String(contribution.goalId || ''),
    goalName: contribution.goalName || 'Savings goal',
    amount: Number(contribution.amount) || 0,
  };
}

export function createGoalContribution(previousGoal, nextGoal, fallback = new Date()) {
  if (!previousGoal || !nextGoal) return null;
  const amount = (Number(nextGoal.saved) || 0) - (Number(previousGoal.saved) || 0);
  if (amount === 0) return null;
  return normalizeSavingsContribution({
    goalId: nextGoal.id,
    goalName: nextGoal.name,
    amount,
  }, fallback);
}

export function getMonthlySavings(contributions = [], month, year) {
  return contributions
    .filter(item => item.month === month && String(item.year) === String(year))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function calculateSavingsAccounting({ totalIncome = 0, totalExpenses = 0, contributions = [], month, year }) {
  const totalSavings = getMonthlySavings(contributions, month, year);
  const grossSurplus = Number(totalIncome) - Number(totalExpenses);
  return {
    totalSavings,
    grossSurplus,
    buffer: grossSurplus - totalSavings,
    savingsRate: Number(totalIncome) > 0 ? ((totalSavings / Number(totalIncome)) * 100).toFixed(1) : '0',
  };
}
