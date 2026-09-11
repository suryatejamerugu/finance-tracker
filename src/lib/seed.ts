import { db, DEFAULT_SETTINGS, LEGACY_SOURCE_COLORS } from './db';
import { uid } from './money';
import { guessDefaultCurrency } from './currency';
import { guessIncomeIcon } from './iconGuess';
import { DEFAULT_INCOME_CATEGORIES } from '../types';
import type { Account, AccountType, Category, IncomeCategory } from '../types';

/** [name, monthly budget in dollars, swatch, icon] */
const CATEGORIES: Array<[string, number, string, string]> = [
  ['Bills/Utilities', 0, '#3B37C4', 'receipt'],
  ['Subscriptions', 0, '#6E63D8', 'repeat'],
  ['Groceries', 300, '#2F7A55', 'cart'],
  ['Transportation/Fuel', 0, '#4C8FB5', 'car'],
  ['Health & Self Care', 100, '#B5734C', 'heart-pulse'],
  ['Dining Out/Coffee', 0, '#C0654B', 'coffee'],
  ['Entertainment/Shopping', 0, '#9B5FA8', 'film'],
  ['Emergency Fund', 0, '#5E8C6A', 'shield-alert'],
  ['Travel Fund', 0, '#7FA8C4', 'plane'],
  ['Investment', 0, '#4F6D8C', 'trending-up'],
  ['Education/Learning', 0, '#8A8F98', 'graduation-cap'],
];

/** [name, initial amount in dollars, swatch, type] */
const ACCOUNTS: Array<[string, number, string, AccountType]> = [
  ['Checking', 0, '#3B37C4', 'checking'],
  ['Savings', 0, '#2F7A55', 'savings'],
  ['Credit Card', 0, '#C0654B', 'credit_card'],
];

export async function seedIfEmpty(): Promise<void> {
  // A transaction, not a bare check-then-write: React StrictMode (and a fast
  // double-click of "reload") invokes this twice concurrently in dev, and
  // two un-serialized calls both see an empty table and both seed, doubling
  // every row. Dexie serializes transactions that touch the same tables, so
  // the second call's count() only runs after the first has committed.
  await db.transaction('rw', db.categories, db.accounts, db.incomeCategories, db.settings, async () => {
    if ((await db.categories.count()) > 0 || (await db.accounts.count()) > 0) return;

    const now = Date.now();
    // Guessed from the browser's locale, not asked — a brand-new install from
    // India should see INR from the first screen, not have to go find the
    // setting and change it away from a hardcoded USD.
    const currency = guessDefaultCurrency();
    const categories: Category[] = CATEGORIES.map(([name, budget, color, icon], order) => ({
      id: uid(),
      name,
      budgets: budget > 0 ? { [currency]: Math.round(budget * 100) } : {},
      icon,
      color,
      order,
      updatedAt: now,
      deleted: false,
    }));
    const accounts: Account[] = ACCOUNTS.map(([name, initial, color, type], order) => ({
      id: uid(),
      name,
      initialAmount: Math.round(initial * 100),
      currency,
      type,
      creditLimit: null,
      statementDay: null,
      paymentDueDay: null,
      color,
      order,
      updatedAt: now,
      deleted: false,
    }));
    const incomeCategories: IncomeCategory[] = DEFAULT_INCOME_CATEGORIES.map((name, order) => ({
      id: uid(),
      name,
      icon: guessIncomeIcon(name),
      color: LEGACY_SOURCE_COLORS[name] ?? '#9A9DA3',
      order,
      updatedAt: now,
      deleted: false,
    }));

    await db.categories.bulkPut(categories);
    await db.accounts.bulkPut(accounts);
    await db.incomeCategories.bulkPut(incomeCategories);
    await db.settings.put({ ...DEFAULT_SETTINGS, currency, updatedAt: now });
  });
}
