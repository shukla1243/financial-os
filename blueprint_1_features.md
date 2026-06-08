# 🔒 BLUEPRINT 1 — FEATURES & LOGIC (DO NOT TOUCH)

> **⚠️ RULE: This document defines every piece of core application logic, state management, backend integration, and service layer in Financial OS. NOTHING described below may be modified, removed, refactored, or rewritten during UI/animation work. If any AI or developer is prompted to "improve the UI", they must cross-reference this blueprint and ensure zero changes to the items listed here.**

---

## 1. AUTHENTICATION SYSTEM

### Google OAuth Flow (`src/services/googleAuth.js`)
- **CLIENT_ID**: Configure `REACT_APP_GOOGLE_CLIENT_ID` in the deployment environment.
- **SCOPES**: `email profile` (minimized — NO Sheets/Drive scopes on client)
- **Token persistence**: Saved only for the active browser tab session.
- **Silent refresh**: On page reload, reads token from localStorage; if expired, calls `tokenClient.requestAccessToken()` without `prompt` param (not `'none'` — that causes Google to hang)
- **Force prompt**: `getAccessToken(true)` triggers `prompt: 'consent'` for fresh login
- **User info**: Fetched from `googleapis.com/oauth2/v2/userinfo` and cached in-memory as `currentUser`
- **Revoke**: `revokeToken()` calls `google.accounts.oauth2.revoke()`, clears localStorage and memory
- **DO NOT CHANGE**: Token flow, localStorage key, CLIENT_ID, scope string, revoke logic

### Login Page Logic (`src/pages/Login.jsx`)
- `handleGoogleLogin()`: calls `getAccessToken(true)` → `getUserInfo()` → `initUser(proxyUrl, email)` → `onLogin(user)`
- Error handling: catches `access_denied` specifically for test user messaging
- **DO NOT CHANGE**: Login flow, error detection, initUser call order

### Session Restoration (`src/context/AppContext.jsx`)
- `getInitialState()`: always starts clean before authenticated user-scoped hydration.
- Prevents React Strict Mode race condition where double-mount would overwrite state
- Always forces `sheetsConfig.proxyUrl` from hardcoded `PROXY_URL` constant (never from localStorage)
- **DO NOT CHANGE**: Initial state hydration logic, localStorage key, PROXY_URL enforcement

---

## 2. STATE MANAGEMENT — AppContext (`src/context/AppContext.jsx`)

### State Shape (all fields)
```
user, isLoggedIn, profile, isOnboarded, config (name, salary, homeIncome, activeMonth, 
activeYear, budgets{}), fixedExpenses{}, tracker[], income[], investments[], savingsGoals[], 
billCalendar[], monthlySnapshots[], aiMemory[], accountability[], appBlueprint[], 
newSectionNotifications[], aiInsights[], sheetsConfig{proxyUrl, connected}, geminiKey, 
notifications[], sidebarOpen, syncStatus, lastSynced, streaks{}, level, xp, 
financialHealthScore, isAdmin
```

### Reducer Actions (complete list — DO NOT modify any case logic)
| Action | What It Does |
|--------|-------------|
| `SET_USER` | Sets user object, isLoggedIn, isAdmin (checks email === admin) |
| `SET_ONBOARDED` | Marks onboarding complete, saves profile |
| `SET_CONFIG` | Merges config object (budgets, salary, etc.) |
| `ADD_CATEGORY` | Adds new category with budget to config.budgets |
| `ADD_EXPENSE` | Appends to tracker[] with auto-generated id |
| `REMOVE_EXPENSE` | Finds and splices matching expense from tracker[] (findLastIndex match on date+amount+description+category) |
| `ADD_INCOME` | Appends to income[] |
| `ADD_INVESTMENT` | Appends to investments[] |
| `UPDATE_GOAL` | Maps and updates matching goal in savingsGoals[] |
| `ADD_GOAL` | Appends to savingsGoals[] |
| `SET_GOALS` | Replaces entire savingsGoals[] |
| `UPDATE_BILL` | Maps and updates matching bill in billCalendar[] |
| `SET_SHEETS_CONFIG` | Merges sheetsConfig |
| `SET_GEMINI_KEY` | Sets geminiKey |
| `ADD_NOTIFICATION` | Appends notification with auto id |
| `REMOVE_NOTIFICATION` | Filters out notification by id |
| `TOGGLE_SIDEBAR` | Toggles sidebarOpen boolean |
| `ADD_AI_MEMORY` | Appends to aiMemory[] |
| `SET_BLUEPRINT` | Replaces appBlueprint[] |
| `ADD_BLUEPRINT_SECTION` | Appends to appBlueprint[] |
| `ADD_NEW_SECTION_NOTIFICATION` | Appends to newSectionNotifications[] |
| `CLEAR_NEW_SECTION_NOTIFICATIONS` | Empties newSectionNotifications[] |
| `SET_AI_INSIGHTS` | Replaces aiInsights[] |
| `SET_SYNC_STATUS` | Sets syncStatus and optionally lastSynced |
| `ADD_XP` | Adds XP and recalculates level (level = floor(xp/500)+1) |
| `ADD_BADGE` | Appends badge if not duplicate |
| `SET_HEALTH_SCORE` | Sets financialHealthScore |
| `LOAD_FROM_PROXY` | **Critical**: Overwrites tracker, income, savingsGoals, billCalendar, aiMemory from backend. Uses `|| []` to enforce empty arrays for mass deletions. |
| `LOAD_STATE` | Merges full state from localStorage, always re-forces PROXY_URL |

### Context Provider Exports
The `AppContext.Provider` exposes these via `value`:
```js
{ state, dispatch, computed, addExpense, deleteExpense, addNewCategory, 
  syncFromSheets, addIncome, addGoal, updateGoal, updateBill }
```
**DO NOT CHANGE**: The Provider value shape or any of the callback signatures.

### Action Creators (all async, all sync to backend)
| Creator | Logic |
|---------|-------|
| `addExpense(expense)` | Dispatch ADD_EXPENSE + ADD_XP(10) + proxyLogExpense |
| `deleteExpense(expense)` | Dispatch REMOVE_EXPENSE + proxyDeleteExpense |
| `addIncome(incomeItem)` | Dispatch ADD_INCOME + ADD_XP(10) + proxyLogIncome |
| `addGoal(goal)` | Dispatch ADD_GOAL + ADD_XP(15) + writeGoals (full replace) |
| `updateGoal(goal)` | Dispatch UPDATE_GOAL + writeGoals (full replace) |
| `updateBill(bill)` | Dispatch UPDATE_BILL + writeBills (full replace) |
| `addNewCategory(name, budget)` | Dispatch ADD_CATEGORY + proxyAddCategory |
| `syncFromSheets(proxyUrl, email)` | Dispatch SET_SYNC_STATUS + loadAllFromProxy + LOAD_FROM_PROXY + readBlueprint |

### Computed Values
```js
computed = { currentMonthExpenses, currentMonthIncome, totalIncome, totalExpenses, 
             totalBudget, categorySpend, buffer, savingsRate, baseIncome, extraIncome }
```
- `totalIncome = salary + homeIncome + extra income for current month`
- `buffer = totalIncome - totalExpenses`
- `savingsRate = ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)`
- **DO NOT CHANGE**: Any computation formula or filter logic

### Effects (Background Processes)
1. **Auto-Init on Login**: When `state.user.email` appears, calls `initUser` → `SET_SHEETS_CONFIG(connected:true)` → `loadAllFromProxy` → `LOAD_FROM_PROXY` → `readBlueprint`. Uses `autoInitRef` to run only once.
2. **User-scoped cache**: Saves non-secret offline state under the authenticated Google subject ID.
3. **Consciousness Scan**: Runs `runConsciousnessScan` once after proxy connects (uses `consciousnessRanRef`)
4. **Health Score Calculation**: Computes score from savings rate (40pts), budget adherence (30pts), streaks (20pts), goals (10pts)
5. **Auto-Sync Poller** (15-second interval): Calls `proxyCheckUpdates` → compares `lastUpdated` timestamp → if newer, calls `syncFromSheets`. Uses `lastDriveUpdateRef`.

**DO NOT CHANGE**: Any effect dependencies, intervals, ref guards, or computation logic.

---

## 3. BACKEND — Google Apps Script (`apps-script/Code.gs`)

### Architecture
- **Registry-Directory Model**: Master spreadsheet has `_Registry` sheet. Each user gets their own private Google Drive Spreadsheet stored in folder `Financial OS User Sheets`.
- **Server-side token verification**: Every request validates Google OAuth token via `https://oauth2.googleapis.com/tokeninfo`
- **Admin identity**: Configured server-side using Apps Script Properties.

### Sheet Schemas (per-user spreadsheet)
| Sheet | Columns |
|-------|---------|
| Config | Email, Key, Value |
| Tracker | Email, Month, Year, Day, Date, Category, Description, Amount, Mode, Note |
| Income | Email, Month, Year, Date, Type, Source, Amount, Note |
| Investments | Email, Date, Type, Fund_Coin, Units, BuyPrice, CurrentValue, Platform, Note |
| SavingsGoals | Email, ID, GoalName, Target, Saved, MonthlyAdd, Deadline, Icon, Color, Status |
| MonthlySnapshot | Email, Month, Year, Income, ExtraIncome, Expenses, Savings, Buffer, SavingsRate, TopCategory, Notes |
| AIMemory | Email, Date, Type, Observation |
| BillCalendar | Email, ID, BillName, Amount, DueDate, Frequency, Category, Status, LastPaid |
| Accountability | Email, Month, Year, PartnerEmail, SavingsRate, GoalsHit, BudgetAdherence, Comment, SharedOn |
| Blueprint | Email, SectionID, Name, Icon, SheetRef, Status, CreatedOn |

### Registry Schema
`Email, UserID, Name, SpreadsheetID, SpreadsheetURL, Status, CreatedOn, LastActiveOn`

### Backend Actions (doPost router)
| Action | Function | Notes |
|--------|----------|-------|
| `initUser` | getUserSpreadsheetId | Creates user sheet if new |
| `getConfig` | getConfig | Reads Config sheet as key-value |
| `setConfig` | setConfig | Upserts a key-value in Config |
| `getExpenses` | getExpenses | Reads Tracker sheet |
| `logExpense` | logExpense | Appends to Tracker |
| `deleteExpense` | deleteExpense | Finds and deletes matching row (last match) |
| `getIncome` | getIncome | Reads Income sheet |
| `logIncome` | logIncome | Appends to Income |
| `getGoals` | getGoals | Reads SavingsGoals |
| `setGoals` | setGoals | Full replace of SavingsGoals rows |
| `getBills` | getBills | Reads BillCalendar |
| `setBills` | setBills | Full replace of BillCalendar rows |
| `getMemory` | getMemory | Reads AIMemory |
| `logMemory` | logMemory | Appends to AIMemory |
| `getBlueprint` | getBlueprint | Reads Blueprint |
| `setBlueprint` | setBlueprint | Appends if SectionID not exists |
| `logSnapshot` | logSnapshot | Appends to MonthlySnapshot |
| `checkUpdates` | checkUpdates | Returns `DriveApp.getFileById(ssId).getLastUpdated().getTime()` |
| `loadAll` | loadAll | Reads ALL sheets in one call |
| `getAdminRegistry` | getAdminRegistry | Admin-only: returns all registry rows |
| `toggleUserStatus` | toggleUserStatus | Admin-only: sets Active/Suspended |

### Helper Functions
- `readUserRows(ssId, sheetName, email)`: Reads all rows matching email
- `appendUserRow(ssId, sheetName, email, rowValues)`: Appends with email prefix
- `replaceUserRows(ssId, sheetName, email, rowsArray)`: Deletes all user rows, re-appends new
- `ensureSheet(ss, sheetName)`: Creates sheet with headers if missing
- `verifyToken(token, email)`: Validates against Google tokeninfo API
- `getUserSpreadsheetId(email, name)`: Registry lookup/create
- `getOrCreateUserFolder()`: Gets or creates the Drive folder

**DO NOT CHANGE**: Any function signatures, sheet schemas, action routing, or verification logic.

---

## 4. PROXY SERVICE (`src/services/proxyService.js`)

### Core HTTP Helper
```js
proxyPost(proxyUrl, action, email, data)
```
- Retrieves OAuth token via `getAccessToken()`
- Sends as `text/plain;charset=utf-8` (avoids CORS preflight)
- Uses `redirect: 'follow'` (handles Apps Script 302 redirect)
- Body: `{ action, email, token, data }`

### Exported Functions (all use proxyPost internally)
| Function | Action | Notes |
|----------|--------|-------|
| `initUser` | `initUser` | |
| `loadAllFromProxy` | `loadAll` | Single-request full sync |
| `proxyCheckUpdates` | `checkUpdates` | Returns lastUpdated timestamp |
| `readConfig` | `getConfig` | |
| `upsertConfig` | `setConfig` | |
| `readCategories` | (derived from getConfig) | Filters `Budget:` prefixed keys |
| `addCategory` | `setConfig` with `Budget:` prefix | |
| `logExpense` | `logExpense` | |
| `deleteExpense` | `deleteExpense` | |
| `readExpenses` | `getExpenses` | |
| `logIncome` | `logIncome` | |
| `readIncome` | `getIncome` | |
| `writeGoals` | `setGoals` | Full replace |
| `readGoals` | `getGoals` | |
| `writeBills` | `setBills` | Full replace |
| `readBills` | `getBills` | |
| `writeMemory` | `logMemory` | |
| `readMemory` | `getMemory` | |
| `writeSnapshot` | `logSnapshot` | |
| `readBlueprint` | `getBlueprint` | |
| `writeToBlueprint` | `setBlueprint` | |
| `testProxyConnection` | GET health check | |
| `getAdminRegistry` | `getAdminRegistry` | Admin only |
| `toggleUserStatus` | `toggleUserStatus` | Admin only |

**DO NOT CHANGE**: Any function signature, the proxyPost helper, CORS strategy, or redirect config.

---

## 5. AI SERVICE (`src/services/aiService.js`)

### OpenRouter Integration
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Free Models Pool** (fallback loop, tried in order):
  ```
  google/gemini-2.5-flash-exp:free
  google/gemini-2.0-flash-exp:free
  meta-llama/llama-3.1-8b-instruct:free
  google/gemma-2-9b-it:free
  qwen/qwen-2.5-7b-instruct:free
  huggingfaceh4/zephyr-7b-beta:free
  mistralai/mistral-7b-instruct:free
  microsoft/phi-3-mini-128k-instruct:free
  microsoft/phi-3-medium-128k-instruct:free
  qwen/qwen-2-7b-instruct:free
  meta-llama/llama-3-8b-instruct:free
  meta-llama/llama-3.2-1b-instruct:free
  meta-llama/llama-3.2-3b-instruct:free
  nousresearch/hermes-3-llama-3.1-405b:free
  liquid/lfm-40b:free
  openchat/openchat-7b:free
  gryphe/mythomax-l2-13b:free
  undi95/toppy-m-7b:free
  openrouter/free
  ```

### `callAI({ systemInstruction, contents, temperature, maxTokens, key })`
- Converts Gemini-format payloads to OpenAI Chat format
- Iterates through FREE_MODELS; on failure (HTTP error or data.error), tries next
- Returns Gemini-compatible response shape: `{ candidates: [{ content: { parts: [{ text }] } }] }`
- Error detection: checks both `!res.ok` and `data.error` (catches 429 rate limit wrappers)

**DO NOT CHANGE**: The callAI function, model list, fallback loop, error detection, or response shaping.

---

## 6. CATEGORY ENGINE (`src/services/categoryEngine.js`)

### Self-Evolving Category System
- `checkCategoryExists(category, budgets)`: Case-insensitive lookup
- `suggestNewCategory(geminiKey, expense, existingCategories)`: Asks AI for category name, icon, budget, reason
- `buildDynamicSystemPrompt(state)`: Builds the full AI Logger system prompt with:
  - User profile, fixed expenses, current categories
  - Last 150 tracker entries, all income, investments, savings goals, bill calendar
  - Action definitions (expense, income, goal update, bill pay, delete/duplicates, general chat)
  - NEW: category prefix detection
  - Payment mode rules, date rules
  - Response JSON schema with all arrays
- `parseExpensesForNewCategories(expenses)`: Splits `NEW:` prefixed categories from regular ones

**DO NOT CHANGE**: Any prompt text, JSON schema, parsing logic, or category detection.

---

## 7. CONSCIOUSNESS ENGINE (`src/services/consciousnessEngine.js`)
- `runConsciousnessScan(proxyUrl, email, geminiKey, recentTracker)`: AI scans recent expenses to suggest new app sections
- `readBlueprint(proxyUrl, email)`: Reads existing blueprint sections from backend
- Generates `newSections` and `insights` arrays
- Dispatched via `ADD_BLUEPRINT_SECTION` and `SET_AI_INSIGHTS`

**DO NOT CHANGE**: Scan logic, blueprint reading, or section generation.

---

## 8. ROUTING & PAGE LOGIC

### App.jsx — Route Map
| Path | Component | Guard |
|------|-----------|-------|
| `/` | Dashboard | Authenticated + Onboarded |
| `/logger` | AILogger | Authenticated + Onboarded |
| `/analytics` | Analytics | Authenticated + Onboarded |
| `/investments` | Investments | Authenticated + Onboarded |
| `/goals` | SavingsGoals | Authenticated + Onboarded |
| `/bills` | BillCalendar | Authenticated + Onboarded |
| `/report` | MonthlyReport | Authenticated + Onboarded |
| `/chat` | AIChat | Authenticated + Onboarded |
| `/settings` | Settings | Authenticated + Onboarded |
| `/admin` | AdminDashboard | Authenticated + Onboarded + isAdmin |
| `/section/:sectionId` | DynamicSection | Authenticated + Onboarded |
| `*` | Navigate to `/` | Catch-all |

### Auth Guard Logic
1. `!state.isLoggedIn` → renders `<Login>`
2. `!state.isOnboarded` → renders `<Onboarding>`
3. Otherwise → renders Sidebar + Header + Routes

**DO NOT CHANGE**: Route paths, guard logic, component mapping, or navigation structure.

---

## 9. PAGE-SPECIFIC BUSINESS LOGIC

### AI Logger (`src/pages/AILogger.jsx`)
- **Conversation history**: Maintained in `messages[]` state and passed to `buildDynamicSystemPrompt` via `parseWithGemini`
- **Action card pipeline**: AI returns JSON → parsed into pending arrays → user confirms/rejects → action creators called
- **Pending state arrays**: `pendingExpenses`, `pendingNewCategories`, `pendingIncome`, `pendingGoals`, `pendingBills`, `pendingDeletions`
- **Duplicate detection**: Client-side check against `state.tracker` (same amount + description + date/month)
- **New category flow**: `NEW:` prefix → `suggestNewCategory()` → `NewCategoryCard` → `addNewCategory() + addExpense()`
- **Bill pay flow**: Confirms bill → `updateBill(status:'Paid')` → auto-logs expense
- **Delete flow**: `deleteExpense()` removes from both state and backend

**DO NOT CHANGE**: Any parsing logic, confirmation flows, duplicate detection, or action dispatch sequences.

### AI Chat (`src/pages/AIChat.jsx`)
- **System prompt**: `buildContext()` assembles full financial data context (last 150 expenses, all income, investments, goals, bills, memories, net worth calculation)
- **Quick prompts**: 6 preset buttons that inject text directly
- **Conversation history**: Full history passed to callAI on each message

**DO NOT CHANGE**: Context building, quick prompt texts, or conversation flow.

### Dashboard (`src/pages/Dashboard.jsx`)
- **KPI Cards**: Total Income, Total Expenses, Savings Target, Buffer
- **Category Budget Bars**: Reads from `config.budgets` and `categorySpend`
- **Net Worth**: `buffer + sipValue + cryptoValue`
- **Health Score**: Reads `financialHealthScore` from state
- **AI Insight**: Reads `aiInsights[0]` from state
- **Savings Goals**: Shows first 3 goals with progress
- **Over-budget alert**: Checks all categories

**DO NOT CHANGE**: Any data derivation, KPI formulas, or alert logic.

### Analytics (`src/pages/Analytics.jsx`)
- **Monthly aggregation**: Builds income vs expenses vs savings for all 12 months
- **Category donut**: Groups expenses by category for selected month
- **Drill-down**: Click category → shows individual transactions
- **Best/worst month**: Calculated from savings rate and expenses
- Uses Recharts: `BarChart`, `PieChart`, `AreaChart`

**DO NOT CHANGE**: Data aggregation logic, chart data transforms, or drill-down filtering.

### Savings Goals (`src/pages/SavingsGoals.jsx`)
- **ProgressRing SVG**: Custom circular progress indicator
- **Add money**: Updates goal saved amount, capped at target
- **Add goal**: Calls `addGoal()` with full goal object
- **ETA calculation**: `remaining / monthlyAdd` months

**DO NOT CHANGE**: Goal update logic, ETA calculation, or ProgressRing math.

### Bill Calendar (`src/pages/BillCalendar.jsx`)
- **Calendar grid**: Builds day cells for current month with bill markers
- **Status detection**: paid / overdue / due-soon / upcoming (based on `dueDate` vs today)
- **Mark Paid**: Calls `updateBill(status:'Paid')` + `addExpense()` (auto-logs the expense)
- **Mark Unpaid**: Calls `updateBill(status:'Unpaid')`

**DO NOT CHANGE**: Calendar generation, status logic, or mark paid/unpaid flows.

### Onboarding (`src/pages/Onboarding.jsx`)
- **AI conversation**: Uses ONBOARDING_PROMPT to learn user profile
- **Profile extraction**: Parses `PROFILE_COMPLETE:` JSON from AI response
- **Goal creation**: Dispatches SET_GOALS and syncs via writeGoals
- **Memory writing**: Logs profile to AIMemory sheet
- **Skip option**: Creates default profile

**DO NOT CHANGE**: Onboarding prompt, profile parsing, goal sync, or skip logic.

### Settings (`src/pages/Settings.jsx`)
- **System Status**: Read-only display of backend connection, AI status, health score, user info
- **Income configuration**: Salary and homeIncome
- **Category management**: Manual add with budget
- **Budget editing**: Per-category budget amounts
- **Data management**: Reset local data, export backup JSON

**DO NOT CHANGE**: Any save logic, sync triggers, or data export.

### Admin Dashboard (`src/pages/AdminDashboard.jsx`)
- **Registry display**: Shows all users from `_Registry` sheet
- **KPI cards**: Total Users, Active, Suspended counts
- **Search/filter**: Client-side filtering of registry
- **Status toggle**: Active ↔ Suspended via `toggleUserStatus`
- **Guard**: Only renders if `state.isAdmin === true`

**DO NOT CHANGE**: Admin guard, registry loading, or status toggle logic.

---

## 10. CONFIGURATION (`src/config.js`)
```js
PROXY_URL = 'https://script.google.com/macros/s/...'
GEMINI_KEY = 'sk-or-v1-...'
APP_VERSION = '4.0.0'
APP_NAME = 'Financial OS'
```
**DO NOT CHANGE**: Any config values or exports.

---

## 11. SIDEBAR NAVIGATION (`src/components/Sidebar.jsx`)
- **Static nav items**: Dashboard, AI Logger, Analytics, Investments, Goals, Bill Calendar, Monthly Report, AI Chat
- **Dynamic sections**: Reads from `state.appBlueprint` where `Status === 'Active'`
- **Level/XP bar**: Displays user level, XP progress, level name
- **Admin link**: Only shows if `state.isAdmin`
- **Collapse/expand**: Toggles `sidebarOpen` state

**DO NOT CHANGE**: Navigation items array, dynamic section rendering, admin guard, or XP calculation.

---

## 12. HEADER (`src/components/Header.jsx`)
- **Month indicator**: Shows `activeMonth activeYear`
- **Live status**: Green dot when connected
- **Health score badge**: Color-coded score/100
- **Sync button**: Triggers `syncFromSheets`
- **Notification bell**: Shows unread count dot
- **AI insight badge**: Shows when insights exist
- **Logout button**: Calls `revokeToken()` + `onLogout()`

**DO NOT CHANGE**: Any header action handlers or status display logic.

---

## 13. NEW SECTION TOAST (`src/components/NewSectionToast.jsx`)
- Displays toast notification when AI builds new sections
- Reads from `state.newSectionNotifications`

**DO NOT CHANGE**: Toast display logic.

---

## SUMMARY — WHAT IS LOCKED

| Layer | Files | Status |
|-------|-------|--------|
| Auth | `googleAuth.js` | 🔒 LOCKED |
| State | `AppContext.jsx` | 🔒 LOCKED |
| Backend | `Code.gs` | 🔒 LOCKED |
| Proxy | `proxyService.js` | 🔒 LOCKED |
| AI | `aiService.js` | 🔒 LOCKED |
| Categories | `categoryEngine.js` | 🔒 LOCKED |
| Consciousness | `consciousnessEngine.js` | 🔒 LOCKED |
| Config | `config.js` | 🔒 LOCKED |
| Routing | `App.jsx` (route definitions) | 🔒 LOCKED |
| All Page Logic | All `*.jsx` business logic | 🔒 LOCKED |

> **The ONLY things that may change are visual/presentational: CSS classes, inline `style={{}}` objects, animation keyframes, JSX structure for layout purposes (wrapping in new divs, adding spinner elements), and adding new UI-only state like `isSubmitting` booleans. See Blueprint 2 for details.**
