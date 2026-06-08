/**
 * SELF-EVOLVING CATEGORY SYSTEM
 * When AI detects an expense that doesn't match any existing category,
 * it proposes a new one. User confirms → category is created in Config sheet,
 * app adapts everywhere automatically. No code changes ever needed.
 */
import { callAI } from './aiService';

const CANONICAL_CATEGORY_KEYWORDS = {
  'Pet Care': ['pet', 'dog', 'cat', 'vet'],
  Food: [
    'food', 'tiffin', 'breakfast', 'lunch', 'dinner', 'meal', 'snack',
    'restaurant', 'cafe', 'coffee', 'tea', 'grocery', 'groceries',
    'swiggy', 'zomato',
  ],
  Transport: [
    'transport', 'petrol', 'diesel', 'fuel', 'uber', 'ola', 'auto',
    'taxi', 'cab', 'bus', 'train', 'metro', 'commute', 'parking', 'toll',
    'vehicle', 'bike', 'car', 'scooter', 'service', 'repair', 'tyre',
  ],
  Housing: [
    'housing', 'rent', 'maintenance', 'electricity', 'water bill',
    'gas bill', 'house', 'home',
  ],
  Health: [
    'health', 'doctor', 'hospital', 'medicine', 'pharmacy', 'medical',
    'clinic', 'gym',
  ],
  Telecom: [
    'telecom', 'recharge', 'mobile bill', 'phone bill', 'internet',
    'broadband', 'wifi',
  ],
  Subscriptions: ['subscription', 'netflix', 'spotify', 'youtube premium', 'prime'],
  Shopping: ['shopping', 'amazon', 'flipkart', 'clothes', 'clothing', 'shoes'],
  Entertainment: ['entertainment', 'movie', 'cinema', 'game', 'gaming', 'concert'],
  Education: ['education', 'course', 'tuition', 'book', 'books', 'exam'],
  Travel: ['travel', 'flight', 'hotel', 'trip', 'vacation'],
};

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function includesKeyword(text, keyword) {
  return ` ${text} `.includes(` ${normalizeText(keyword)} `);
}

function findExistingCategory(category, budgets) {
  const normalizedCategory = normalizeText(category);
  return Object.keys(budgets || {}).find(name => normalizeText(name) === normalizedCategory);
}

/**
 * Infer a broad, reusable category from the expense context.
 * Specific descriptions such as "tiffin" intentionally resolve to "Food".
 */
export function inferCanonicalCategory(expense) {
  const explicitCategory = String(expense?.category || '').replace(/^NEW:/i, '').trim();
  const context = normalizeText([
    expense?.description,
    expense?.note,
    explicitCategory,
  ].filter(Boolean).join(' '));

  for (const [category, keywords] of Object.entries(CANONICAL_CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => includesKeyword(context, keyword))) {
      return category;
    }
  }

  return explicitCategory || 'Other';
}

/**
 * Check if an AI-parsed expense category exists in current budgets.
 * Returns { known: true } or { known: false, suggestedCategory, suggestedBudget, icon, reason }
 */
export function checkCategoryExists(category, budgets) {
  const match = findExistingCategory(category, budgets);
  if (match) {
    return { known: true, normalizedCategory: match };
  }
  return { known: false };
}

/**
 * Ask Gemini to suggest a new category when an unknown one is detected.
 * Returns { categoryName, budget, icon, emoji, japaneseLabel, reason }
 */
export async function suggestNewCategory(geminiKey, expense, existingCategories) {
  const prompt = `You are a personal finance category advisor for an Indian user.

The user logged an expense that doesn't match any existing category:
- Description: "${expense.description}"
- Amount: ₹${expense.amount}
- Suggested Category: "${expense.category}"

Existing categories: ${existingCategories.join(', ')}

Your job: Suggest the best category name for this expense. It should be:
1. Short (1-2 words max)
2. Broad enough to reuse (not too specific)
3. Different from existing categories
4. Relevant to Indian personal finance

Also suggest a monthly budget estimate in INR based on the expense amount and typical usage.

Respond ONLY with this JSON (no markdown):
{
  "categoryName": "string",
  "icon": "single emoji",
  "budget": number,
  "japaneseLabel": "2-3 Japanese characters",
  "reason": "one line why this category makes sense"
}`;

  try {
    const data = await callAI({
      contents: prompt,
      temperature: 0.2,
      maxTokens: 300,
      key: geminiKey,
    });
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback if AI fails
    return {
      categoryName: expense.category || 'Other',
      icon: '📦',
      budget: Math.round(expense.amount * 3 / 100) * 100 || 1000,
      japaneseLabel: '他の',
      reason: 'Auto-categorized from expense',
    };
  }
}

/**
 * Build a dynamic system prompt for AI Logger that always reads categories
 * from current app state — so new categories are immediately recognized.
 */
export function buildDynamicSystemPrompt(state) {
  const categories = Object.keys(state.config.budgets);
  const categoryList = categories.join(', ');

  // Build fixed expenses section dynamically
  const fixedLines = Object.entries(state.fixedExpenses || {})
    .map(([name, info]) =>
      `- ${name}: ${info.amount ? `₹${info.amount}` : 'VARIABLE - always ask'} | Category: ${info.category} | Mode: ${info.mode}`
    )
    .join('\n');

  // Build tracker sheet data (last 150 expenses)
  const trackerText = (state.tracker || [])
    .slice(-150)
    .map(t => `- ${t.date} (${t.month} ${t.year}, ${t.day}): ₹${t.amount} on "${t.description}" (${t.category}) [Mode: ${t.mode}]${t.note ? ` [Note: ${t.note}]` : ''}`)
    .join('\n');

  // Build income sheet data
  const incomeText = (state.income || [])
    .map(i => `- ${i.date} (${i.month} ${i.year}): ₹${i.amount} from "${i.source}" [Type: ${i.type}]${i.note ? ` [Note: ${i.note}]` : ''}`)
    .join('\n');

  // Build investments sheet data
  const investmentsText = (state.investments || [])
    .map(inv => `- ${inv.date || 'N/A'}: ${inv.fund_coin || inv.Fund_Coin} (${inv.type}) - Units: ${inv.units || inv.Units}, Buy Price: ₹${inv.buyPrice || inv.BuyPrice}, Current Value: ₹${inv.currentValue || inv.CurrentValue} on ${inv.platform || inv.Platform}${inv.note || inv.Note ? ` [Note: ${inv.note || inv.Note}]` : ''}`)
    .join('\n');

  // Build savings goals sheet data with IDs
  const goalsText = (state.savingsGoals || [])
    .map(g => `- ID ${g.id}: "${g.name}" (Icon: ${g.icon || '🎯'}) | Target: ₹${g.target} | Saved: ₹${g.saved} | Monthly Add: ₹${g.monthlyAdd} | Deadline: ${g.deadline} | Status: ${g.status}`)
    .join('\n');

  // Build bill calendar sheet data with IDs
  const billsText = (state.billCalendar || [])
    .map(b => `- ID ${b.id}: "${b.name}" | Amount: ₹${b.amount} | Due Date: ${b.dueDate}th | Frequency: ${b.frequency} | Category: ${b.category} | Status: ${b.status}${b.lastPaid ? ` (Last Paid: ${b.lastPaid})` : ''}`)
    .join('\n');

  // Build user profile memory
  const memoryText = (state.aiMemory || [])
    .map(m => `- [Logged ${m.date || ''}] ${m.observation}`)
    .join('\n');

  return `You are an AI financial action parser for the authenticated user's Financial OS. Use only the data provided below and never invent personal details.

USER PROFILE:
- Name: ${state.config.name || 'Not provided'}
- Monthly Income: ₹${(state.config.salary + state.config.homeIncome).toLocaleString()} 
- Location: India, uses ₹ (INR)

AI PROFILE MEMORY (User preferences, lifestyle changes, and context that you must remember):
${memoryText || 'No custom memory facts registered yet'}

FIXED EXPENSES (auto-fill if not specified):
${fixedLines}

CURRENT CATEGORIES: ${categoryList}

SPREADSHEET SHEETS DATA:

1. EXPENSE TRACKER SHEET (last 150 entries):
${trackerText || 'No expenses logged yet'}

2. INCOME SHEET:
${incomeText || 'No income entries yet'}

3. INVESTMENTS SHEET:
${investmentsText || 'No investments logged yet'}

4. SAVINGS GOALS SHEET:
${goalsText || 'No goals registered'}

5. BILL CALENDAR SHEET:
${billsText || 'No bills registered'}

ACTIONS TO SUPPORT:
1. LOG EXPENSE: Spent money on food, travel, rent, coffee, etc. Parse into "expenses" array.
2. LOG INCOME: Received money (salary, freelance payment, gift). Parse into "income" array.
3. UPDATE SAVINGS GOAL: Add money to a goal or set a goal target. Parse into "goals" array.
   - For adding money: calculate the new "saved" total (current saved + added amount) and return it, setting "action": "add", and "amount": added_amount.
   - Match the target goal's ID from the SAVINGS GOALS SHEET.
4. PAY BILL: Mark a calendar bill as paid (e.g. "paid gym bill"). Match the bill ID from the BILL CALENDAR SHEET, set "status": "Paid", and return in "bills" array.
5. DELETE EXPENSE / LIST DUPLICATES: If the user asks to delete a specific expense, or to list/find duplicate expenses so they can be deleted, find ALL exact matches or duplicates in the EXPENSE TRACKER SHEET and add EVERY SINGLE ONE OF THEM to the "deletions" array. If there are multiple duplicates, add each one as a separate object in the "deletions" array.
6. HISTORICAL QUERIES, EDITS, & GENERAL CHAT: If the user asks questions about their records, asks about your capabilities (e.g., "do you have access to my sheet?", "what can you do?"), or just chats generally, formulate a friendly natural language response based on the sheets data provided above or your system prompt, and set:
   - "needsClarification": true
   - "clarificationQuestion": "<Your complete, clear natural language response>"

IMPORTANT — NEW CATEGORY DETECTION:
If an expense clearly does NOT fit any of the CURRENT CATEGORIES, set:
  "category": "NEW:<YourSuggestedCategoryName>"
Only use NEW: prefix if the expense genuinely doesn't fit existing categories.
Infer broad reusable categories from the transaction context, not just literal words.
Examples: tiffin/lunch/restaurant -> Food, petrol/uber/metro -> Transport, medicine/doctor -> Health.
Do not create overly specific categories such as Tiffin, Restaurant, Petrol, or Uber.

PAYMENT MODE RULES (Expenses):
- Subscriptions, SIP, recurring → Auto-debit
- Outside food, petrol, small purchases → UPI  
- Rent, fund transfers → Bank Transfer
- Cash mentioned explicitly → Cash
- Otherwise → UPI (default)

DATE RULES:
- "today" / no date mentioned → today
- "yesterday" → yesterday
- "last Friday" → calculate actual date
TODAY: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

RESPOND ONLY WITH THIS JSON (no markdown, no explanation, no backticks):
{
  "expenses": [
    {
      "category": "string (use NEW:CategoryName if unknown)",
      "description": "string (concise, 2-4 words)",
      "amount": number,
      "mode": "string",
      "date": "YYYY-MM-DD",
      "month": "MMM",
      "year": number,
      "day": "Mon/Tue/etc",
      "note": "string or empty"
    }
  ],
  "income": [
    {
      "source": "string (employer, client, source)",
      "amount": number,
      "type": "Salary | HomeIncome | Freelance | Other",
      "date": "YYYY-MM-DD",
      "month": "MMM",
      "year": number,
      "note": "string or empty"
    }
  ],
  "goals": [
    {
      "id": number,
      "name": "string",
      "saved": number,
      "action": "add | set",
      "amount": number
    }
  ],
  "bills": [
    {
      "id": number,
      "name": "string",
      "status": "Paid | Unpaid",
      "amount": number
    }
  ],
  "deletions": [
    {
      "date": "YYYY-MM-DD",
      "amount": number,
      "description": "string",
      "category": "string"
    }
  ],
  "needsClarification": false,
  "clarificationQuestion": "string"
}

If amount is missing for a VARIABLE expense (like electricity), set needsClarification: true and ask for it.
If multiple actions are requested in one sentence, return them in their respective arrays.`;
}

/**
 * Normalize AI categories from the full expense context and separate categories
 * that need to be created for this user.
 */
export function parseExpensesForNewCategories(expenses, budgets = {}) {
  const regular = [];
  const newCategoryExpenses = [];

  expenses.forEach(exp => {
    const canonicalCategory = inferCanonicalCategory(exp);
    const existingCategory = findExistingCategory(canonicalCategory, budgets);

    if (existingCategory) {
      regular.push({ ...exp, category: existingCategory });
    } else {
      newCategoryExpenses.push({
        ...exp,
        category: canonicalCategory,
        suggestedCategoryName: canonicalCategory,
      });
    }
  });

  return { regular, newCategoryExpenses };
}
