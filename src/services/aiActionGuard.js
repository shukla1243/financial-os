const normalize = value => String(value || '').toLowerCase();

function mentionsNamedItem(text, items) {
  return (items || []).some(item => {
    const name = normalize(item?.name);
    return name.length > 2 && text.includes(name);
  });
}

export function guardParsedActions(result = {}, userText = '', state = {}) {
  const text = normalize(userText);
  const hasGoalIntent = /\b(goal|target|saving goal|savings goal|goal fund)\b/.test(text)
    || (mentionsNamedItem(text, state.savingsGoals) && /\b(add|deposit|contribute|update|set|put|take|took|withdraw|remove)\b/.test(text));
  const hasBillIntent = /\b(pay|paid|mark)\b.*\b(bill|invoice|due)\b/.test(text)
    || (mentionsNamedItem(text, state.billCalendar) && /\b(pay|paid|mark)\b/.test(text));
  const hasDeleteIntent = /\b(delete|remove|undo|duplicate|duplicates)\b/.test(text);

  return {
    ...result,
    goals: hasGoalIntent ? result.goals || [] : [],
    bills: hasBillIntent ? result.bills || [] : [],
    deletions: hasDeleteIntent ? result.deletions || [] : [],
  };
}
