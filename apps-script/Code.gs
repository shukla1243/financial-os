/**
 * FINANCIAL OS - Google Apps Script Backend
 * ====================================================
 * Deploy as: Execute as → Me | Who has access → Anyone
 *
 * This script is the ONLY thing that touches the master Google Sheet.
 * The React app never gets direct access to the sheet — it only calls this URL.
 *
 * Each request must include { email } — all reads/writes are filtered to that email's rows.
 *
 * MASTER SHEET ID (hardcoded server-side — never exposed to users):
 */
const MASTER_SHEET_ID = PropertiesService.getScriptProperties().getProperty('MASTER_SHEET_ID');

// Admin email configured for control panel access
const ADMIN_EMAIL = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '';
const GOOGLE_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || '';
const OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY') || '';
const OPENROUTER_MODELS = [
  'openrouter/free',
];
const ALLOWED_ACTIONS = [
  'initUser', 'getUserStatus', 'getAdminRegistry', 'toggleUserStatus', 'toggleUserPlan',
  'getConfig', 'setConfig', 'setConfigBatch', 'completeOnboarding',
  'getExpenses', 'logExpense', 'deleteExpense', 'getIncome', 'logIncome',
  'getGoals', 'setGoals', 'getBills', 'setBills', 'getMemory', 'logMemory',
  'getBlueprint', 'setBlueprint', 'logSnapshot', 'checkUpdates', 'loadAll',
  'createDynamicSheet', 'getDynamicSheet', 'appendDynamicRow', 'callAI',
];

// Dedicated Google Drive folder name for individual user spreadsheet files
const FOLDER_NAME = 'Financial OS User Sheets';

// ─── SHEET SCHEMAS ────────────────────────────────────────────────────────────
const SCHEMAS = {
  Config:          ['Email', 'Key', 'Value'],
  Tracker:         ['Email', 'Month', 'Year', 'Day', 'Date', 'Category', 'Description', 'Amount', 'Mode', 'Note', 'ClientID'],
  Income:          ['Email', 'Month', 'Year', 'Date', 'Type', 'Source', 'Amount', 'Note', 'ClientID'],
  Investments:     ['Email', 'Date', 'Type', 'Fund_Coin', 'Units', 'BuyPrice', 'CurrentValue', 'Platform', 'Note'],
  SavingsGoals:    ['Email', 'ID', 'GoalName', 'Target', 'Saved', 'MonthlyAdd', 'Deadline', 'Icon', 'Color', 'Status'],
  MonthlySnapshot: ['Email', 'Month', 'Year', 'Income', 'ExtraIncome', 'Expenses', 'Savings', 'Buffer', 'SavingsRate', 'TopCategory', 'Notes'],
  AIMemory:        ['Email', 'Date', 'Type', 'Observation'],
  BillCalendar:    ['Email', 'ID', 'BillName', 'Amount', 'DueDate', 'Frequency', 'Category', 'Status', 'LastPaid'],
  Accountability:  ['Email', 'Month', 'Year', 'PartnerEmail', 'SavingsRate', 'GoalsHit', 'BudgetAdherence', 'Comment', 'SharedOn'],
  Blueprint:       ['Email', 'SectionID', 'Name', 'Icon', 'SheetRef', 'Status', 'CreatedOn'],
};

const REGISTRY_SCHEMA = ['Email', 'UserID', 'Name', 'SpreadsheetID', 'SpreadsheetURL', 'Status', 'CreatedOn', 'LastActiveOn', 'Reason', 'Plan', 'PlanExpiresOn', 'OwnerGift', 'GiftID'];

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    if (!e.postData?.contents || e.postData.contents.length > 250000) {
      return jsonResponse({ success: false, error: 'Invalid or oversized request.' });
    }
    const body = JSON.parse(e.postData.contents);
    const { action, email, token, data } = body;

    if (!email) return jsonResponse({ success: false, error: 'Missing email' });
    if (!ALLOWED_ACTIONS.includes(action)) return jsonResponse({ success: false, error: 'Unknown action.' });

    // 1. Server-side Google OAuth Token Verification
    const identity = verifyToken(token, email);
    enforceRequestRateLimit(identity.sub);

    // 2. Admin-only actions routing
    if (action === 'getAdminRegistry') {
      if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized: Admin access required.' });
      }
      return jsonResponse(getAdminRegistry());
    }

    if (action === 'toggleUserStatus') {
      if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized: Admin access required.' });
      }
      return jsonResponse(toggleUserStatus(data.targetEmail, data.status));
    }

    if (action === 'toggleUserPlan') {
      if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Unauthorized: Admin access required.' });
      }
      return jsonResponse(toggleUserPlan(data.targetEmail, data.plan, data.durationDays, data.giftMessage));
    }

    if (action === 'getUserStatus') {
      return jsonResponse(getUserStatusAction(email));
    }

    if ((action === 'setConfig' && data?.key === 'ThemeJSON') ||
        (action === 'setConfigBatch' && data && Object.prototype.hasOwnProperty.call(data, 'ThemeJSON'))) {
      if (!hasThemeCustomizationAccess(email)) {
        return jsonResponse({ success: false, error: 'Theme customization requires the Pro plan.' });
      }
    }

    // 3. User operations: Get or create dedicated user Spreadsheet ID
    const userSsId = getUserSpreadsheetId(identity.sub, email, action === 'initUser' ? data?.name : null);

    let result;
    switch (action) {
      case 'initUser':       result = { success: true }; break; // getUserSpreadsheetId handled creation/validation
      case 'getConfig':      result = getConfig(userSsId, email); break;
      case 'setConfig':      result = setConfig(userSsId, email, data.key, data.value); break;
      case 'setConfigBatch': result = setConfigBatch(userSsId, email, data); break;
      case 'completeOnboarding': result = completeOnboarding(userSsId, email, data); break;
      case 'callAI':         result = callAI(email, data); break;
      case 'getExpenses':    result = getExpenses(userSsId, email); break;
      case 'logExpense':     result = logExpense(userSsId, email, data); break;
      case 'deleteExpense':  result = deleteExpense(userSsId, email, data); break;
      case 'getIncome':      result = getIncome(userSsId, email); break;
      case 'logIncome':      result = logIncome(userSsId, email, data); break;
      case 'getGoals':       result = getGoals(userSsId, email); break;
      case 'setGoals':       result = setGoals(userSsId, email, data); break;
      case 'getBills':       result = getBills(userSsId, email); break;
      case 'setBills':       result = setBills(userSsId, email, data); break;
      case 'getMemory':      result = getMemory(userSsId, email); break;
      case 'logMemory':      result = logMemory(userSsId, email, data); break;
      case 'getBlueprint':   result = getBlueprint(userSsId, email); break;
      case 'setBlueprint':   result = setBlueprint(userSsId, email, data); break;
      case 'logSnapshot':    result = logSnapshot(userSsId, email, data); break;
      case 'checkUpdates':   result = checkUpdates(userSsId, email); break;
      case 'loadAll':        result = loadAll(userSsId, email); break;
      case 'createDynamicSheet': result = createDynamicSheet(userSsId, email, data.tabName, data.headers); break;
      case 'getDynamicSheet':    result = getDynamicSheet(userSsId, email, data.tabName); break;
      case 'appendDynamicRow':   result = appendDynamicRow(userSsId, email, data.tabName, data.rowData); break;
      default: result = { success: false, error: 'Unknown action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  // Health check
  return jsonResponse({ success: true, status: 'Financial OS Backend Running' });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  if (!MASTER_SHEET_ID) throw new Error('MASTER_SHEET_ID is not configured in Script Properties.');
  return SpreadsheetApp.openById(MASTER_SHEET_ID);
}

/**
 * Validates Google ID/Access Token server-side via Google's OAuth validation API.
 */
function verifyToken(token, email) {
  if (!token) throw new Error('Authentication token is missing. Please sign in again.');
  const url = 'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token);
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  
  if (response.getResponseCode() !== 200) {
    throw new Error('Authentication failed: Invalid or expired Google session.');
  }
  
  const tokenInfo = JSON.parse(response.getContentText());
  const verifiedEmail = tokenInfo.email || tokenInfo.email_as_verified;
  
  if (!verifiedEmail || verifiedEmail.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Authentication failed: Google account mismatch.');
  }
  if (GOOGLE_CLIENT_ID && tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Authentication failed: OAuth audience mismatch.');
  }
  if (!tokenInfo.sub) throw new Error('Authentication failed: Stable Google user ID missing.');
  return tokenInfo;
}

/**
 * Resolves or creates a dedicated Google Spreadsheet for a user, checking for suspension.
 */
function getUserSpreadsheetId(userId, email, name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return getUserSpreadsheetIdUnlocked(userId, email, name);
  } finally {
    lock.releaseLock();
  }
}

function getUserSpreadsheetIdUnlocked(userId, email, name) {
  const masterSs = getSpreadsheet();
  let registrySheet = masterSs.getSheetByName('_Registry');
  if (!registrySheet) {
    registrySheet = masterSs.insertSheet('_Registry');
    registrySheet.getRange(1, 1, 1, REGISTRY_SCHEMA.length).setValues([REGISTRY_SCHEMA]);
    registrySheet.setFrozenRows(1);
  }
  ensureRegistrySchema(registrySheet);

  const lastRow = registrySheet.getLastRow();
  let userRowIndex = -1;
  let spreadsheetId = '';
  let status = 'Active';
  let registryEmail = '';

  if (lastRow >= 2) {
    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getDisplayValues();
    const matches = [];
    for (let i = 1; i < registryData.length; i++) {
      const registryUserId = normalizeGoogleSubjectId(registryData[i][1]);
      const registryEmailVal = registryData[i][0].toString().trim().toLowerCase();
      const isMatch = registryUserId === normalizeGoogleSubjectId(userId) ||
                      registryEmailVal === email.toLowerCase();
      if (isMatch) {
        matches.push({
          rowIndex: i + 1,
          email: registryData[i][0].toString(),
          spreadsheetId: registryData[i][3].toString(),
          status: registryData[i][5].toString(),
        });
      }
    }
    const selected = selectBestRegistryMatch(matches, email);
    if (selected) {
      userRowIndex = selected.rowIndex;
      registryEmail = selected.email;
      spreadsheetId = selected.spreadsheetId;
      status = selected.status;
    }
  }

  if (status === 'Suspended') {
    throw new Error('Your account has been suspended by the administrator.');
  }

  const todayStr = new Date().toLocaleString('en-IN');

  if (userRowIndex !== -1 && spreadsheetId) {
    registrySheet.getRange(userRowIndex, 2).setNumberFormat('@').setValue(normalizeGoogleSubjectId(userId));
    if (registryEmail.toLowerCase() !== email.toLowerCase()) {
      migrateUserEmail(spreadsheetId, registryEmail, email);
      registrySheet.getRange(userRowIndex, 1).setValue(email);
    }
    // Return existing sheet ID, update last active timestamp
    registrySheet.getRange(userRowIndex, 8).setValue(todayStr); // Column 8 is LastActiveOn
    return spreadsheetId;
  }

  // Create personal spreadsheet for new user
  const folder = getOrCreateUserFolder();
  const userName = name || email.split('@')[0];
  const fileName = `Financial OS - ${userName} (${email})`;
  
  const newSs = SpreadsheetApp.create(fileName);
  const newSsFile = DriveApp.getFileById(newSs.getId());
  
  // Save spreadsheet to the dedicated folder
  folder.addFile(newSsFile);
  DriveApp.getRootFolder().removeFile(newSsFile);

  const newSsId = newSs.getId();
  const newSsUrl = newSs.getUrl();
  // Initialize pages / sub-sheets
  Object.keys(SCHEMAS).forEach(sheetName => {
    const headers = SCHEMAS[sheetName];
    const sheet = newSs.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });
  
  // Remove default sheet
  const defaultSheet = newSs.getSheetByName('Sheet1');
  if (defaultSheet) newSs.deleteSheet(defaultSheet);

  // New accounts start clean. Onboarding writes user-owned profile and settings.
  const configSheet = newSs.getSheetByName('Config');
  const defaults = [
    [email, 'Name', ''],
    [email, 'Salary', '0'],
    [email, 'HomeIncome', '0'],
    [email, 'ActiveMonth', new Date().toLocaleString('default', { month: 'short' })],
    [email, 'ActiveYear', new Date().getFullYear().toString()],
    [email, 'OnboardingComplete', 'false'],
    [email, 'CreatedOn', new Date().toLocaleDateString('en-IN')],
  ];
  defaults.forEach(row => configSheet.appendRow(sanitizeRow(row)));

  // Save to master registry
  const newRegistryRow = registrySheet.getLastRow() + 1;
  registrySheet.getRange(newRegistryRow, 2).setNumberFormat('@');
  registrySheet.getRange(newRegistryRow, 1, 1, REGISTRY_SCHEMA.length).setValues([sanitizeRow([
    email,
    normalizeGoogleSubjectId(userId),
    userName,
    newSsId,
    newSsUrl,
    'Active',
    todayStr,
    todayStr,
    '',
    'Free'
  ])]);

  return newSsId;
}

function ensureRegistrySchema(registrySheet) {
  const lastRow = registrySheet.getLastRow();
  if (lastRow === 0) {
    registrySheet.getRange(1, 1, 1, REGISTRY_SCHEMA.length).setValues([REGISTRY_SCHEMA]);
    registrySheet.setFrozenRows(1);
    return;
  }
  const firstRow = registrySheet.getRange(1, 1, 1, REGISTRY_SCHEMA.length).getDisplayValues()[0];
  const hasHeader = firstRow[0] === 'Email' && firstRow[1] === 'UserID' && firstRow[3] === 'SpreadsheetID';
  if (!hasHeader) {
    registrySheet.insertRowBefore(1);
    registrySheet.getRange(1, 1, 1, REGISTRY_SCHEMA.length).setValues([REGISTRY_SCHEMA]);
  }
  registrySheet.setFrozenRows(1);
  registrySheet.getRange(1, 1, 1, REGISTRY_SCHEMA.length).setValues([REGISTRY_SCHEMA]);
  if (registrySheet.getLastRow() >= 2) {
    registrySheet.getRange(2, 2, registrySheet.getLastRow() - 1, 1).setNumberFormat('@');
  }
}

function normalizeGoogleSubjectId(value) {
  return String(value || '').trim().replace(/^'+/, '');
}

function selectBestRegistryMatch(matches, email) {
  if (!matches.length) return null;
  const ranked = matches.map(match => {
    let score = match.email.toLowerCase() === email.toLowerCase() ? 1 : 0;
    try {
      const cfg = getConfig(match.spreadsheetId, match.email).data || {};
      if (String(cfg.OnboardingComplete).toLowerCase() === 'true') score += 10;
      if (cfg.ProfileJSON) score += 2;
    } catch (error) {}
    return { match, score };
  });
  ranked.sort((a, b) => b.score - a.score || a.match.rowIndex - b.match.rowIndex);
  return ranked[0].match;
}

function migrateUserEmail(ssId, oldEmail, newEmail) {
  const ss = SpreadsheetApp.openById(ssId);
  Object.keys(SCHEMAS).forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    let changed = false;
    values.forEach(row => {
      if (row[0]?.toString().toLowerCase() === oldEmail.toLowerCase()) {
        row[0] = newEmail;
        changed = true;
      }
    });
    if (changed) sheet.getRange(2, 1, values.length, 1).setValues(values);
  });
}

function getOrCreateUserFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(FOLDER_NAME);
}

/**
 * Ensure a sheet exists with the correct header row inside a user's private sheet.
 */
function ensureSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  const headers = SCHEMAS[sheetName];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Check if Email column exists
  const firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell !== 'Email') {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue('Email');
  }
  if (headers) {
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    headers.forEach((header, index) => {
      if (existingHeaders[index] !== header) sheet.getRange(1, index + 1).setValue(header);
    });
  }
  return sheet;
}

/**
 * Read all rows for a user from their private spreadsheet.
 */
function readUserRows(ssId, sheetName, email) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ensureSheet(ss, sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const lastCol = sheet.getLastColumn();
  const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = allData[0];
  const emailIdx = headers.indexOf('Email');
  if (emailIdx === -1) return [];

  const rows = [];
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[emailIdx]?.toString().toLowerCase() === email.toLowerCase()) {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = row[j]; });
      rows.push({ obj, rowIndex: i + 1 });
    }
  }
  return rows;
}

/**
 * Append a row to a user's private sheet.
 */
function appendUserRow(ssId, sheetName, email, rowValues) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ensureSheet(ss, sheetName);
  sheet.appendRow(sanitizeRow([email, ...rowValues]));
  return { success: true };
}

/**
 * Delete and rewrite a user's private rows (used for full replacers).
 */
function replaceUserRows(ssId, sheetName, email, rowsArray) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ensureSheet(ss, sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const allData = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    const emailIdx = allData[0].indexOf('Email');

    const toDelete = [];
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][emailIdx]?.toString().toLowerCase() === email.toLowerCase()) {
        toDelete.push(i + 1);
      }
    }
    for (let i = toDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(toDelete[i]);
    }
  }

  rowsArray.forEach(row => sheet.appendRow(sanitizeRow([email, ...row])));
  return { success: true };
}

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────────

function getAdminRegistry() {
  try {
    const masterSs = getSpreadsheet();
    let registrySheet = masterSs.getSheetByName('_Registry');
    if (!registrySheet) {
      return { success: true, data: [] };
    }
    ensureRegistrySchema(registrySheet);
    const lastRow = registrySheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };

    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    const data = [];
    for (let i = 1; i < registryData.length; i++) {
      data.push({
        email: registryData[i][0],
        userId: registryData[i][1],
        name: registryData[i][2],
        spreadsheetId: registryData[i][3],
        spreadsheetUrl: registryData[i][4],
        status: registryData[i][5],
        createdOn: registryData[i][6],
        lastActiveOn: registryData[i][7],
        plan: registryData[i][9] || 'Free',
        planExpiresOn: registryData[i][10] || '',
        giftMessage: registryData[i][11] || ''
      });
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function toggleUserStatus(targetEmail, status, reason = '') {
  try {
    if (!['Active', 'Suspended'].includes(status)) return { success: false, error: 'Invalid user status.' };
    const masterSs = getSpreadsheet();
    let registrySheet = masterSs.getSheetByName('_Registry');
    if (!registrySheet) return { success: false, error: 'Registry not found.' };

    const lastRow = registrySheet.getLastRow();
    if (lastRow < 2) return { success: false, error: 'No users registered.' };

    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    for (let i = 1; i < registryData.length; i++) {
      if (registryData[i][0].toString().toLowerCase() === targetEmail.toLowerCase()) {
        registrySheet.getRange(i + 1, 6).setValue(status); // Column 6 is Status
        registrySheet.getRange(i + 1, 9).setValue(sanitizeCell(reason)); // Column 9 is Reason
        return { success: true };
      }
    }
    return { success: false, error: 'User not found in registry.' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function toggleUserPlan(targetEmail, plan, durationDays, giftMessage) {
  try {
    if (!['Free', 'Pro'].includes(plan)) return { success: false, error: 'Invalid plan.' };
    const masterSs = getSpreadsheet();
    const registrySheet = masterSs.getSheetByName('_Registry');
    if (!registrySheet) return { success: false, error: 'Registry not found.' };
    ensureRegistrySchema(registrySheet);
    const lastRow = registrySheet.getLastRow();
    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    for (let i = 1; i < registryData.length; i++) {
      if (registryData[i][0].toString().toLowerCase() === targetEmail.toLowerCase()) {
        const expiresOn = plan === 'Pro' && Number(durationDays) > 0
          ? new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000)
          : '';
        const gift = sanitizeCell(giftMessage || (plan === 'Pro' ? 'A Pro access gift from the Financial OS owner.' : ''));
        const giftId = gift ? Utilities.getUuid() : '';
        registrySheet.getRange(i + 1, 10).setValue(plan);
        registrySheet.getRange(i + 1, 11).setValue(expiresOn);
        registrySheet.getRange(i + 1, 12).setValue(gift);
        registrySheet.getRange(i + 1, 13).setValue(giftId);
        return { success: true, plan, planExpiresOn: expiresOn, giftMessage: gift, giftId };
      }
    }
    return { success: false, error: 'User not found in registry.' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function hasThemeCustomizationAccess(email) {
  if (ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  const status = getUserStatusAction(email);
  return status.success && status.plan === 'Pro';
}

function getUserStatusAction(email) {
  try {
    const masterSs = getSpreadsheet();
    let registrySheet = masterSs.getSheetByName('_Registry');
    if (!registrySheet) return { success: true, status: 'Active', plan: 'Free' };

    const lastRow = registrySheet.getLastRow();
    if (lastRow < 2) return { success: true, status: 'Active', plan: 'Free' };

    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    for (let i = 1; i < registryData.length; i++) {
      if (registryData[i][0].toString().toLowerCase() === email.toLowerCase()) {
        const status = registryData[i][5]?.toString() || 'Active';
        const reason = registryData[i][8]?.toString() || ''; // Optional Column 9 for Reason
        let plan = registryData[i][9]?.toString() || 'Free';
        const expiryValue = registryData[i][10];
        const expiryDate = expiryValue ? new Date(expiryValue) : null;
        if (plan === 'Pro' && expiryDate && !isNaN(expiryDate.getTime()) && expiryDate.getTime() <= Date.now()) {
          plan = 'Free';
          registrySheet.getRange(i + 1, 10).setValue('Free');
          registrySheet.getRange(i + 1, 11).clearContent();
        }
        return {
          success: true, status, reason, plan,
          planExpiresOn: plan === 'Pro' && expiryDate ? expiryDate.toISOString() : '',
          giftMessage: registryData[i][11]?.toString() || '',
          giftId: registryData[i][12]?.toString() || ''
        };
      }
    }
    return { success: true, status: 'Active', plan: 'Free' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}


// ─── USER DATA OPERATIONS ──────────────────────────────────────────────────────

function getConfig(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'Config', email);
    const config = {};
    rows.forEach(({ obj }) => { if (obj.Key) config[obj.Key] = obj.Value; });
    return { success: true, data: config };
  } catch (err) {
    return { success: false, error: err.toString(), data: {} };
  }
}

function setConfig(ssId, email, key, value) {
  try {
    validateConfigKey(key);
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ensureSheet(ss, 'Config');
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const allData = sheet.getRange(1, 1, lastRow, 3).getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0]?.toString().toLowerCase() === email.toLowerCase() &&
            allData[i][1]?.toString() === key) {
          sheet.getRange(i + 1, 3).setValue(sanitizeCell(value));
          return { success: true };
        }
      }
    }
    sheet.appendRow(sanitizeRow([email, key, value]));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function setConfigBatch(ssId, email, values) {
  try {
    const keys = Object.keys(values || {});
    if (keys.length > 100) return { success: false, error: 'Too many configuration values.' };
    for (let i = 0; i < keys.length; i++) {
      const result = setConfig(ssId, email, keys[i], values[keys[i]]);
      if (!result.success) return result;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function completeOnboarding(ssId, email, profile) {
  try {
    const cleanProfile = {
      name: profile.name || '',
      profession: profile.profession || '',
      sideIncome: Array.isArray(profile.sideIncome) ? profile.sideIncome : [],
      personality: profile.personality || '',
      welcomeNote: profile.welcomeNote || '',
      theme: profile.theme || null,
    };
    const configResult = setConfigBatch(ssId, email, {
      Name: cleanProfile.name,
      ProfileJSON: JSON.stringify(cleanProfile),
      ThemeJSON: JSON.stringify(cleanProfile.theme || {}),
    });
    if (!configResult.success) return configResult;
    if (Array.isArray(profile.goals)) {
      const goalsResult = setGoals(ssId, email, profile.goals);
      if (!goalsResult.success) return goalsResult;
    }
    const memoryParts = [
      cleanProfile.name ? 'Name: ' + cleanProfile.name : '',
      cleanProfile.profession ? 'Profession: ' + cleanProfile.profession : '',
      cleanProfile.personality ? 'Money personality: ' + cleanProfile.personality : '',
      Array.isArray(profile.goals) && profile.goals.length
        ? 'Goals: ' + profile.goals.map(goal => goal.name).filter(Boolean).join(', ')
        : '',
    ].filter(Boolean);
    if (memoryParts.length) {
      const memoryResult = logMemory(ssId, email, {
        type: 'onboarding_profile',
        observation: memoryParts.join(' | '),
      });
      if (!memoryResult.success) return memoryResult;
    }
    const completionResult = setConfig(ssId, email, 'OnboardingComplete', 'true');
    if (!completionResult.success) return completionResult;
    return { success: true, profile: cleanProfile };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function callAI(email, request) {
  if (!OPENROUTER_API_KEY) return { success: false, error: 'AI gateway is not configured.' };
  const cache = CacheService.getScriptCache();
  const rateKey = 'ai_rate_' + Utilities.base64EncodeWebSafe(email.toLowerCase()).slice(0, 80);
  const requestCount = Number(cache.get(rateKey) || 0);
  if (requestCount >= 30) {
    return {
      success: true,
      fallback: true,
      content: "I'm having trouble reaching AI services right now. Your data remains safe. Please try again shortly.",
    };
  }
  cache.put(rateKey, String(requestCount + 1), 60);
  const messages = Array.isArray(request.messages) ? request.messages.slice(-80) : [];
  if (messages.length === 0) return { success: false, error: 'AI request has no messages.' };
  if (JSON.stringify(messages).length > 100000) return { success: false, error: 'AI request is too large.' };
  const payload = {
    models: OPENROUTER_MODELS,
    messages: messages,
    temperature: Math.max(0, Math.min(Number(request.temperature) || 0.7, 1.5)),
    max_tokens: Math.max(512, Math.min(Number(request.maxTokens) || 600, 1600)),
    reasoning: { effort: 'none', exclude: true },
  };
  try {
    const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + OPENROUTER_API_KEY, 'X-Title': 'Financial OS' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const data = JSON.parse(response.getContentText() || '{}');
    const message = data.choices?.[0]?.message || {};
    const content = String(message.content || message.reasoning || message.reasoning_content || '').trim();
    const code = response.getResponseCode();
    if (code >= 200 && code < 300 && content) {
      return { success: true, content, model: data.model || '' };
    }
    console.error('OpenRouter failed with code ' + code + ': ' + response.getContentText());
    return {
      success: true,
      fallback: true,
      diagnostic: code >= 200 && code < 300 ? 'openrouter_empty_content' : 'openrouter_http_' + code,
      content: "I'm having trouble reaching AI services right now. Your data remains safe. Please try again shortly.",
    };
  } catch (error) {
    console.error('OpenRouter transport error: ' + error.toString());
    return {
      success: true,
      fallback: true,
      diagnostic: 'openrouter_transport_error',
      content: "I'm having trouble reaching AI services right now. Your data remains safe. Please try again shortly.",
    };
  }
}

function getExpenses(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'Tracker', email);
    const data = rows.map(({ obj }) => ({
      month: obj.Month, year: parseInt(obj.Year) || new Date().getFullYear(),
      day: obj.Day, date: formatDateString(obj.Date), category: obj.Category,
      description: obj.Description, amount: parseFloat(obj.Amount) || 0,
      mode: obj.Mode, note: obj.Note, id: obj.ClientID || '',
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function logExpense(ssId, email, expense) {
  try {
    const normalized = normalizeExpenseRecord(expense);
    if (normalized.id) {
      const duplicate = readUserRows(ssId, 'Tracker', email).some(({ obj }) => String(obj.ClientID || '') === normalized.id);
      if (duplicate) return { success: true, duplicate: true };
    }
    return appendUserRow(ssId, 'Tracker', email, [
      normalized.month, normalized.year, normalized.day, normalized.date,
      normalized.category, normalized.description, normalized.amount,
      normalized.mode, normalized.note, normalized.id,
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function normalizeExpenseRecord(expense) {
  const now = new Date();
  const rawDate = String(expense.date || '');
  const parsed = rawDate ? new Date(rawDate + (rawDate.indexOf('T') === -1 ? 'T00:00:00' : '')) : now;
  const date = isNaN(parsed.getTime()) ? now : parsed;
  return {
    id: String(expense.id || expense.ClientID || ''),
    date: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    month: Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM'),
    year: Number(Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy')),
    day: Utilities.formatDate(date, Session.getScriptTimeZone(), 'EEE'),
    category: expense.category || '',
    description: expense.description || '',
    amount: Number(expense.amount) || 0,
    mode: expense.mode || '',
    note: expense.note || '',
  };
}

function formatDateString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    try {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } catch(e) {
      return val.toISOString().split('T')[0];
    }
  }
  const str = val.toString();
  if (str.indexOf('T') !== -1) {
    return str.split('T')[0];
  }
  return str;
}

function deleteExpense(ssId, email, expense) {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ensureSheet(ss, 'Tracker');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, error: 'No expenses found' };

    const allData = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    const headers = allData[0];
    const emailIdx = headers.indexOf('Email');
    const dateIdx = headers.indexOf('Date');
    const amountIdx = headers.indexOf('Amount');
    const descIdx = headers.indexOf('Description');
    const catIdx = headers.indexOf('Category');
    const clientIdIdx = headers.indexOf('ClientID');

    const expDateStr = formatDateString(expense.date || expense.Date || '');
    const expAmount = parseFloat(expense.amount || expense.Amount || 0);
    const expDesc = (expense.description || expense.Description || '').toString().toLowerCase().trim();
    const expCat = (expense.category || expense.Category || '').toString().toLowerCase().trim();
    const expClientId = String(expense.id || expense.ClientID || '');

    for (let i = allData.length - 1; i >= 1; i--) {
      const row = allData[i];
      if (row[emailIdx]?.toString().toLowerCase() === email.toLowerCase()) {
        const rowDateStr = formatDateString(row[dateIdx]);
        const rowAmount = parseFloat(row[amountIdx] || 0);
        const rowDesc = (row[descIdx] || '').toString().toLowerCase().trim();
        const rowCat = (row[catIdx] || '').toString().toLowerCase().trim();

        if ((expClientId && clientIdIdx !== -1 && String(row[clientIdIdx] || '') === expClientId) ||
            (rowDateStr === expDateStr &&
            Math.abs(rowAmount - expAmount) < 0.01 &&
            rowDesc === expDesc &&
            rowCat === expCat)) {
          sheet.deleteRow(i + 1);
          return { success: true };
        }
      }
    }
    return { success: false, error: 'Expense not found' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getIncome(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'Income', email);
    const data = rows.map(({ obj }) => ({
      month: obj.Month, year: parseInt(obj.Year), date: obj.Date,
      type: obj.Type, source: obj.Source,
      amount: parseFloat(obj.Amount) || 0, note: obj.Note, id: obj.ClientID || '',
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function logIncome(ssId, email, income) {
  try {
    const clientId = String(income.id || income.ClientID || '');
    if (clientId) {
      const duplicate = readUserRows(ssId, 'Income', email).some(({ obj }) => String(obj.ClientID || '') === clientId);
      if (duplicate) return { success: true, duplicate: true };
    }
    return appendUserRow(ssId, 'Income', email, [
      income.month, income.year, income.date,
      income.type, income.source, income.amount, income.note || '', clientId,
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getGoals(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'SavingsGoals', email);
    const data = rows.map(({ obj }) => ({
      id: obj.ID || Date.now(), name: obj.GoalName,
      target: parseFloat(obj.Target) || 0, saved: parseFloat(obj.Saved) || 0,
      monthlyAdd: parseFloat(obj.MonthlyAdd) || 0, deadline: obj.Deadline,
      icon: obj.Icon, color: obj.Color, status: obj.Status,
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function setGoals(ssId, email, goals) {
  try {
    if (!Array.isArray(goals) || goals.length > 100) return { success: false, error: 'Invalid goals payload.' };
    const rows = goals.map(g => [g.id, g.name, g.target, g.saved, g.monthlyAdd, g.deadline, g.icon, g.color, g.status]);
    return replaceUserRows(ssId, 'SavingsGoals', email, rows);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getBills(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'BillCalendar', email);
    const data = rows.map(({ obj }) => ({
      id: obj.ID, name: obj.BillName, amount: parseFloat(obj.Amount) || 0,
      dueDate: parseInt(obj.DueDate) || 1, frequency: obj.Frequency,
      category: obj.Category, status: obj.Status, lastPaid: obj.LastPaid || '',
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function setBills(ssId, email, bills) {
  try {
    if (!Array.isArray(bills) || bills.length > 100) return { success: false, error: 'Invalid bills payload.' };
    const rows = bills.map(b => [b.id, b.name, b.amount, b.dueDate, b.frequency, b.category, b.status, b.lastPaid || '']);
    return replaceUserRows(ssId, 'BillCalendar', email, rows);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getMemory(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'AIMemory', email);
    const data = rows
      .map(({ obj }) => ({ date: obj.Date, type: obj.Type, observation: obj.Observation }))
      .filter(memory => isValidMemoryObservation(memory.observation));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function logMemory(ssId, email, mem) {
  try {
    const observation = String(mem?.observation || '').trim();
    if (!isValidMemoryObservation(observation) || observation.length > 5000) {
      return { success: false, error: 'Invalid memory payload.' };
    }
    const existing = readUserRows(ssId, 'AIMemory', email).some(
      row => String(row.obj.Observation || '').trim().toLowerCase() === observation.toLowerCase()
    );
    if (existing) return { success: true, duplicate: true };
    return appendUserRow(ssId, 'AIMemory', email, [
      new Date().toLocaleDateString('en-IN'), mem.type, observation,
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function isValidMemoryObservation(observation) {
  const value = String(observation || '').trim().toLowerCase();
  if (value.length < 3) return false;
  const transientPatterns = [
    'having trouble reaching ai services',
    'your data remains safe',
    'please try again shortly',
    'something went wrong',
    'too many requests',
    'rate limit',
    'temporarily unavailable',
    'overloaded',
    'ai is taking too long',
  ];
  return !transientPatterns.some(pattern => value.indexOf(pattern) !== -1);
}

function getBlueprint(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'Blueprint', email);
    const data = rows.map(({ obj }) => ({
      SectionID: obj.SectionID, Name: obj.Name, Icon: obj.Icon,
      SheetRef: obj.SheetRef, Status: obj.Status, CreatedOn: obj.CreatedOn,
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function setBlueprint(ssId, email, section) {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ensureSheet(ss, 'Blueprint');
    const rows = readUserRows(ssId, 'Blueprint', email);
    const existing = rows.find(r => r.obj.SectionID === section.SectionID);
    if (existing) return { success: true };
    return appendUserRow(ssId, 'Blueprint', email, [
      section.SectionID, section.Name, section.Icon,
      section.SheetRef, section.Status || 'Active',
      new Date().toLocaleDateString('en-IN'),
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function logSnapshot(ssId, email, snapshot) {
  try {
    return appendUserRow(ssId, 'MonthlySnapshot', email, [
      snapshot.month, snapshot.year, snapshot.income, snapshot.extraIncome,
      snapshot.expenses, snapshot.savings, snapshot.buffer,
      snapshot.savingsRate, snapshot.topCategory, snapshot.notes || '',
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function loadAll(ssId, email) {
  try {
    const configResult = getConfig(ssId, email);
    const expensesResult = getExpenses(ssId, email);
    const incomeResult = getIncome(ssId, email);
    const goalsResult = getGoals(ssId, email);
    const billsResult = getBills(ssId, email);
    const memoryResult = getMemory(ssId, email);
    const blueprintResult = getBlueprint(ssId, email);
    const requiredResults = [configResult, expensesResult, incomeResult, goalsResult, billsResult, memoryResult, blueprintResult];
    const failedResult = requiredResults.find(result => !result.success);
    if (failedResult) return { success: false, error: failedResult.error || 'Could not load user workspace.' };

    const cfg = configResult.data || {};
    const budgets = {};
    Object.entries(cfg).forEach(([k, v]) => {
      if (k.startsWith('Budget:')) budgets[k.replace('Budget:', '')] = parseFloat(v) || 0;
    });

    return {
      success: true,
      isAdmin: !!ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      tracker: expensesResult.data,
      income: incomeResult.data,
      savingsGoals: goalsResult.data,
      billCalendar: billsResult.data,
      aiMemory: memoryResult.data,
      blueprint: blueprintResult.data,
      config: {
        name: cfg.Name || '',
        salary: parseFloat(cfg.Salary) || 0,
        homeIncome: parseFloat(cfg.HomeIncome) || 0,
        activeMonth: cfg.ActiveMonth || new Date().toLocaleString('default', { month: 'short' }),
        activeYear: parseInt(cfg.ActiveYear) || new Date().getFullYear(),
        budgets: Object.keys(budgets).length > 0 ? budgets : undefined,
        ThemeJSON: cfg.ThemeJSON || '',
      },
      profile: parseJsonOrNull(cfg.ProfileJSON),
      isOnboarded: String(cfg.OnboardingComplete).toLowerCase() === 'true',
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function parseJsonOrNull(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function checkUpdates(ssId, email) {
  try {
    const file = DriveApp.getFileById(ssId);
    return { success: true, lastUpdated: file.getLastUpdated().getTime() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function ensureDynamicSheet(ss, sheetName, headers) {
  validateDynamicSheetRequest(sheetName, headers);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    let fullHeaders = headers;
    if (headers[0] !== 'Email') {
      fullHeaders = ['Email', ...headers];
    }
    sheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function validateDynamicSheetRequest(sheetName, headers) {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(sheetName || '')) {
    throw new Error('Invalid dynamic sheet name.');
  }
  if (SCHEMAS[sheetName]) throw new Error('Core sheets cannot be managed dynamically.');
  if (!Array.isArray(headers) || headers.length < 1 || headers.length > 30) {
    throw new Error('Invalid dynamic sheet headers.');
  }
  headers.forEach(header => {
    if (!/^[A-Za-z][A-Za-z0-9_ ]{0,49}$/.test(String(header || ''))) {
      throw new Error('Invalid dynamic sheet header.');
    }
  });
}

function createDynamicSheet(ssId, email, tabName, headers) {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    ensureDynamicSheet(ss, tabName, headers);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getDynamicSheet(ssId, email, tabName) {
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return { success: true, data: [] };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };
    
    const lastCol = sheet.getLastColumn();
    const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = allData[0];
    const emailIdx = headers.indexOf('Email');
    if (emailIdx === -1) return { success: false, error: 'Dynamic sheet is missing its ownership column.', data: [] };
    
    const data = [];
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[emailIdx]?.toString().toLowerCase() === email.toLowerCase()) {
        const obj = {};
        headers.forEach((h, j) => {
          if (h !== 'Email') obj[h] = row[j];
        });
        data.push(obj);
      }
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function appendDynamicRow(ssId, email, tabName, rowData) {
  try {
    if (JSON.stringify(rowData || {}).length > 50000) return { success: false, error: 'Dynamic row is too large.' };
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) return { success: false, error: 'Sheet does not exist: ' + tabName };
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = new Array(headers.length);
    
    if (Array.isArray(rowData)) {
      newRow[0] = email;
      for (let idx = 1; idx < headers.length; idx++) {
        newRow[idx] = rowData[idx - 1] !== undefined ? rowData[idx - 1] : '';
      }
    } else {
      headers.forEach((h, idx) => {
        if (h === 'Email') {
          newRow[idx] = email;
        } else {
          newRow[idx] = rowData[h] !== undefined ? rowData[h] : '';
        }
      });
    }
    
    sheet.appendRow(sanitizeRow(newRow));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function sanitizeRow(row) {
  return row.map(sanitizeCell);
}

function sanitizeCell(value) {
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function validateConfigKey(key) {
  const allowed = ['Name', 'Salary', 'HomeIncome', 'ActiveMonth', 'ActiveYear', 'ThemeJSON', 'ProfileJSON', 'OnboardingComplete'];
  if (allowed.includes(key)) return;
  if (/^Budget:[A-Za-z0-9 _-]{1,50}$/.test(key || '')) return;
  throw new Error('Invalid configuration key.');
}

function enforceRequestRateLimit(userId) {
  const cache = CacheService.getScriptCache();
  const key = 'request_rate_' + Utilities.base64EncodeWebSafe(userId).slice(0, 80);
  const count = Number(cache.get(key) || 0);
  if (count >= 120) throw new Error('RATE_LIMIT: Too many requests. Please wait 60 seconds.');
  cache.put(key, String(count + 1), 60);
}
