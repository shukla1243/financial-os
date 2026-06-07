# Financial OS — Project Handover & Context

This document provides a complete summary of the architecture, code modifications, and current state of **Financial OS (v4)** for reference in future development sessions.

---

## 🚀 Recent Key Milestones Completed

### 1. 100% Inline Styles Refactor (Tailwind Removal)
* **Goal**: Resolved broken layout bugs caused by Tailwind CSS not compiling/rendering in the development environment.
* **Action**: Fully removed all Tailwind classes (`className="..."`) from all pages and components and converted them to **inline React styles (`style={{ ... }}`)**.
* **Impact**: The app now renders a premium, neon-accented, glassmorphic dark UI out-of-the-box on any system, without requiring a Tailwind compilation step.

### 2. Centralized Backend, OpenRouter & Settings
* **Goal**: Enable running the AI features for free without direct Gemini API rate limits and keep configuration centralized.
* **Action**:
  * Migrated the AI capabilities to OpenRouter (`https://openrouter.ai`) via a centralized [aiService.js](file:///d:/test/src/services/aiService.js).
  * Implemented a fallback models pool (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemma-4-31b-it:free`, `qwen/qwen3-coder:free`, and `openrouter/free`) to automatically failover if a free tier model goes offline or is rate-limited.
  * Added explicit checking of payload-embedded error objects (like 429 rate limit wrappers) in OpenRouter responses to successfully trigger the fallback failover loop.
  * Enabled conversation history tracking in the AI Expense Logger ([AILogger.jsx](file:///d:/test/src/pages/AILogger.jsx)) to maintain conversation context during follow-up messages or multi-step clarifications.
  * Configured `GEMINI_KEY` (now OpenRouter Key) and `PROXY_URL` inside [config.js](file:///d:/test/src/config.js).
  * Removed all configuration text inputs (like Apps Script URL, Sheet ID, etc.) from the **Settings** page. It is now a read-only **System Status** viewer.
  * Configured **Auto-Init on Login**: When a user logs in, [AppContext.jsx](file:///d:/test/src/context/AppContext.jsx) automatically calls `initUser` and syncs sheets data down in the background.

### 3. AI Sheets Reading & Logger Actions (Dynamic Buttons)
* **Goal**: Allow AI features to read all database records and perform complex actions beyond simple expense parsing.
* **Action**:
  * **Exposed Sheets**: Enhanced the system prompts of both the AI Advisor Chat (`AIChat.jsx`) and the AI Logger (`AILogger.jsx` / `categoryEngine.js`) with the user's complete active sheets: Tracker (last 150 items), Income logs, Investments, Savings Goals, and Bill Calendar.
  * **Duplicate Detection**: Implemented client-side duplicate checking in the AI Logger. If a duplicate amount and description is found on the same date/month, a warning is rendered and the button changes to *"Log Anyway"*.
  * **Dynamic Action Cards**: Enable the AI Logger to process multiple actions (Expenses, Income, Savings Goals, Bill Payments) and dynamically generate confirm/ignore card buttons for each action type.
  * **Bill Pay Integration**: Marked bills can be confirmed directly from the logger. Confirming marks the bill as PAID and auto-logs the expense.

### 4. Auto-Sync on Every Change
* **Goal**: Ensure user modifications to Savings Goals, Bill Calendar payments, and Income are saved to Google Drive immediately and not lost on page reload.
* **Action**:
  * Created centralized sync hooks in `AppContext.jsx`: `addIncome`, `addGoal`, `updateGoal`, and `updateBill`.
  * Wired `SavingsGoals.jsx` and `BillCalendar.jsx` to trigger these sync creators rather than local-only dispatches.
  * Wired `Onboarding.jsx` to sync suggested onboarding goals straight to Google Sheets upon completing the profile setup.

### 5. Database Registry-Directory Model & Admin Control Panel
* **Goal**: Provide automated, scalable private database provisioning for multiple users while keeping access secure and offering administrative control.
* **Action**:
  * **Registry-Directory Model**: Rewrote backend [Code.gs](file:///d:/test/apps-script/Code.gs) to create user-specific spreadsheet files inside a dedicated folder (`Financial OS User Sheets`) in Google Drive and log details in a secure master registry sheet (`_Registry`).
  * **Server-side Token Verification**: Server validates Google OAuth access tokens via the Google API (`https://oauth2.googleapis.com/tokeninfo`) to verify the caller's email matches the request.
  * **Admin Panel**: Built a dedicated [AdminDashboard.jsx](file:///d:/test/src/pages/AdminDashboard.jsx) using inline React styles. Displays user KPI cards (Total Users, Active, Suspended), a search filter, spreadsheet links, and status toggles (Active vs Suspended).
  * **Secure Routing**: Wired `/admin` protected route in [App.jsx](file:///d:/test/src/App.jsx) and dynamic Admin Panel menu item in [Sidebar.jsx](file:///d:/test/src/components/Sidebar.jsx), both guarded by `state.isAdmin` (verifying email matches `testaiworkforcollage@gmail.com`).
  * **Session Persistence & Scope Minimization**:
    * Saved the Google OAuth access token to `localStorage` and configured automatic silent token refreshes (`prompt: 'none'`) on page reload to fix page-refresh logout bugs.
    * Reduced requested OAuth scopes in the React client-side to only `email profile`. New users are no longer prompted for invasive Sheets/Drive scopes; they only share their identity, while all database files are provisioned and managed on the admin's centralized server context.
    * Refactored [AppContext.jsx](file:///d:/test/src/context/AppContext.jsx) state initialization to read from `localStorage` synchronously during component creation (`useReducer` initializer), preventing race conditions where Strict Mode would overwrite state with the logged-out default state on initial mount.
    * Updated [Onboarding.jsx](file:///d:/test/src/pages/Onboarding.jsx) to automatically initialize the onboarding chat if `state.geminiKey` is pre-configured, bypassing the 'API Key Required' setup form screen completely for seamless first-time onboarding.

### 6. Apps Script CORS & Redirect Fixes
* **Action**:
  * Set `redirect: 'follow'` in [proxyService.js](file:///d:/test/src/services/proxyService.js) fetch calls to handle Apps Script's `302 Moved Temporarily` responses.
  * Sent requests as `text/plain` to avoid triggering CORS preflight pre-requests from the browser.

### 7. Duplicate Expense Deletion
* **Goal**: Allow users to detect and delete duplicate expense entries via the AI Logger chat interface.
* **Action**:
  * Added `deleteExpense` to the backend [Code.gs](file:///d:/test/apps-script/Code.gs), searching by matching date, amount, category, and description.
  * Created a proxy hook and `REMOVE_EXPENSE` reducer action in [AppContext.jsx](file:///d:/test/src/context/AppContext.jsx).
  * Updated [categoryEngine.js](file:///d:/test/src/services/categoryEngine.js) to instruct the AI to find matching expenses and return them in a `"deletions"` array when the user asks to delete duplicates.
  * Added `DeleteProposalCard` UI component to [AILogger.jsx](file:///d:/test/src/pages/AILogger.jsx) to let the user confirm or cancel deletion operations directly from the chat.

### 8. Authentication & AI Routing Bugfixes
* **Google OAuth Popup Fix**: Updated `getAccessToken()` in [googleAuth.js](file:///d:/test/src/services/googleAuth.js) to call `tokenClient.requestAccessToken()` without the buggy `prompt: 'none'` parameter. This prevents Google Identity Services from permanently hanging on a blank "One moment please..." popup when attempting to automatically refresh expired OAuth sessions.
* **OpenRouter Fallback Array**: Corrected the `FREE_MODELS` list in [aiService.js](file:///d:/test/src/services/aiService.js) to use actual, verified free OpenRouter models (e.g., `meta-llama/llama-3.1-8b-instruct:free`, `google/gemma-2-9b-it:free`, `qwen/qwen-2.5-7b-instruct:free`) so that the fallback loop correctly fails over instead of immediately crashing with "Provider returned error".

### 9. Background Auto-Sync Polling
* **Goal**: Automatically keep the dashboard UI in sync with manual changes made directly to the Google Sheet, without requiring the user to hit refresh.
* **Action**:
  * Added `checkUpdates` action to [Code.gs](file:///d:/test/apps-script/Code.gs) that returns the exact `lastUpdated` millisecond timestamp of the user's private Google Drive Spreadsheet using `DriveApp.getFileById(ssId).getLastUpdated()`.
  * Added `proxyCheckUpdates` in [proxyService.js](file:///d:/test/src/services/proxyService.js) to fetch this timestamp.
  * Configured a `setInterval` in [AppContext.jsx](file:///d:/test/src/context/AppContext.jsx) that pings `proxyCheckUpdates` every 15 seconds. If it detects a newer timestamp than the `lastDriveUpdateRef`, it silently calls `syncFromSheets` to rebuild the dashboard with real-time sheet data.
  * Updated the `LOAD_FROM_PROXY` reducer to strictly enforce empty arrays `[]` when the backend returns empty, to ensure manual mass deletions in the sheet correctly propagate to the UI without falling back to local storage mock data.

---

## 💻 Key Code Modifications

### A. Context Auto-Sync Creators
Located in [AppContext.jsx](file:///d:/test/src/context/AppContext.jsx). Performs background sync fetch requests to Google Apps Script when local state changes:
```javascript
  // ─── ADD INCOME ──────────────────────────────────────────────────────────────
  const addIncome = useCallback(async (incomeItem) => {
    const incomeWithId = { ...incomeItem, id: incomeItem.id || Date.now() };
    dispatch({ type: 'ADD_INCOME', payload: incomeWithId });
    dispatch({ type: 'ADD_XP', payload: 10 });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      await proxyLogIncome(proxyUrl, email, incomeWithId).catch(() => {});
    }
  }, [state.sheetsConfig, state.user]);

  // ─── UPDATE GOAL ─────────────────────────────────────────────────────────────
  const updateGoal = useCallback(async (goal) => {
    dispatch({ type: 'UPDATE_GOAL', payload: goal });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      const updatedGoals = state.savingsGoals.map(g => g.id === goal.id ? { ...g, ...goal } : g);
      await writeGoals(proxyUrl, email, updatedGoals).catch(() => {});
    }
  }, [state.sheetsConfig, state.user, state.savingsGoals]);
```

### B. CORS-Safe Apps Script POST Fetch
Located in [proxyService.js](file:///d:/test/src/services/proxyService.js) (lines 17-42). Bypasses CORS constraints and handles the Apps Script 302 redirect:
```javascript
async function proxyPost(proxyUrl, action, email, data = null) {
  if (!proxyUrl) throw new Error('Apps Script URL not configured.');
  
  // Retrieve the active Google OAuth token to authenticate request server-side
  let token = null;
  try {
    token = await getAccessToken();
  } catch (e) {
    throw new Error('Google Sign-In session has expired or is invalid. Please log in again.');
  }

  const body = { action, email, token };
  if (data !== null) body.data = data;

  const res = await fetch(proxyUrl, {
    method: 'POST',
    // text/plain avoids CORS preflight OPTIONS request
    // redirect:'follow' is essential — Apps Script returns a 302 before the real response
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}
```

---

## 🛠️ Deployment Secrets & Action Checklist

Before rebuilding/deploying the production version, make sure:
1. **OpenRouter Key**: Paste your OpenRouter API key inside [config.js](file:///d:/test/src/config.js).
2. **Apps Script Access**: The Apps Script must be deployed as:
   * **Execute as**: `Me`
   * **Who has access**: `Anyone` (this is critical; selecting *"Anyone with Google Account"* will block access from the web client due to CORS redirect constraints).

---

## 📂 Current File Reference Map

* **Main App & Navigation Layout**: [App.jsx](file:///d:/test/src/App.jsx)
* **Global Context & Initialization**: [AppContext.jsx](file:///d:/test/src/context/AppContext.jsx)
* **API Client Config**: [config.js](file:///d:/test/src/config.js)
* **Central OpenRouter AI Client**: [aiService.js](file:///d:/test/src/services/aiService.js)
* **Client-side Sheets Connector**: [proxyService.js](file:///d:/test/src/services/proxyService.js)
* **Google Apps Script Code**: [Code.gs](file:///d:/test/apps-script/Code.gs)
* **Admin Panel Dashboard**: [AdminDashboard.jsx](file:///d:/test/src/pages/AdminDashboard.jsx)
* **Core Styling Base**: [index.css](file:///d:/test/src/index.css) (Note: body uses dark styling `#0a0a14` and Orbitron/Inter fonts). Now imports dynamic variables.

---

## 🚀 Phase 4: Dynamic Theme Engine, Sheets Sync & Persistent Memory

### 1. Universal Dynamic Theme Engine (Endless Possibilities)
* **Goal**: Enable endless dynamic aesthetics instead of hardcoded layouts, including dynamic themes based on user description prompts (vibes).
* **Action**:
  * Implemented [themeEngine.js](file:///d:/test/src/services/themeEngine.js) to support CSS style variables injection, default presets (Cyberpunk, Slate/Freelancer, Chalkboard/Teacher, Minimalist, Sakura), and AI theme generation from a natural language vibe.
  * Updated `App.jsx` to dynamically inject the CSS variables onto the DOM root element at load.
  * Added a **Dynamic Theming** panel to [Settings.jsx](file:///d:/test/src/pages/Settings.jsx) with preset selectors, color picker inputs, select inputs, and a prompt-based theme generator.

### 2. Self-Expanding Sheets Tab Creation
* **Goal**: Support actual Google Sheets tab creation and dynamic row writes instead of local memory mocks.
* **Action**:
  * Added `createDynamicSheet`, `getDynamicSheet`, and `appendDynamicRow` in [Code.gs](file:///d:/test/apps-script/Code.gs).
  * Exposed these methods in [proxyService.js](file:///d:/test/src/services/proxyService.js).
  * Refactored `writeToDynamicSheet` and `readDynamicSheet` in [consciousnessEngine.js](file:///d:/test/src/services/consciousnessEngine.js) to sync columns and rows directly with Google Sheets.
  * Updated [DynamicSection.jsx](file:///d:/test/src/pages/DynamicSection.jsx) to load from real Sheets tabs.

### 3. Persistent AI Memory & Context
* **Goal**: Let the AI Logger and Finance Chat retain memory facts about user preferences and career profile.
* **Action**:
  * Created `extractProfileFact` in [aiService.js](file:///d:/test/src/services/aiService.js) to run Gemini fact extraction in the background.
  * Wired background extraction in [AIChat.jsx](file:///d:/test/src/pages/AIChat.jsx) and [AILogger.jsx](file:///d:/test/src/pages/AILogger.jsx).
  * Injected the compiled `aiMemory` log into [categoryEngine.js](file:///d:/test/src/services/categoryEngine.js) system prompts.

