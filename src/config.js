/**
 * FINANCIAL OS — App Configuration
 * ==================================
 * ADMIN-ONLY: These values are baked into the build.
 * Users never see or edit these. Change them here and rebuild.
 *
 * To update:
 *   1. Edit the values below
 *   2. Run: npm run build
 *   3. Redeploy the built app
 */

// ─── BACKEND PROXY ───────────────────────────────────────────────────────────
// Your Google Apps Script Web App URL.
// Deploy as: Execute as → Me | Who has access → Anyone (not "with Google Account")
export const PROXY_URL = process.env.REACT_APP_PROXY_URL;

// ─── AI (OPENROUTER) ─────────────────────────────────────────────────────────
// Your OpenRouter API key (supports free models like gemini-2.5-flash-lite:free).
// Get a free key at: https://openrouter.ai/keys
export const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;

// ─── APP META ─────────────────────────────────────────────────────────────────
export const APP_VERSION = '4.0.0';
export const APP_NAME = 'Financial OS';
