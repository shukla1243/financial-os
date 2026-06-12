export function calculateGoalSavings(goals = []) {
  return goals.reduce((sum, goal) => sum + (Number(goal.saved) || 0), 0);
}

export function calculateNetWorth({ cashBuffer = 0, savings = 0, investments = 0, crypto = 0 }) {
  return Number(cashBuffer) + Number(savings) + Number(investments) + Number(crypto);
}
