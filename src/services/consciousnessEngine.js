/**
 * CONSCIOUSNESS ENGINE
 * The brain of the living app. Runs on every login.
 * Scans data, detects patterns, decides what to build.
 * Writes new sections to Blueprint sheet via proxy.
 * Never builds the same thing twice.
 *
 * NOTE: No longer calls Google Sheets API directly.
 * All sheet ops go through proxyService → Apps Script backend.
 */

import { readBlueprint as proxyReadBlueprint, writeToBlueprint as proxyWriteToBlueprint } from './proxyService';
import { callAI } from './aiService';

// Known OS section triggers
const SECTION_TRIGGERS = {
  vehicle: { keywords: ['fuel','petrol','diesel','odometer','odo','km','mileage','vehicle','bike','car','tank'], name: '🚗 Vehicle OS', icon: '🚗' },
  health: { keywords: ['gym','workout','exercise','steps','run','yoga','protein','supplement','physio'], name: '💪 Health OS', icon: '💪' },
  medical: { keywords: ['doctor','hospital','medicine','bp','blood pressure','sugar','health checkup','pharmacy','pills'], name: '🩺 Medical Log', icon: '🩺' },
  reading: { keywords: ['book','pages','read','kindle','novel','chapter'], name: '📚 Reading OS', icon: '📚' },
  sleep: { keywords: ['sleep','slept','woke','insomnia','hours of sleep','nap'], name: '😴 Sleep OS', icon: '😴' },
  work: { keywords: ['freelance','project','client','invoice','work','contract','delivered'], name: '💼 Work OS', icon: '💼' },
  food_log: { keywords: ['calories','protein','carbs','diet','macro','keto','meal prep'], name: '🥗 Diet OS', icon: '🥗' },
  travel: { keywords: ['trip','travel','hotel','flight','ticket','passport','visa','booking'], name: '✈️ Travel OS', icon: '✈️' },
};

// Section definitions — what each OS looks like
const SECTION_DEFINITIONS = {
  vehicle: {
    sheetRef: 'VehicleLog',
    headers: ['Date', 'Month', 'Year', 'FuelAmount', 'Odometer', 'PricePerLitre', 'LitresFilled', 'CostPerKm', 'Note'],
    parseData: (expense) => {
      const amt = expense.amount || 0;
      const price = expense.pricePerLitre || 0;
      const litres = price > 0 ? (amt / price).toFixed(2) : '';
      const odo = expense.odometer || '';
      return [expense.date, expense.month, expense.year, amt, odo, price, litres, '', expense.note || ''];
    },
    metrics: ['Total spent on fuel', 'Avg cost/km', 'Litres filled', 'Fuel efficiency'],
  },
  health: {
    sheetRef: 'HealthLog',
    headers: ['Date', 'Month', 'Year', 'Activity', 'Duration', 'Cost', 'Streak', 'Note'],
    parseData: (expense) => {
      return [expense.date, expense.month, expense.year, expense.description, expense.duration || '', expense.amount || 0, '', expense.note || ''];
    },
    metrics: ['Workouts this month', 'Cost per session', 'Current streak', 'Total invested in health'],
  },
  medical: {
    sheetRef: 'MedicalLog',
    headers: ['Date', 'Month', 'Year', 'Type', 'Description', 'Amount', 'Doctor', 'Note'],
    parseData: (expense) => {
      return [expense.date, expense.month, expense.year, expense.medicalType || 'Expense', expense.description, expense.amount, expense.doctor || '', expense.note || ''];
    },
    metrics: ['Medical spend this month', 'Doctor visits', 'Medicine costs', 'Annual health spend'],
  },
  work: {
    sheetRef: 'WorkLog',
    headers: ['Date', 'Month', 'Year', 'Type', 'Client', 'Amount', 'Status', 'Note'],
    parseData: (income) => {
      const today = new Date();
      return [today.toLocaleDateString('en-IN'), today.toLocaleString('default',{month:'short'}), today.getFullYear(), 'Freelance', income.source || '', income.amount || 0, 'Received', income.note || ''];
    },
    metrics: ['Freelance earned this month', 'Active clients', 'Projects completed', 'Avg per project'],
  },
};

export function findTriggeredSectionIds(recentData, existingSectionIds = []) {
  const recentText = (recentData || [])
    .map(d => `${d.description || ''} ${d.note || ''} ${d.category || ''}`)
    .join(' ')
    .toLowerCase();

  return Object.entries(SECTION_TRIGGERS)
    .filter(([sectionId, trigger]) => (
      SECTION_DEFINITIONS[sectionId]
      && !existingSectionIds.includes(sectionId)
      && trigger.keywords.some(keyword => recentText.includes(keyword))
    ))
    .map(([sectionId]) => sectionId);
}

// ─── BLUEPRINT WRAPPERS ───────────────────────────────────────────────────────
// These are now thin wrappers over proxyService so the rest of the app
// can keep calling the same function names without any changes.

export async function readBlueprint(proxyUrl, email) {
  if (!proxyUrl || !email) return [];
  return proxyReadBlueprint(proxyUrl, email);
}

export async function writeToBlueprint(proxyUrl, email, section) {
  if (!proxyUrl || !email) return false;
  const result = await proxyWriteToBlueprint(proxyUrl, email, section);
  return result?.success === true;
}

// Dynamic sheet data read — stored locally in app state (not separate sheets per section)
// The backend Blueprint sheet tracks which sections exist; actual data lives in named sheets
// managed by the Apps Script. For dynamic section reads, we route through proxy writeMemory.
export async function writeToDynamicSheet(proxyUrl, email, sheetName, rowData) {
  const { createDynamicSheet, appendDynamicRow } = await import('./proxyService');
  const def = Object.values(SECTION_DEFINITIONS).find(d => d.sheetRef === sheetName);
  const headers = def ? def.headers : Object.keys(rowData);
  
  await createDynamicSheet(proxyUrl, email, sheetName, headers);
  const result = await appendDynamicRow(proxyUrl, email, sheetName, rowData);
  return result?.success === true;
}

/**
 * Route one confirmed expense into every matching specialized OS log.
 */
export async function autoLogExpenseToSections(proxyUrl, email, expense, existingSectionIds = []) {
  if (!proxyUrl || !email || !expense) return [];

  const sectionIds = findTriggeredSectionIds([expense], []);
  const createdSections = [];

  for (const sectionId of sectionIds) {
    const trigger = SECTION_TRIGGERS[sectionId];
    const def = SECTION_DEFINITIONS[sectionId];
    if (!trigger || !def) continue;

    if (!existingSectionIds.includes(sectionId)) {
      await writeToBlueprint(proxyUrl, email, {
        SectionID: sectionId,
        Name: trigger.name,
        Icon: trigger.icon,
        SheetRef: def.sheetRef,
        Status: 'Active',
      });
      createdSections.push({
        SectionID: sectionId,
        Name: trigger.name,
        Icon: trigger.icon,
        SheetRef: def.sheetRef,
        Status: 'Active',
      });
    }

    await writeToDynamicSheet(proxyUrl, email, def.sheetRef, def.parseData(expense));
  }

  return createdSections;
}

export async function readDynamicSheet(proxyUrl, email, sheetName) {
  const { getDynamicSheet } = await import('./proxyService');
  return getDynamicSheet(proxyUrl, email, sheetName);
}

// ─── MAIN CONSCIOUSNESS SCAN ──────────────────────────────────────────────────

/**
 * Call this on every app load after proxy is connected.
 * Scans recent expenses for patterns → registers new sections in Blueprint.
 * Returns array of newly detected sections + AI insights.
 */
export async function runConsciousnessScan(proxyUrl, email, recentData) {
  if (!proxyUrl || !email) return { newSections: [], insights: [] };

  const existingBlueprint = await readBlueprint(proxyUrl, email);
  const existingSectionIds = existingBlueprint.map(s => s.SectionID);

  const newSections = [];
  const insights = [];

  const { createDynamicSheet } = await import('./proxyService');

  // Analyze recent expenses for patterns
  for (const sectionId of findTriggeredSectionIds(recentData, existingSectionIds)) {
      const trigger = SECTION_TRIGGERS[sectionId];
      const def = SECTION_DEFINITIONS[sectionId];

      // Register in blueprint via proxy
      await writeToBlueprint(proxyUrl, email, {
        SectionID: sectionId,
        Name: trigger.name,
        Icon: trigger.icon,
        SheetRef: def.sheetRef,
        Status: 'Active',
      });

      // Initialize physical tab
      try {
        await createDynamicSheet(proxyUrl, email, def.sheetRef, def.headers);
      } catch (err) {}

      newSections.push({
        sectionId,
        name: trigger.name,
        icon: trigger.icon,
        sheetRef: def.sheetRef,
        message: `I noticed you've been tracking ${sectionId === 'vehicle' ? 'fuel & mileage' : sectionId} data. I built you a ${trigger.name} — check the sidebar! 👀`,
      });
  }

  // Generate insights from spending patterns
  if (recentData.length > 5) {
    try {
      const insight = await generateInsight(recentData);
      if (insight) insights.push(insight);
    } catch (e) {}
  }

  return { newSections, insights };
}

async function generateInsight(recentData) {
  const summary = recentData.slice(-20).map(d => `${d.description}: ₹${d.amount}`).join(', ');
  const prompt = `You are a personal finance AI. Based on these recent expenses: ${summary}
  
Give ONE short, specific, actionable insight (max 2 sentences). Be direct, use actual numbers if possible. No generic advice.
Format: just the insight text, nothing else.`;

  try {
    const data = await callAI({
      contents: prompt,
      temperature: 0.7,
      maxTokens: 150,
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { return null; }
}

export { SECTION_DEFINITIONS, SECTION_TRIGGERS };
