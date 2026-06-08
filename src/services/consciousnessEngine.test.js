import { findTriggeredSectionIds } from './consciousnessEngine';

test('vehicle expenses trigger Vehicle OS', () => {
  expect(findTriggeredSectionIds([
    { description: 'Bike service', category: 'Transport', note: '' },
  ])).toContain('vehicle');
});

test('petrol expenses trigger Vehicle OS even with a broad category', () => {
  expect(findTriggeredSectionIds([
    { description: 'Petrol refill', category: 'Transport', note: '' },
  ])).toContain('vehicle');
});

test('existing sections are not rebuilt', () => {
  expect(findTriggeredSectionIds([
    { description: 'Petrol refill', category: 'Transport', note: '' },
  ], ['vehicle'])).not.toContain('vehicle');
});

test('unsupported trigger definitions do not create broken sections', () => {
  expect(findTriggeredSectionIds([
    { description: 'Read a book', category: 'Education', note: '' },
  ])).not.toContain('reading');
});
