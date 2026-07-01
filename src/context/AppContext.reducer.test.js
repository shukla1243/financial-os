import { reducer, createDefaultState } from './AppContext';

function staleMonthLabel() {
  const realMonth = new Date().toLocaleString('default', { month: 'short' });
  return realMonth === 'Jan' ? 'Dec' : 'Jan';
}

test('SWITCH_USER refreshes activeMonth/activeYear instead of restoring a stale cached value', () => {
  const state = createDefaultState();
  const cached = {
    config: {
      name: 'Alex',
      salary: 5000,
      activeMonth: staleMonthLabel(),
      activeYear: new Date().getFullYear() - 1,
      budgets: { Groceries: 400 },
    },
  };

  const next = reducer(state, {
    type: 'SWITCH_USER',
    payload: { user: { email: 'alex@example.com' }, cached, allowInit: true },
  });

  expect(next.config.activeMonth).toBe(new Date().toLocaleString('default', { month: 'short' }));
  expect(next.config.activeYear).toBe(new Date().getFullYear());
  // Unrelated cached config must still survive the restore.
  expect(next.config.name).toBe('Alex');
  expect(next.config.budgets).toEqual({ Groceries: 400 });
});

test('LOAD_FROM_PROXY refreshes activeMonth/activeYear instead of trusting the backend-stored value', () => {
  const state = createDefaultState();

  const next = reducer(state, {
    type: 'LOAD_FROM_PROXY',
    payload: {
      config: {
        // Simulates the Config sheet's ActiveMonth/ActiveYear, written once
        // at signup and never updated by the backend afterwards.
        activeMonth: staleMonthLabel(),
        activeYear: new Date().getFullYear() - 1,
        name: 'Alex',
        budgets: { Groceries: 400 },
      },
    },
  });

  expect(next.config.activeMonth).toBe(new Date().toLocaleString('default', { month: 'short' }));
  expect(next.config.activeYear).toBe(new Date().getFullYear());
  // Unrelated synced config must still survive.
  expect(next.config.name).toBe('Alex');
  expect(next.config.budgets).toEqual({ Groceries: 400 });
});
