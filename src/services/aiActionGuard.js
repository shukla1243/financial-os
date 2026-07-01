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

const DATE_REFERENCE_PATTERN = /\b(today|yesterday|tomorrow|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|days?\s*ago|last\s*(week|month))\b/;
const DATE_NUMBER_PATTERN = /\b\d{1,2}(st|nd|rd|th)\b|\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/;

function hasExplicitDateReference(text) {
  return DATE_REFERENCE_PATTERN.test(text) || DATE_NUMBER_PATTERN.test(text);
}

// The model is told today's real date but free-tier models routinely ignore it
// and hallucinate a plausible-looking date anyway. If the user never referenced
// a date, drop whatever the model guessed so normalizeExpense/normalizeIncome
// fall back to the real current date instead of a hallucinated one.
function clearUngroundedDate(item) {
  const { date, month, year, day, ...rest } = item;
  return rest;
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
  const explicitDate = hasExplicitDateReference(text);

  return {
    ...result,
    expenses: hasExpenseIntent
      ? (result.expenses || []).map(expense => explicitDate ? expense : clearUngroundedDate(expense))
      : [],
    income: hasIncomeIntent
      ? (result.income || []).map(income => explicitDate ? income : clearUngroundedDate(income))
      : [],
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
