const STORAGE_PREFIX = 'financialos:';
const OLD_USER_STATE_PREFIX = 'financial_os_user_';
const LEGACY_KEYS = [
  'financial-os-v4',
  'financial-os-oauth-token',
  'financial-os-registry-sheet-id',
];

export function getStableUserId(user) {
  return user?.sub || '';
}

export function getUserStateKey(userOrId) {
  const userId = typeof userOrId === 'string' ? userOrId : getStableUserId(userOrId);
  return userId ? `${STORAGE_PREFIX}${userId}:state` : '';
}

export function readUserState(userOrId) {
  const key = getUserStateKey(userOrId);
  if (!key) return null;
  try {
    let value = localStorage.getItem(key);
    if (!value) {
      const userId = typeof userOrId === 'string' ? userOrId : getStableUserId(userOrId);
      value = localStorage.getItem(`${OLD_USER_STATE_PREFIX}${userId}`);
      if (value) {
        localStorage.setItem(key, value);
        localStorage.removeItem(`${OLD_USER_STATE_PREFIX}${userId}`);
      }
    }
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
  return userId ? `${STORAGE_PREFIX}${userId}:theme` : '';
}

export function getOnboardingDraftKey(userOrId) {
  const userId = typeof userOrId === 'string' ? userOrId : getStableUserId(userOrId);
  return userId ? `${STORAGE_PREFIX}${userId}:onboarding-draft` : '';
}

export function readOnboardingDraft(userOrId) {
  const key = getOnboardingDraftKey(userOrId);
  if (!key) return null;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
}

export function writeOnboardingDraft(userOrId, value) {
  const key = getOnboardingDraftKey(userOrId);
  if (key) localStorage.setItem(key, JSON.stringify(value));
}

export function clearOnboardingDraft(userOrId) {
  const key = getOnboardingDraftKey(userOrId);
  if (key) localStorage.removeItem(key);
}

export function clearLegacyStorage() {
  LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
}
