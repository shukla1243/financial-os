import { addCategory, deleteExpense, logExpense, logIncome, writeBills, writeGoals } from './proxyService';

const PREFIX = 'financialos:';

export function getOutboxKey(userId) {
  return userId ? `${PREFIX}${userId}:sync-outbox` : '';
}

export function readSyncOutbox(userId) {
  const key = getOutboxKey(userId);
  if (!key) return [];
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    return [];
  }
}

function writeSyncOutbox(userId, entries) {
  const key = getOutboxKey(userId);
  if (!key) return;
  if (entries.length === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(entries));
}

export function queueSyncOperation(userId, type, payload) {
  const entries = readSyncOutbox(userId);
  const stableId = type === 'goals' || type === 'bills'
    ? 'latest'
    : payload?.id || Date.now();
  const id = `${type}:${stableId}`;
  const next = entries.filter(entry => entry.id !== id);
  next.push({ id, type, payload, attempts: 0, createdAt: new Date().toISOString(), lastError: '' });
  writeSyncOutbox(userId, next);
  return next;
}

async function execute(entry, proxyUrl, email) {
  if (entry.type === 'expense') return logExpense(proxyUrl, email, entry.payload);
  if (entry.type === 'deleteExpense') return deleteExpense(proxyUrl, email, entry.payload);
  if (entry.type === 'income') return logIncome(proxyUrl, email, entry.payload);
  if (entry.type === 'goals') return writeGoals(proxyUrl, email, entry.payload);
  if (entry.type === 'bills') return writeBills(proxyUrl, email, entry.payload);
  if (entry.type === 'category') return addCategory(proxyUrl, email, entry.payload.name, entry.payload.budget);
  throw new Error(`Unsupported queued operation: ${entry.type}`);
}

export async function flushSyncOutbox(proxyUrl, email, userId) {
  const entries = readSyncOutbox(userId);
  const remaining = [];
  let synced = 0;
  for (const entry of entries) {
    try {
      await execute(entry, proxyUrl, email);
      synced++;
    } catch (error) {
      remaining.push({ ...entry, attempts: entry.attempts + 1, lastError: error.message || 'Sync failed' });
    }
  }
  writeSyncOutbox(userId, remaining);
  return { synced, remaining };
}
