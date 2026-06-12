import { calculateGoalSavings, calculateNetWorth } from './netWorth';

test('goal savings are included in net worth', () => {
  const savings = calculateGoalSavings([{ saved: 1000 }, { saved: 2500 }]);
  expect(calculateNetWorth({ cashBuffer: 500, savings, investments: 4000, crypto: 1000 })).toBe(9000);
});

test('invalid goal balances do not corrupt net worth', () => {
  expect(calculateGoalSavings([{ saved: '500' }, { saved: undefined }, { saved: 'bad' }])).toBe(500);
});
