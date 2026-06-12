const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseTransactionDate(value, fallback = new Date()) {
  const text = String(value || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = isoMatch
    ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}

function extractNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]) || 0;
  }
  return 0;
}

export function enrichExpenseContext(expense = {}) {
  const context = `${expense.description || ''} ${expense.note || ''}`;
  const odometer = Number(expense.odometer) || extractNumber(context, [
    /\bodometer\s*[:=-]?\s*(\d+(?:\.\d+)?)/i,
    /\bodo\s*(?:meter)?\s*[:=-]?\s*(\d+(?:\.\d+)?)/i,
  ]);
  const pricePerLitre = Number(expense.pricePerLitre) || extractNumber(context, [
    /\bprice\s*per\s*lit(?:re|er)\s*[:=-]?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i,
    /\brate\s*(?:of|is|:|=|-)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*\/?\s*l(?:itre|iter)?\b/i,
  ]);
  return { ...expense, odometer: odometer || '', pricePerLitre: pricePerLitre || '' };
}

export function normalizeExpense(expense = {}, fallback = new Date()) {
  const enriched = enrichExpenseContext(expense);
  const parsedDate = parseTransactionDate(enriched.date, fallback);
  return {
    ...enriched,
    id: enriched.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: localIsoDate(parsedDate),
    month: MONTHS[parsedDate.getMonth()],
    year: parsedDate.getFullYear(),
    day: DAYS[parsedDate.getDay()],
    amount: Number(enriched.amount) || 0,
    note: enriched.note || '',
  };
}

export function normalizeIncome(income = {}, fallback = new Date()) {
  const parsedDate = parseTransactionDate(income.date, fallback);
  return {
    ...income,
    id: income.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: localIsoDate(parsedDate),
    month: MONTHS[parsedDate.getMonth()],
    year: parsedDate.getFullYear(),
    amount: Number(income.amount) || 0,
    note: income.note || '',
  };
}
