/**
 * SHREYANSH FINANCIAL OS — Google Apps Script Backend
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
const MASTER_SHEET_ID = 'YOUR_MASTER_SHEET_ID_HERE'; // ← paste your sheet ID here

// Admin email configured for control panel access
const ADMIN_EMAIL = 'testaiworkforcollage@gmail.com';

// Dedicated Google Drive folder name for individual user spreadsheet files
const FOLDER_NAME = 'Financial OS User Sheets';

// ─── SHEET SCHEMAS ────────────────────────────────────────────────────────────
const SCHEMAS = {
  Config:          ['Email', 'Key', 'Value'],
  Tracker:         ['Email', 'Month', 'Year', 'Day', 'Date', 'Category', 'Description', 'Amount', 'Mode', 'Note'],
  Income:          ['Email', 'Month', 'Year', 'Date', 'Type', 'Source', 'Amount', 'Note'],
  Investments:     ['Email', 'Date', 'Type', 'Fund_Coin', 'Units', 'BuyPrice', 'CurrentValue', 'Platform', 'Note'],
  SavingsGoals:    ['Email', 'ID', 'GoalName', 'Target', 'Saved', 'MonthlyAdd', 'Deadline', 'Icon', 'Color', 'Status'],
  MonthlySnapshot: ['Email', 'Month', 'Year', 'Income', 'ExtraIncome', 'Expenses', 'Savings', 'Buffer', 'SavingsRate', 'TopCategory', 'Notes'],
  AIMemory:        ['Email', 'Date', 'Type', 'Observation'],
  BillCalendar:    ['Email', 'ID', 'BillName', 'Amount', 'DueDate', 'Frequency', 'Category', 'Status', 'LastPaid'],
  Accountability:  ['Email', 'Month', 'Year', 'PartnerEmail', 'SavingsRate', 'GoalsHit', 'BudgetAdherence', 'Comment', 'SharedOn'],
  Blueprint:       ['Email', 'SectionID', 'Name', 'Icon', 'SheetRef', 'Status', 'CreatedOn'],
};

const REGISTRY_SCHEMA = ['Email', 'UserID', 'Name', 'SpreadsheetID', 'SpreadsheetURL', 'Status', 'CreatedOn', 'LastActiveOn'];

// Default budgets for new users
const DEFAULT_BUDGETS = {
  Housing: 7200, Food: 6620, Health: 1500, Telecom: 566,
  Subscriptions: 2098, Transport: 2000, Savings: 6000, Other: 0,
};

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, email, token, data } = body;

    if (!email) return jsonResponse({ success: false, error: 'Missing email' });

    // 1. Server-side Google OAuth Token Verification
    verifyToken(token, email);

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

    if (action === 'getUserStatus') {
      return jsonResponse(getUserStatusAction(email));
    }

    // 3. User operations: Get or create dedicated user Spreadsheet ID
    const userSsId = getUserSpreadsheetId(email, action === 'initUser' ? data?.name : null);

    let result;
    switch (action) {
      case 'initUser':       result = { success: true }; break; // getUserSpreadsheetId handled creation/validation
      case 'getConfig':      result = getConfig(userSsId, email); break;
      case 'setConfig':      result = setConfig(userSsId, email, data.key, data.value); break;
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
  return true;
}

/**
 * Resolves or creates a dedicated Google Spreadsheet for a user, checking for suspension.
 */
function getUserSpreadsheetId(email, name) {
  const masterSs = getSpreadsheet();
  let registrySheet = masterSs.getSheetByName('_Registry');
  if (!registrySheet) {
    registrySheet = masterSs.insertSheet('_Registry');
    registrySheet.getRange(1, 1, 1, REGISTRY_SCHEMA.length).setValues([REGISTRY_SCHEMA]);
    registrySheet.setFrozenRows(1);
  }

  const lastRow = registrySheet.getLastRow();
  let userRowIndex = -1;
  let spreadsheetId = '';
  let status = 'Active';

  if (lastRow >= 2) {
    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    for (let i = 1; i < registryData.length; i++) {
      if (registryData[i][0].toString().toLowerCase() === email.toLowerCase()) {
        userRowIndex = i + 1;
        spreadsheetId = registryData[i][3].toString();
        status = registryData[i][5].toString();
        break;
      }
    }
  }

  if (status === 'Suspended') {
    throw new Error('Your account has been suspended by the administrator.');
  }

  const todayStr = new Date().toLocaleString('en-IN');

  if (userRowIndex !== -1 && spreadsheetId) {
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
  const newUserId = 'USR' + Math.floor(100000 + Math.random() * 900000);

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

  // Write default config
  const configSheet = newSs.getSheetByName('Config');
  const defaults = [
    [email, 'Name', userName],
    [email, 'Salary', '15000'],
    [email, 'HomeIncome', '0'],
    [email, 'ActiveMonth', new Date().toLocaleString('default', { month: 'short' })],
    [email, 'ActiveYear', new Date().getFullYear().toString()],
    [email, 'CreatedOn', new Date().toLocaleDateString('en-IN')],
  ];
  Object.entries(DEFAULT_BUDGETS).forEach(([cat, amt]) => {
    defaults.push([email, `Budget:${cat}`, amt.toString()]);
  });
  defaults.forEach(row => configSheet.appendRow(row));

  // Save to master registry
  registrySheet.appendRow([
    email,
    newUserId,
    userName,
    newSsId,
    newSsUrl,
    'Active',
    todayStr,
    todayStr
  ]);

  return newSsId;
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
  sheet.appendRow([email, ...rowValues]);
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

  rowsArray.forEach(row => sheet.appendRow([email, ...row]));
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
        lastActiveOn: registryData[i][7]
      });
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function toggleUserStatus(targetEmail, status, reason = '') {
  try {
    const masterSs = getSpreadsheet();
    let registrySheet = masterSs.getSheetByName('_Registry');
    if (!registrySheet) return { success: false, error: 'Registry not found.' };

    const lastRow = registrySheet.getLastRow();
    if (lastRow < 2) return { success: false, error: 'No users registered.' };

    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    for (let i = 1; i < registryData.length; i++) {
      if (registryData[i][0].toString().toLowerCase() === targetEmail.toLowerCase()) {
        registrySheet.getRange(i + 1, 6).setValue(status); // Column 6 is Status
        registrySheet.getRange(i + 1, 9).setValue(reason); // Column 9 is Reason
        return { success: true };
      }
    }
    return { success: false, error: 'User not found in registry.' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getUserStatusAction(email) {
  try {
    const masterSs = getSpreadsheet();
    let registrySheet = masterSs.getSheetByName('_Registry');
    if (!registrySheet) return { success: true, status: 'Active' };

    const lastRow = registrySheet.getLastRow();
    if (lastRow < 2) return { success: true, status: 'Active' };

    const registryData = registrySheet.getRange(1, 1, lastRow, REGISTRY_SCHEMA.length).getValues();
    for (let i = 1; i < registryData.length; i++) {
      if (registryData[i][0].toString().toLowerCase() === email.toLowerCase()) {
        const status = registryData[i][5]?.toString() || 'Active';
        const reason = registryData[i][8]?.toString() || ''; // Optional Column 9 for Reason
        return { success: true, status, reason };
      }
    }
    return { success: true, status: 'Active' };
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
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ensureSheet(ss, 'Config');
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const allData = sheet.getRange(1, 1, lastRow, 3).getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0]?.toString().toLowerCase() === email.toLowerCase() &&
            allData[i][1]?.toString() === key) {
          sheet.getRange(i + 1, 3).setValue(value);
          return { success: true };
        }
      }
    }
    sheet.appendRow([email, key, value]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getExpenses(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'Tracker', email);
    const data = rows.map(({ obj }) => ({
      month: obj.Month, year: parseInt(obj.Year) || new Date().getFullYear(),
      day: obj.Day, date: formatDateString(obj.Date), category: obj.Category,
      description: obj.Description, amount: parseFloat(obj.Amount) || 0,
      mode: obj.Mode, note: obj.Note,
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function logExpense(ssId, email, expense) {
  try {
    return appendUserRow(ssId, 'Tracker', email, [
      expense.month, expense.year, expense.day, expense.date,
      expense.category, expense.description, expense.amount,
      expense.mode, expense.note || '',
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
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

    const expDateStr = formatDateString(expense.date || expense.Date || '');
    const expAmount = parseFloat(expense.amount || expense.Amount || 0);
    const expDesc = (expense.description || expense.Description || '').toString().toLowerCase().trim();
    const expCat = (expense.category || expense.Category || '').toString().toLowerCase().trim();

    for (let i = allData.length - 1; i >= 1; i--) {
      const row = allData[i];
      if (row[emailIdx]?.toString().toLowerCase() === email.toLowerCase()) {
        const rowDateStr = formatDateString(row[dateIdx]);
        const rowAmount = parseFloat(row[amountIdx] || 0);
        const rowDesc = (row[descIdx] || '').toString().toLowerCase().trim();
        const rowCat = (row[catIdx] || '').toString().toLowerCase().trim();

        if (rowDateStr === expDateStr &&
            Math.abs(rowAmount - expAmount) < 0.01 &&
            rowDesc === expDesc &&
            rowCat === expCat) {
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
      amount: parseFloat(obj.Amount) || 0, note: obj.Note,
    }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function logIncome(ssId, email, income) {
  try {
    return appendUserRow(ssId, 'Income', email, [
      income.month, income.year, income.date,
      income.type, income.source, income.amount, income.note || '',
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
    const rows = bills.map(b => [b.id, b.name, b.amount, b.dueDate, b.frequency, b.category, b.status, b.lastPaid || '']);
    return replaceUserRows(ssId, 'BillCalendar', email, rows);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getMemory(ssId, email) {
  try {
    const rows = readUserRows(ssId, 'AIMemory', email);
    const data = rows.map(({ obj }) => ({ date: obj.Date, type: obj.Type, observation: obj.Observation }));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.toString(), data: [] };
  }
}

function logMemory(ssId, email, mem) {
  try {
    return appendUserRow(ssId, 'AIMemory', email, [
      new Date().toLocaleDateString('en-IN'), mem.type, mem.observation,
    ]);
  } catch (err) {
    return { success: false, error: err.toString() };
  }
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

    const cfg = configResult.data || {};
    const budgets = {};
    Object.entries(cfg).forEach(([k, v]) => {
      if (k.startsWith('Budget:')) budgets[k.replace('Budget:', '')] = parseFloat(v) || 0;
    });

    return {
      success: true,
      tracker: expensesResult.data,
      income: incomeResult.data,
      savingsGoals: goalsResult.data,
      billCalendar: billsResult.data,
      aiMemory: memoryResult.data,
      blueprint: blueprintResult.data,
      config: {
        name: cfg.Name || 'User',
        salary: parseFloat(cfg.Salary) || 15000,
        homeIncome: parseFloat(cfg.HomeIncome) || 0,
        activeMonth: cfg.ActiveMonth || new Date().toLocaleString('default', { month: 'short' }),
        activeYear: parseInt(cfg.ActiveYear) || new Date().getFullYear(),
        budgets: Object.keys(budgets).length > 0 ? budgets : undefined,
      },
    };
  } catch (err) {
    return { success: false, error: err.toString() };
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
    
    const data = [];
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (emailIdx === -1 || row[emailIdx]?.toString().toLowerCase() === email.toLowerCase()) {
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
    
    sheet.appendRow(newRow);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
