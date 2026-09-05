import { addExpense, addIncome, addTransfer } from './store';
import { currentMonth, shiftMonth } from './money';
import type { Account, Category } from '../types';

function byName<T extends { name: string; id: string }>(rows: T[], name: string): string | null {
  return rows.find((r) => r.name === name)?.id ?? rows[0]?.id ?? null;
}

function dateInMonth(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`;
}

/**
 * A few months of plausible activity, built from whichever categories and
 * accounts already exist (the starter set, unless renamed or deleted) — so a
 * brand-new install has something in the budgets, charts and full history
 * before a single real transaction exists. Falls back to the first available
 * category/account when a starter name isn't found, rather than failing.
 */
export async function loadDemoData(categories: Category[], accounts: Account[]): Promise<void> {
  const cat = (name: string) => byName(categories, name);
  const acct = (name: string) => byName(accounts, name);

  const checking = acct('Checking');
  const savings = acct('Savings');
  const creditCard = acct('Credit Card');

  const months = [shiftMonth(currentMonth(), -2), shiftMonth(currentMonth(), -1), currentMonth()];

  for (const month of months) {
    await addIncome({
      name: 'Paycheck',
      amount: 320000,
      date: dateInMonth(month, 1),
      accountId: checking,
      source: 'Salary',
    });
    await addExpense({
      name: 'Rent',
      amount: 120000,
      date: dateInMonth(month, 2),
      categoryId: cat('Bills/Utilities'),
      accountId: checking,
    });
    await addExpense({
      name: 'Weekly grocery run',
      amount: 8600,
      date: dateInMonth(month, 5),
      categoryId: cat('Groceries'),
      accountId: checking,
      text: "Trader Joe's",
    });
    await addExpense({
      name: 'Weekly grocery run',
      amount: 7400,
      date: dateInMonth(month, 19),
      categoryId: cat('Groceries'),
      accountId: checking,
    });
    await addExpense({
      name: 'Gas',
      amount: 4200,
      date: dateInMonth(month, 8),
      categoryId: cat('Transportation/Fuel'),
      accountId: creditCard,
    });
    await addExpense({
      name: 'Coffee',
      amount: 650,
      date: dateInMonth(month, 10),
      categoryId: cat('Dining Out/Coffee'),
      accountId: creditCard,
    });
    await addExpense({
      name: 'Dinner out',
      amount: 5400,
      date: dateInMonth(month, 15),
      categoryId: cat('Dining Out/Coffee'),
      accountId: creditCard,
    });
    await addExpense({
      name: 'Gym membership',
      amount: 3000,
      date: dateInMonth(month, 3),
      categoryId: cat('Health & Self Care'),
      accountId: checking,
    });
    await addTransfer({
      name: 'Move to savings',
      amount: 30000,
      date: dateInMonth(month, 4),
      fromAccountId: checking,
      toAccountId: savings,
    });
  }

  await addExpense({
    name: 'Concert tickets',
    amount: 9000,
    date: dateInMonth(currentMonth(), 12),
    categoryId: cat('Entertainment/Shopping'),
    accountId: creditCard,
  });
  await addIncome({
    name: 'Freelance project',
    amount: 45000,
    date: dateInMonth(currentMonth(), 20),
    accountId: checking,
    source: 'Credit Rewards',
  });
}
