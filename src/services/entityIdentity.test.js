import { findByEntityId, sameEntityId } from './entityIdentity';

test('matches equivalent string and numeric IDs', () => {
  expect(sameEntityId(1780928711337, '1780928711337')).toBe(true);
  expect(findByEntityId([{ id: 1780928711337, name: 'Meeting Sneha' }], '1780928711337')?.name).toBe('Meeting Sneha');
});

test('does not match missing or different IDs', () => {
  expect(sameEntityId(undefined, undefined)).toBe(false);
  expect(sameEntityId(1, 2)).toBe(false);
});
