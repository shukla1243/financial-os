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
// AI provider keys must be entered per session or supplied by a server-side gateway.
export const GEMINI_KEY = 'server-managed';

// ─── APP META ─────────────────────────────────────────────────────────────────
export const APP_VERSION = '4.0.0';
export const APP_NAME = 'Financial OS';
export const BACKEND_API_VERSION = 3;
