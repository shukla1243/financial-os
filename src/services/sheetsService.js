import { getAccessToken } from './googleAuth';

/**
 * FINANCIAL OS — Google Sheets Service Layer
 * Handles all read/write operations for all 9 sheets.
 * Sheet names: Config, Tracker, Income, Investments, SavingsGoals, MonthlySnapshot, AIMemory, BillCalendar, Accountability
 */

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';


// ─── CORE HELPERS ────────────────────────────────────────────────────────────

export function getSheetsUrl(sheetId, apiKey, range) {
  return `${BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
}

export function getAppendUrl(sheetId, apiKey, range) {
  return `${BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
}

export function getUpdateUrl(sheetId, apiKey, range) {
  return `${BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${apiKey}`;
}

export function getBatchUpdateUrl(sheetId, apiKey) {
  return `${BASE_URL}/${sheetId}/values:batchUpdate?key=${apiKey}`;
}

// ─── CONNECTION TEST ──────────────────────────────────────────────────────────

export async function testConnection(sheetId, apiKey) {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${BASE_URL}/${sheetId}?fields=sheets.properties.title`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message || 'Connection failed' };
    }
    const data = await res.json();
    const sheetNames = data.sheets?.map(s => s.properties.title) || [];
    return { success: true, sheetNames };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── SHEET INITIALIZATION ─────────────────────────────────────────────────────
// Creates all required sheets with headers if they don't exist

export async function initializeSheets(sheetId, apiKey) {
  const required = [
    { name: 'Config', headers: ['Key', 'Value'] },
    { name: 'Tracker', headers: ['Month', 'Year', 'Day', 'Date', 'Category', 'Description', 'Amount', 'Mode', 'Note'] },
    { name: 'Income', headers: ['Month', 'Year', 'Date', 'Type', 'Source', 'Amount', 'Note'] },
    { name: 'Investments', headers: ['Date', 'Type', 'Fund_Coin', 'Units', 'BuyPrice', 'CurrentValue', 'Platform', 'Note'] },
    { name: 'SavingsGoals', headers: ['ID', 'GoalName', 'Target', 'Saved', 'MonthlyAdd', 'Deadline', 'Icon', 'Color', 'Status'] },
    { name: 'MonthlySnapshot', headers: ['Month', 'Year', 'Income', 'ExtraIncome', 'Expenses', 'Savings', 'Buffer', 'SavingsRate', 'TopCategory', 'Notes'] },
    { name: 'AIMemory', headers: ['Date', 'Type', 'Observation'] },
    { name: 'BillCalendar', headers: ['ID', 'BillName', 'Amount', 'DueDate', 'Frequency', 'Category', 'Status', 'LastPaid'] },
    { name: 'Accountability', headers: ['Month', 'Year', 'PartnerEmail', 'SavingsRate', 'GoalsHit', 'BudgetAdherence', 'Comment', 'SharedOn'] },
  ];

  // Get existing sheets
  const existRes = await fetch(`${BASE_URL}/${sheetId}?key=${apiKey}&fields=sheets.properties.title`);
  const existData = await existRes.json();
  const existingNames = existData.sheets?.map(s => s.properties.title) || [];

  const toCreate = required.filter(s => !existingNames.includes(s.name));

  if (toCreate.length === 0) return { success: true, created: [] };

  // Create missing sheets
  const addSheetRequests = toCreate.map(s => ({
    addSheet: { properties: { title: s.name } }
  }));

  const initToken = await getAccessToken();
  const batchRes = await fetch(`${BASE_URL}/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${initToken}` },
    body: JSON.stringify({ requests: addSheetRequests }),
  });

  if (!batchRes.ok) {
    const err = await batchRes.json();
    return { success: false, error: err.error?.message };
  }

  // Write headers to each new sheet
  const headerWrites = toCreate.map(s => ({
    range: `${s.name}!A1`,
    values: [s.headers],
  }));

  const writeRes = await fetch(`${BASE_URL}/${sheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${initToken}` },
    body: JSON.stringify({ valueInputOption: 'RAW', data: headerWrites }),
  });

  if (!writeRes.ok) {
    const err = await writeRes.json();
    return { success: false, error: err.error?.message };
  }

  return { success: true, created: toCreate.map(s => s.name) };
}

// ─── READ OPERATIONS ─────────────────────────────────────────────────────────

export async function readSheet(sheetId, apiKey, sheetName) {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${BASE_URL}/${sheetId}/values/${encodeURIComponent(`${sheetName}!A1:Z1000`)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return { success: false, data: [] };
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return { success: true, data: [] };
    const headers = rows[0];
    const records = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });
    return { success: true, data: records };
  } catch (e) {
    return { success: false, error: e.message, data: [] };
  }
}

// Read config as key-value map
export async function readConfig(sheetId, apiKey) {
  const result = await readSheet(sheetId, apiKey, 'Config');
  if (!result.success) return { success: false, data: {} };
  const config = {};
  result.data.forEach(row => {
    if (row.Key) config[row.Key] = row.Value;
  });
  return { success: true, data: config };
}

// Read all categories dynamically from Config sheet
export async function readCategories(sheetId, apiKey) {
  const cfg = await readConfig(sheetId, apiKey);
  if (!cfg.success) return [];
  const cats = [];
  Object.entries(cfg.data).forEach(([key, value]) => {
    if (key.startsWith('Budget:')) {
      cats.push({ name: key.replace('Budget:', ''), budget: parseFloat(value) || 0 });
    }
  });
  return cats;
}

// ─── WRITE OPERATIONS ─────────────────────────────────────────────────────────

export async function appendRow(sheetId, apiKey, sheetName, rowData) {
  try {
    // Use OAuth token for writes
    const token = await getAccessToken();
    const url = `${BASE_URL}/${sheetId}/values/${encodeURIComponent(`${sheetName}!A1`)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ values: [rowData] }),
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── EXPENSE OPERATIONS ───────────────────────────────────────────────────────

export async function logExpense(sheetId, apiKey, expense) {
  const row = [
    expense.month,
    expense.year,
    expense.day,
    expense.date,
    expense.category,
    expense.description,
    expense.amount,
    expense.mode,
    expense.note || '',
  ];
  return appendRow(sheetId, apiKey, 'Tracker', row);
}

export async function readExpenses(sheetId, apiKey) {
  const result = await readSheet(sheetId, apiKey, 'Tracker');
  if (!result.success) return [];
  return result.data.map(row => ({
    month: row.Month,
    year: parseInt(row.Year) || new Date().getFullYear(),
    day: row.Day,
    date: row.Date,
    category: row.Category,
    description: row.Description,
    amount: parseFloat(row.Amount) || 0,
    mode: row.Mode,
    note: row.Note,
  }));
}

// ─── INCOME OPERATIONS ────────────────────────────────────────────────────────

export async function logIncome(sheetId, apiKey, income) {
  const row = [income.month, income.year, income.date, income.type, income.source, income.amount, income.note || ''];
  return appendRow(sheetId, apiKey, 'Income', row);
}

export async function readIncome(sheetId, apiKey) {
  const result = await readSheet(sheetId, apiKey, 'Income');
  if (!result.success) return [];
  return result.data.map(row => ({
    month: row.Month, year: parseInt(row.Year), date: row.Date,
    type: row.Type, source: row.Source, amount: parseFloat(row.Amount) || 0, note: row.Note,
  }));
}

// ─── CATEGORY OPERATIONS (Self-Writing) ───────────────────────────────────────

/**
 * Add a new category to the Config sheet dynamically.
 * This is the "self-writing" feature — AI creates categories, app adapts everywhere.
 */
export async function addCategory(sheetId, apiKey, categoryName, budget = 0) {
  const key = `Budget:${categoryName}`;
  const row = [key, budget.toString()];
  return appendRow(sheetId, apiKey, 'Config', row);
}

/**
 * Update a config key-value pair. If key exists, find and update row.
 * Otherwise appends as new row.
 */
export async function upsertConfig(sheetId, apiKey, key, value) {
  // Read all config first to find if key exists
  const cfgToken = await getAccessToken();
  const res = await fetch(`${BASE_URL}/${sheetId}/values/${encodeURIComponent('Config!A1:B1000')}`, {
    headers: { 'Authorization': `Bearer ${cfgToken}` }
  });
  if (!res.ok) return { success: false };
  const data = await res.json();
  const rows = data.values || [];

  let rowIndex = -1;
  rows.forEach((row, i) => { if (row[0] === key) rowIndex = i; });

  if (rowIndex === -1) {
    // Append new
    return appendRow(sheetId, apiKey, 'Config', [key, value.toString()]);
  } else {
    // Update existing row using OAuth
    const uToken = await getAccessToken();
    const range = `Config!A${rowIndex + 1}:B${rowIndex + 1}`;
    const updateRes = await fetch(`${BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${uToken}` },
      body: JSON.stringify({ values: [[key, value.toString()]] }),
    });
    return { success: updateRes.ok };
  }
}

// ─── SAVINGS GOALS ────────────────────────────────────────────────────────────

export async function writeGoals(sheetId, apiKey, goals) {
  // Clear existing and rewrite
  const rows = goals.map(g => [g.id, g.name, g.target, g.saved, g.monthlyAdd, g.deadline, g.icon, g.color, g.status]);
  // First clear data rows (keep header)
  try {
    const gToken = await getAccessToken();
    await fetch(`${BASE_URL}/${sheetId}/values/${encodeURIComponent('SavingsGoals!A2:I1000')}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gToken}` },
      body: JSON.stringify({ values: rows.length > 0 ? rows : [[]] }),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function readGoals(sheetId, apiKey) {
  const result = await readSheet(sheetId, apiKey, 'SavingsGoals');
  if (!result.success) return [];
  return result.data.map(row => ({
    id: row.ID || Date.now(),
    name: row.GoalName, target: parseFloat(row.Target) || 0,
    saved: parseFloat(row.Saved) || 0, monthlyAdd: parseFloat(row.MonthlyAdd) || 0,
    deadline: row.Deadline, icon: row.Icon, color: row.Color, status: row.Status,
  }));
}

// ─── BILL CALENDAR ────────────────────────────────────────────────────────────

export async function writeBills(sheetId, apiKey, bills) {
  const rows = bills.map(b => [b.id, b.name, b.amount, b.dueDate, b.frequency, b.category, b.status, b.lastPaid || '']);
  try {
    const bToken = await getAccessToken();
    await fetch(`${BASE_URL}/${sheetId}/values/${encodeURIComponent('BillCalendar!A2:H1000')}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bToken}` },
      body: JSON.stringify({ values: rows.length > 0 ? rows : [[]] }),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── AI MEMORY ────────────────────────────────────────────────────────────────

export async function writeMemory(sheetId, apiKey, type, observation) {
  const row = [new Date().toLocaleDateString('en-IN'), type, observation];
  return appendRow(sheetId, apiKey, 'AIMemory', row);
}

export async function readMemory(sheetId, apiKey) {
  const result = await readSheet(sheetId, apiKey, 'AIMemory');
  if (!result.success) return [];
  return result.data.map(row => ({ date: row.Date, type: row.Type, observation: row.Observation }));
}

// ─── MONTHLY SNAPSHOT ─────────────────────────────────────────────────────────

export async function writeSnapshot(sheetId, apiKey, snapshot) {
  const row = [
    snapshot.month, snapshot.year, snapshot.income, snapshot.extraIncome,
    snapshot.expenses, snapshot.savings, snapshot.buffer,
    snapshot.savingsRate, snapshot.topCategory, snapshot.notes || '',
  ];
  return appendRow(sheetId, apiKey, 'MonthlySnapshot', row);
}

// ─── FULL DATA SYNC (localStorage → Sheets migration) ─────────────────────────

export async function migrateLocalToSheets(sheetId, apiKey, localState) {
  const results = [];

  // Migrate tracker
  if (localState.tracker?.length > 0) {
    for (const exp of localState.tracker) {
      const r = await logExpense(sheetId, apiKey, exp);
      results.push({ sheet: 'Tracker', success: r.success });
    }
  }

  // Migrate income
  if (localState.income?.length > 0) {
    for (const inc of localState.income) {
      const r = await logIncome(sheetId, apiKey, inc);
      results.push({ sheet: 'Income', success: r.success });
    }
  }

  // Migrate goals
  if (localState.savingsGoals?.length > 0) {
    const r = await writeGoals(sheetId, apiKey, localState.savingsGoals);
    results.push({ sheet: 'SavingsGoals', success: r.success });
  }

  // Migrate bills
  if (localState.billCalendar?.length > 0) {
    const r = await writeBills(sheetId, apiKey, localState.billCalendar);
    results.push({ sheet: 'BillCalendar', success: r.success });
  }

  // Migrate AI memory
  if (localState.aiMemory?.length > 0) {
    for (const mem of localState.aiMemory) {
      const r = await writeMemory(sheetId, apiKey, mem.type, mem.observation);
      results.push({ sheet: 'AIMemory', success: r.success });
    }
  }

  // Write config
  const configPairs = [
    ['Name', localState.config?.name || 'Shreyansh'],
    ['Salary', localState.config?.salary || 15000],
    ['HomeIncome', localState.config?.homeIncome || 15500],
    ['ActiveMonth', localState.config?.activeMonth || ''],
    ['ActiveYear', localState.config?.activeYear || new Date().getFullYear()],
  ];

  // Write budget categories
  if (localState.config?.budgets) {
    Object.entries(localState.config.budgets).forEach(([cat, amt]) => {
      configPairs.push([`Budget:${cat}`, amt]);
    });
  }

  const configRows = configPairs.map(([k, v]) => [k, v.toString()]);
  const mToken = await getAccessToken();
  await fetch(`${BASE_URL}/${sheetId}/values/${encodeURIComponent('Config!A2:B1000')}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mToken}` },
    body: JSON.stringify({ values: configRows }),
  });
  results.push({ sheet: 'Config', success: true });

  const failed = results.filter(r => !r.success);
  return { success: failed.length === 0, migrated: results.length, failed: failed.length };
}

// ─── LOAD ALL DATA FROM SHEETS ────────────────────────────────────────────────

export async function loadAllFromSheets(sheetId, apiKey) {
  const [expenses, income, goals, memory, configResult, categories] = await Promise.all([
    readExpenses(sheetId, apiKey),
    readIncome(sheetId, apiKey),
    readGoals(sheetId, apiKey),
    readMemory(sheetId, apiKey),
    readConfig(sheetId, apiKey),
    readCategories(sheetId, apiKey),
  ]);

  // Parse config into app state shape
  const cfg = configResult.data || {};
  const budgets = {};
  categories.forEach(c => { budgets[c.name] = c.budget; });

  return {
    tracker: expenses,
    income,
    savingsGoals: goals.length > 0 ? goals : undefined, // keep local if sheets empty
    aiMemory: memory,
    config: {
      name: cfg.Name || 'Shreyansh',
      salary: parseFloat(cfg.Salary) || 15000,
      homeIncome: parseFloat(cfg.HomeIncome) || 15500,
      activeMonth: cfg.ActiveMonth || new Date().toLocaleString('default', { month: 'short' }),
      activeYear: parseInt(cfg.ActiveYear) || new Date().getFullYear(),
      budgets: Object.keys(budgets).length > 0 ? budgets : undefined,
    },
  };
}
