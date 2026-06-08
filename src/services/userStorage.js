const USER_STATE_PREFIX = 'financial_os_user_';
const THEME_PREFIX = 'financial_os_theme_';
const LEGACY_KEYS = [
  'financial-os-v4',
  'financial-os-oauth-token',
  'financial-os-registry-sheet-id',
];

export function getStableUserId(user) {
  return user?.sub || user?.userId || '';
}

export function getUserStateKey(userOrId) {
  const userId = typeof userOrId === 'string' ? userOrId : getStableUserId(userOrId);
  return userId ? `${USER_STATE_PREFIX}${userId}` : '';
}

export function readUserState(userOrId) {
  const key = getUserStateKey(userOrId);
  if (!key) return null;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn('Could not read user-scoped state.', error);
    return null;
  }
}

export function writeUserState(userOrId, value) {
  const key = getUserStateKey(userOrId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function clearUserState(userOrId) {
  const key = getUserStateKey(userOrId);
  if (key) localStorage.removeItem(key);
}

export function getThemeKey(userOrId) {
  const userId = typeof userOrId === 'string' ? userOrId : getStableUserId(userOrId);
  return userId ? `${THEME_PREFIX}${userId}` : '';
}

export function clearLegacyStorage() {
  LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
}
