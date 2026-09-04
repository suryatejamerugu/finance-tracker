import { db, DEFAULT_SETTINGS } from './db';
import { uid } from './money';
import type { Account, Category } from '../types';

/** [name, monthly budget in dollars, swatch] */
const CATEGORIES: Array<[string, number, string]> = [
  ['Bills/Utilities', 0, '#3B37C4'],
  ['Subscriptions', 0, '#6E63D8'],
  ['Groceries', 300, '#2F7A55'],
  ['Transportation/Fuel', 0, '#4C8FB5'],
  ['Health & Self Care', 100, '#B5734C'],
  ['Dining Out/Coffee', 0, '#C0654B'],
  ['Entertainment/Shopping', 0, '#9B5FA8'],
  ['Emergency Fund', 0, '#5E8C6A'],
  ['Travel Fund', 0, '#7FA8C4'],
  ['Investment', 0, '#4F6D8C'],
  ['Education/Learning', 0, '#8A8F98'],
];

/** [name, initial amount in dollars, swatch] */
const ACCOUNTS: Array<[string, number, string]> = [
  ['Checking', 0, '#3B37C4'],
  ['Savings', 0, '#2F7A55'],
  ['Credit Card', 0, '#C0654B'],
];

export async function seedIfEmpty(): Promise<void> {
  if ((await db.categories.count()) > 0 || (await db.accounts.count()) > 0) return;

  const now = Date.now();
  const categories: Category[] = CATEGORIES.map(([name, budget, color], order) => ({
    id: uid(),
    name,
    monthlyBudget: Math.round(budget * 100),
    color,
    order,
    updatedAt: now,
    deleted: false,
  }));
  const accounts: Account[] = ACCOUNTS.map(([name, initial, color], order) => ({
    id: uid(),
    name,
    initialAmount: Math.round(initial * 100),
    color,
    order,
    updatedAt: now,
    deleted: false,
  }));

  await db.categories.bulkPut(categories);
  await db.accounts.bulkPut(accounts);
  await db.settings.put({ ...DEFAULT_SETTINGS, updatedAt: now });
}
