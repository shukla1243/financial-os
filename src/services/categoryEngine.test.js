import {
  checkCategoryExists,
  inferCanonicalCategory,
  parseExpensesForNewCategories,
} from './categoryEngine';

test('infers Food from a tiffin expense', () => {
  expect(inferCanonicalCategory({
    description: 'Paid 120 for tiffin',
    category: 'Tiffin',
  })).toBe('Food');
});

test('reuses the existing Food category for a tiffin expense', () => {
  const result = parseExpensesForNewCategories([
    { description: 'Tiffin', amount: 120, category: 'Other' },
  ], { Food: 3000 });

  expect(result.regular).toEqual([
    { description: 'Tiffin', amount: 120, category: 'Food' },
  ]);
  expect(result.newCategoryExpenses).toEqual([]);
});

test('proposes Food when a tiffin expense has no existing category', () => {
  const result = parseExpensesForNewCategories([
    { description: 'Office tiffin', amount: 120, category: 'Tiffin' },
  ], {});

  expect(result.regular).toEqual([]);
  expect(result.newCategoryExpenses[0]).toMatchObject({
    category: 'Food',
    suggestedCategoryName: 'Food',
  });
});

test('uses transaction context instead of an overly specific AI category', () => {
  expect(inferCanonicalCategory({
    description: 'Petrol at fuel station',
    category: 'Fuel Station',
  })).toBe('Transport');
});

test('preserves a reusable unknown category as a new proposal', () => {
  const result = parseExpensesForNewCategories([
    { description: 'Dog food', amount: 500, category: 'NEW:Pet Care' },
  ], {});

  expect(result.newCategoryExpenses[0]).toMatchObject({
    category: 'Pet Care',
    suggestedCategoryName: 'Pet Care',
  });
});

test('category existence checks are case insensitive', () => {
  expect(checkCategoryExists('food', { Food: 3000 })).toEqual({
    known: true,
    normalizedCategory: 'Food',
  });
});
