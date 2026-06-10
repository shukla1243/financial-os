import { getOutboxKey, queueSyncOperation, readSyncOutbox } from './syncOutbox';

beforeEach(() => localStorage.clear());

test('stores failed writes in a user-scoped durable outbox', () => {
  queueSyncOperation('user-a', 'expense', { id: 'expense-1', amount: 429 });
  expect(getOutboxKey('user-a')).toBe('financialos:user-a:sync-outbox');
  expect(readSyncOutbox('user-a')).toHaveLength(1);
  expect(readSyncOutbox('user-b')).toEqual([]);
});

test('deduplicates the same queued operation ID', () => {
  queueSyncOperation('user-a', 'expense', { id: 'expense-1', amount: 100 });
  queueSyncOperation('user-a', 'expense', { id: 'expense-1', amount: 429 });
  expect(readSyncOutbox('user-a')).toHaveLength(1);
  expect(readSyncOutbox('user-a')[0].payload.amount).toBe(429);
});

test('keeps only the latest full replacement write', () => {
  queueSyncOperation('user-a', 'goals', [{ id: 'goal-1' }]);
  queueSyncOperation('user-a', 'goals', [{ id: 'goal-2' }]);
  expect(readSyncOutbox('user-a')).toHaveLength(1);
  expect(readSyncOutbox('user-a')[0]).toMatchObject({
    id: 'goals:latest',
    payload: [{ id: 'goal-2' }],
  });
});
