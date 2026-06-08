import {
  clearLegacyStorage,
  clearUserState,
  getUserStateKey,
  readUserState,
  writeUserState,
} from './userStorage';

beforeEach(() => localStorage.clear());

test('uses stable Google subject IDs for isolated cache keys', () => {
  expect(getUserStateKey({ sub: 'user-a', email: 'same@example.com' })).toBe('financialos:user-a:state');
  expect(getUserStateKey({ sub: 'user-b', email: 'same@example.com' })).toBe('financialos:user-b:state');
});

test('does not expose one user cache to another user', () => {
  writeUserState('user-a', { aiMemory: ['private-a'] });
  writeUserState('user-b', { aiMemory: ['private-b'] });

  expect(readUserState('user-a')).toEqual({ aiMemory: ['private-a'] });
  expect(readUserState('user-b')).toEqual({ aiMemory: ['private-b'] });

  clearUserState('user-a');
  expect(readUserState('user-a')).toBeNull();
  expect(readUserState('user-b')).toEqual({ aiMemory: ['private-b'] });
});

test('removes unsafe legacy shared keys', () => {
  localStorage.setItem('financial-os-v4', 'legacy');
  localStorage.setItem('financial-os-oauth-token', 'legacy');
  clearLegacyStorage();
  expect(localStorage.length).toBe(0);
});
