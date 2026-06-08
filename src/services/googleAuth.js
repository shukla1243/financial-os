/**
 * Google OAuth Service — Phase 4
 * Full user identity + token management
 */

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = 'email profile';
const TOKEN_KEY = 'financial_os_oauth_session';

let tokenClient = null;
let currentToken = (() => {
  try {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.expires_at > Date.now()) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
})();
let currentUser = null; // { email, name, picture }

export function loadGoogleAuth() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Auth'));
    document.head.appendChild(script);
  });
}

export async function initTokenClient() {
  if (!CLIENT_ID) throw new Error('Google OAuth client ID is not configured.');
  await loadGoogleAuth();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: () => {},
  });
}

export function getAccessToken(forcePrompt = false) {
  return new Promise(async (resolve, reject) => {
    if (!tokenClient) await initTokenClient();
    if (!forcePrompt && currentToken && currentToken.expires_at > Date.now()) {
      resolve(currentToken.access_token);
      return;
    }
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      currentToken = {
        access_token: response.access_token,
        expires_at: Date.now() + (response.expires_in * 1000) - 60000,
      };
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(currentToken));
      resolve(response.access_token);
    };
    if (forcePrompt) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken();
    }
  });
}

// Get user info from Google
export async function getUserInfo() {
  if (currentUser) return currentUser;
  try {
    const token = await getAccessToken();
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.id || !data.email || data.verified_email === false) return null;
    currentUser = { sub: data.id, userId: data.id, email: data.email, name: data.name || '', picture: data.picture || '' };
    return currentUser;
  } catch (e) { return null; }
}

export function getCurrentUser() { return currentUser; }

export function revokeToken() {
  if (currentToken?.access_token) {
    try {
      window.google?.accounts.oauth2.revoke(currentToken.access_token);
    } catch (e) {}
  }
  currentToken = null;
  currentUser = null;
  sessionStorage.removeItem(TOKEN_KEY);
}


export function isAuthenticated() {
  return !!(currentToken && currentToken.expires_at > Date.now());
}
