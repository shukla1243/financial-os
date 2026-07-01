const normalize = value => String(value || '').toLowerCase();

function mentionsNamedItem(text, items) {
  return (items || []).some(item => {
    const name = normalize(item?.name);
    return name.length > 2 && text.includes(name);
  });
}

function mentionedItems(text, items) {
  return (items || []).filter(item => {
    const name = normalize(item?.name);
    return name.length > 2 && text.includes(name);
  });
}

export function guardParsedActions(result = {}, userText = '', state = {}) {
  const text = normalize(userText);
  const namedGoals = mentionedItems(text, state.savingsGoals);
  const hasExpenseIntent = /\b(spent|spend|bought|purchased|paid|expense|log expense|cost me)\b/.test(text)
    || /\bfor\s*(?:₹|rs\.?\s*)?\d+(?:\.\d+)?(?:k|000)?\b/.test(text);
  const hasIncomeIntent = /\b(received|earned|salary|income|got paid|payment from|freelance payment|credited)\b/.test(text);
  const hasGoalIntent = /\b(goal|target|saving goal|savings goal|goal fund)\b/.test(text)
    || (mentionsNamedItem(text, state.savingsGoals) && /\b(add|deposit|contribute|update|set|put|take|took|withdraw|remove)\b/.test(text));
  const hasBillIntent = /\b(pay|paid|mark)\b.*\b(bill|invoice|due)\b/.test(text)
    || (mentionsNamedItem(text, state.billCalendar) && /\b(pay|paid|mark)\b/.test(text));
  const hasDeleteIntent = /\b(delete|remove|undo|duplicate|duplicates)\b/.test(text);
  const namedBills = mentionedItems(text, state.billCalendar);
  const allowedGoalIds = namedGoals.length > 0
    ? new Set(namedGoals.map(goal => String(goal.id)))
    : state.savingsGoals?.length === 1 && hasGoalIntent
      ? new Set([String(state.savingsGoals[0].id)])
      : new Set();
  const allowedBillIds = namedBills.length > 0
    ? new Set(namedBills.map(bill => String(bill.id)))
    : state.billCalendar?.length === 1 && hasBillIntent
      ? new Set([String(state.billCalendar[0].id)])
      : new Set();
  const goals = hasGoalIntent
    ? (result.goals || []).filter(goal => allowedGoalIds.has(String(goal.id)))
    : [];
  const goalNeedsClarification = hasGoalIntent && (state.savingsGoals || []).length > 1 && namedGoals.length === 0;

  return {
    ...result,
    expenses: hasExpenseIntent ? result.expenses || [] : [],
    income: hasIncomeIntent ? result.income || [] : [],
    goals,
    bills: hasBillIntent
      ? (result.bills || []).filter(bill => allowedBillIds.has(String(bill.id)))
      : [],
    deletions: hasDeleteIntent ? result.deletions || [] : [],
    needsClarification: goalNeedsClarification || result.needsClarification === true,
    clarificationQuestion: goalNeedsClarification
      ? `Which savings goal should I update? ${state.savingsGoals.map(goal => goal.name).join(', ')}`
      : result.clarificationQuestion || '',
  };
}
