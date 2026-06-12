import { findTriggeredSectionIds, SECTION_DEFINITIONS } from './consciousnessEngine';

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

test('vehicle OS row preserves expense date and calculates litres', () => {
  expect(SECTION_DEFINITIONS.vehicle.parseData({
    date: '2026-06-06',
    month: 'Jun',
    year: 2026,
    amount: 201,
    odometer: 9890,
    pricePerLitre: 114,
    note: 'Fuel refill',
    id: 'expense-1',
  })).toEqual([
    '2026-06-06', 'Jun', 2026, 201, 9890, 114, '1.76', '', 'Fuel refill', 'expense-1',
  ]);
});
