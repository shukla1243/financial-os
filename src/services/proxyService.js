/**
 * FINANCIAL OS — Proxy Service
 * ============================
 * All data operations go through the Google Apps Script backend.
 * The React app never calls the Sheets API directly.
 * 
 * Every function takes `email` as first param (the logged-in user's identity).
 * The backend filters all data to that email's rows.
 * 
 * Usage: store the script URL in app state (proxyUrl).
 */

// ─── CORE HTTP HELPER ────────────────────────────────────────────────────────

import { getAccessToken, getCurrentUser } from './googleAuth';

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function proxyPost(proxyUrl, action, email, data = null) {
  if (!proxyUrl) throw new Error('Apps Script URL not configured.');
  
  // Retrieve the active Google OAuth token to authenticate request server-side
  let token = null;
  try {
    token = await getAccessToken();
  } catch (e) {
    throw new Error('Google Sign-In session has expired or is invalid. Please log in again.');
  }

  const body = { action, email, userId: getCurrentUser()?.sub || '', token };
  if (data !== null) body.data = data;

  const res = await fetchWithTimeout(proxyUrl, {
    method: 'POST',
    // text/plain avoids CORS preflight OPTIONS request
    // redirect:'follow' is essential — Apps Script returns a 302 before the real response
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  const result = await res.json();
  if (!result || typeof result !== 'object') throw new Error('Invalid backend response.');
  return result;
}

async function proxyMutation(proxyUrl, action, email, data = null) {
  const result = await proxyPost(proxyUrl, action, email, data);
  if (!result?.success) throw new Error(result?.error || `${action} was not confirmed by the backend.`);
  return result;
}

// ─── USER INIT ───────────────────────────────────────────────────────────────

/**
 * Called once after first login.
 * Creates default config rows in the master sheet for this user.
 */
export async function initUser(proxyUrl, email, name = '') {
  return proxyPost(proxyUrl, 'initUser', email, { name });
}

export async function getUserStatus(proxyUrl, email) {
  return proxyPost(proxyUrl, 'getUserStatus', email);
}


// ─── LOAD ALL (one-shot sync) ────────────────────────────────────────────────

/**
 * Load all user data in a single request (used on app startup / sync).
 */
export async function loadAllFromProxy(proxyUrl, email) {
  return proxyPost(proxyUrl, 'loadAll', email);
}

export async function proxyCheckUpdates(proxyUrl, email) {
  return proxyPost(proxyUrl, 'checkUpdates', email);
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

export async function readConfig(proxyUrl, email) {
  return proxyPost(proxyUrl, 'getConfig', email);
}

export async function upsertConfig(proxyUrl, email, key, value) {
  return proxyMutation(proxyUrl, 'setConfig', email, { key, value: value.toString() });
}

export async function saveConfig(proxyUrl, email, values) {
  return proxyPost(proxyUrl, 'setConfigBatch', email, values);
}

export async function completeOnboarding(proxyUrl, email, profile) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await proxyPost(proxyUrl, 'completeOnboarding', email, profile);
      if (result?.success) return result;
      lastError = new Error(result?.error || 'Could not save onboarding.');
    } catch (error) {
      lastError = error;
    }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 750));
  }
  throw lastError || new Error('Could not save onboarding.');
}

export async function proxyAI(proxyUrl, email, request) {
  const result = await proxyPost(proxyUrl, 'callAI', email, request);
  if (!result.success) {
    throw new Error(result.error || 'AI gateway request failed.');
  }
  return result;
}

export async function readCategories(proxyUrl, email) {
  const result = await readConfig(proxyUrl, email);
  if (!result.success) return [];
  const cats = [];
  Object.entries(result.data || {}).forEach(([key, value]) => {
    if (key.startsWith('Budget:')) {
      cats.push({ name: key.replace('Budget:', ''), budget: parseFloat(value) || 0 });
    }
  });
  return cats;
}

export async function addCategory(proxyUrl, email, categoryName, budget = 0) {
  return upsertConfig(proxyUrl, email, `Budget:${categoryName}`, budget);
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function logExpense(proxyUrl, email, expense) {
  return proxyMutation(proxyUrl, 'logExpense', email, expense);
}

export async function deleteExpense(proxyUrl, email, expense) {
  return proxyMutation(proxyUrl, 'deleteExpense', email, expense);
}


export async function readExpenses(proxyUrl, email) {
  const result = await proxyPost(proxyUrl, 'getExpenses', email);
  return result.success ? result.data : [];
}

// ─── INCOME ──────────────────────────────────────────────────────────────────

export async function logIncome(proxyUrl, email, income) {
  return proxyMutation(proxyUrl, 'logIncome', email, income);
}

export async function readIncome(proxyUrl, email) {
  const result = await proxyPost(proxyUrl, 'getIncome', email);
  return result.success ? result.data : [];
}

// ─── SAVINGS GOALS ───────────────────────────────────────────────────────────

export async function writeGoals(proxyUrl, email, goals) {
  return proxyMutation(proxyUrl, 'setGoals', email, goals);
}

export async function readGoals(proxyUrl, email) {
  const result = await proxyPost(proxyUrl, 'getGoals', email);
  return result.success ? result.data : [];
}

// ─── BILL CALENDAR ───────────────────────────────────────────────────────────

export async function writeBills(proxyUrl, email, bills) {
  return proxyMutation(proxyUrl, 'setBills', email, bills);
}

export async function readBills(proxyUrl, email) {
  const result = await proxyPost(proxyUrl, 'getBills', email);
  return result.success ? result.data : [];
}

// ─── AI MEMORY ───────────────────────────────────────────────────────────────

export async function writeMemory(proxyUrl, email, type, observation) {
  return proxyPost(proxyUrl, 'logMemory', email, { type, observation });
}

export async function readMemory(proxyUrl, email) {
  const result = await proxyPost(proxyUrl, 'getMemory', email);
  return result.success ? result.data : [];
}

// ─── MONTHLY SNAPSHOT ────────────────────────────────────────────────────────

export async function writeSnapshot(proxyUrl, email, snapshot) {
  return proxyPost(proxyUrl, 'logSnapshot', email, snapshot);
}

// ─── BLUEPRINT (consciousness engine) ────────────────────────────────────────

export async function readBlueprint(proxyUrl, email) {
  const result = await proxyPost(proxyUrl, 'getBlueprint', email);
  return result.success ? result.data : [];
}

export async function writeToBlueprint(proxyUrl, email, section) {
  return proxyPost(proxyUrl, 'setBlueprint', email, section);
}

export async function createDynamicSheet(proxyUrl, email, tabName, headers) {
  return proxyPost(proxyUrl, 'createDynamicSheet', email, { tabName, headers });
}

export async function getDynamicSheet(proxyUrl, email, tabName) {
  const result = await proxyPost(proxyUrl, 'getDynamicSheet', email, { tabName });
  return result.success ? result.data : [];
}

export async function appendDynamicRow(proxyUrl, email, tabName, rowData) {
  return proxyPost(proxyUrl, 'appendDynamicRow', email, { tabName, rowData });
}

// ─── CONNECTION TEST ─────────────────────────────────────────────────────────

/**
 * Test if the Apps Script URL is reachable.
 * Calls doGet which returns a simple health check.
 */
export async function testProxyConnection(proxyUrl) {
  try {
    const res = await fetchWithTimeout(proxyUrl, { method: 'GET' });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: data.success === true, status: data.status };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── ADMIN OPERATIONS ────────────────────────────────────────────────────────

export async function getAdminRegistry(proxyUrl, email) {
  return proxyPost(proxyUrl, 'getAdminRegistry', email);
}

export async function toggleUserStatus(proxyUrl, email, targetEmail, status) {
  return proxyPost(proxyUrl, 'toggleUserStatus', email, { targetEmail, status });
}

export async function toggleUserPlan(proxyUrl, email, targetEmail, plan, durationDays = 0, giftMessage = '') {
  return proxyPost(proxyUrl, 'toggleUserPlan', email, { targetEmail, plan, durationDays, giftMessage });
}
