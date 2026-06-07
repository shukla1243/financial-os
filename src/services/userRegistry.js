/**
 * USER REGISTRY SERVICE
 * Maps Google user emails to their personal Sheet IDs.
 * Stored in a master registry sheet (one per deployment).
 * Each user gets their own completely separate Google Sheet.
 */

import { getAccessToken } from './googleAuth';

// Master registry sheet ID - stored in localStorage permanently
const REGISTRY_KEY = 'financial-os-registry-sheet-id';

export function getRegistrySheetId() {
  return localStorage.getItem(REGISTRY_KEY) || '';
}

export function setRegistrySheetId(id) {
  localStorage.setItem(REGISTRY_KEY, id);
}

/**
 * Look up a user's Sheet ID from the registry.
 * Returns null if user not found (new user).
 */
export async function lookupUser(registrySheetId, email) {
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${registrySheetId}/values/${encodeURIComponent('Users!A1:C1000')}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data.values || [];
    const userRow = rows.find(r => r[0]?.toLowerCase() === email.toLowerCase());
    return userRow ? { email: userRow[0], sheetId: userRow[1], createdOn: userRow[2] } : null;
  } catch (e) { return null; }
}

/**
 * Register a new user in the registry.
 */
export async function registerUser(registrySheetId, email, userSheetId) {
  try {
    const token = await getAccessToken();
    const row = [email, userSheetId, new Date().toLocaleDateString('en-IN')];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${registrySheetId}/values/${encodeURIComponent('Users!A1')}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ values: [row] }),
      }
    );
    return true;
  } catch (e) { return false; }
}

/**
 * Create a brand new Google Sheet for a new user.
 * Returns the new sheet ID.
 */
export async function createUserSheet(userName) {
  try {
    const token = await getAccessToken();
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        properties: { title: `${userName}'s Financial OS` },
        sheets: [{ properties: { title: 'Config' } }],
      }),
    });
    const data = await res.json();
    return data.spreadsheetId || null;
  } catch (e) { return null; }
}
