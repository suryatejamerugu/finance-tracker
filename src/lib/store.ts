import { db } from './db';
import { uid } from './money';
import type { Account, AccountType, Category, Cents, Expense, Income, IncomeCategory, ISODate, Transfer } from '../types';

/**
 * Every mutation goes through here so `updatedAt` is always stamped and deletes
 * are always soft. A raw db.table.put() elsewhere would break the Drive merge.
 */

const stamp = () => ({ updatedAt: Date.now(), deleted: false });

export async function addExpense(input: {
  name: string;
  amount: Cents;
  date: ISODate;
  categoryId: string | null;
  accountId: string | null;
  text?: string;
}): Promise<void> {
  await db.expenses.put({
    id: uid(),
    name: input.name.trim() || 'Expense',
    amount: Math.abs(input.amount),
    date: input.date,
    categoryId: input.categoryId,
    accountId: input.accountId,
    text: input.text?.trim() ?? '',
    ...stamp(),
  });
}

export async function updateExpense(
  id: string,
  input: {
    name: string;
    amount: Cents;
    date: ISODate;
    categoryId: string | null;
    accountId: string | null;
    text?: string;
  },
): Promise<void> {
  const existing = await db.expenses.get(id);
  if (!existing) return;
  await db.expenses.put({
    ...existing,
    name: input.name.trim() || existing.name,
    amount: Math.abs(input.amount),
    date: input.date,
    categoryId: input.categoryId,
    accountId: input.accountId,
    text: input.text?.trim() ?? '',
    updatedAt: Date.now(),
  });
}

export async function addIncome(input: {
  name: string;
  amount: Cents;
  date: ISODate;
  accountId: string | null;
  sourceId: string | null;
}): Promise<void> {
  await db.incomes.put({
    id: uid(),
    name: input.name.trim() || 'Income',
    amount: Math.abs(input.amount),
    date: input.date,
    accountId: input.accountId,
    sourceId: input.sourceId,
    ...stamp(),
  });
}

export async function updateIncome(
  id: string,
  input: { name: string; amount: Cents; date: ISODate; accountId: string | null; sourceId: string | null },
): Promise<void> {
  const existing = await db.incomes.get(id);
  if (!existing) return;
  await db.incomes.put({
    ...existing,
    name: input.name.trim() || existing.name,
    amount: Math.abs(input.amount),
    date: input.date,
    accountId: input.accountId,
    sourceId: input.sourceId,
    updatedAt: Date.now(),
  });
}

/** Both accounts a transfer touches must share a currency — there's no exchange rate to apply otherwise. */
async function sameCurrency(fromAccountId: string | null, toAccountId: string | null): Promise<boolean> {
  if (!fromAccountId || !toAccountId) return true;
  const [from, to] = await Promise.all([db.accounts.get(fromAccountId), db.accounts.get(toAccountId)]);
  if (!from || !to) return true;
  return from.currency === to.currency;
}

export async function addTransfer(input: {
  name: string;
  amount: Cents;
  date: ISODate;
  fromAccountId: string | null;
  toAccountId: string | null;
}): Promise<void> {
  if (!(await sameCurrency(input.fromAccountId, input.toAccountId))) {
    throw new Error('Transfers need both accounts in the same currency.');
  }
  await db.transfers.put({
    id: uid(),
    name: input.name.trim() || 'Transfer',
    amount: Math.abs(input.amount),
    date: input.date,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    ...stamp(),
  });
}

export async function updateTransfer(
  id: string,
  input: { name: string; amount: Cents; date: ISODate; fromAccountId: string | null; toAccountId: string | null },
): Promise<void> {
  const existing = await db.transfers.get(id);
  if (!existing) return;
  if (!(await sameCurrency(input.fromAccountId, input.toAccountId))) {
    throw new Error('Transfers need both accounts in the same currency.');
  }
  await db.transfers.put({
    ...existing,
    name: input.name.trim() || existing.name,
    amount: Math.abs(input.amount),
    date: input.date,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    updatedAt: Date.now(),
  });
}

export async function addCategory(input: {
  name: string;
  budget: Cents;
  color: string;
  currency: string;
  icon: string;
}): Promise<void> {
  const order = await db.categories.count();
  await db.categories.put({
    id: uid(),
    name: input.name.trim(),
    budgets: input.budget > 0 ? { [input.currency]: Math.max(0, input.budget) } : {},
    icon: input.icon,
    color: input.color,
    order,
    ...stamp(),
  });
}

export async function addAccount(input: {
  name: string;
  initialAmount: Cents;
  color: string;
  currency: string;
  type: AccountType;
}): Promise<void> {
  const order = await db.accounts.count();
  await db.accounts.put({
    id: uid(),
    name: input.name.trim(),
    initialAmount: input.initialAmount,
    currency: input.currency,
    type: input.type,
    creditLimit: null,
    statementDay: null,
    paymentDueDay: null,
    color: input.color,
    order,
    ...stamp(),
  });
}

export async function addIncomeCategory(input: { name: string; color: string; icon: string }): Promise<IncomeCategory> {
  const order = await db.incomeCategories.count();
  const row: IncomeCategory = {
    id: uid(),
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    order,
    ...stamp(),
  };
  await db.incomeCategories.put(row);
  return row;
}

export async function setCategoryBudget(categoryId: string, currency: string, budget: Cents): Promise<void> {
  const existing = await db.categories.get(categoryId);
  if (!existing) return;
  const budgets = { ...existing.budgets };
  if (budget > 0) budgets[currency] = budget;
  else delete budgets[currency];
  await db.categories.put({ ...existing, budgets, updatedAt: Date.now() });
}

export async function updateCategory(
  id: string,
  input: { name: string; color: string; icon?: string },
): Promise<void> {
  const existing = await db.categories.get(id);
  if (!existing) return;
  await db.categories.put({
    ...existing,
    name: input.name.trim() || existing.name,
    color: input.color,
    icon: input.icon || existing.icon,
    updatedAt: Date.now(),
  });
}

export async function updateAccount(
  id: string,
  input: {
    name: string;
    color: string;
    currency?: string;
    type?: AccountType;
    initialAmount?: Cents;
    creditLimit?: Cents | null;
    statementDay?: number | null;
    paymentDueDay?: number | null;
  },
): Promise<void> {
  const existing = await db.accounts.get(id);
  if (!existing) return;
  await db.accounts.put({
    ...existing,
    name: input.name.trim() || existing.name,
    color: input.color,
    currency: input.currency || existing.currency,
    type: input.type || existing.type,
    initialAmount: input.initialAmount ?? existing.initialAmount,
    creditLimit: input.creditLimit !== undefined ? input.creditLimit : existing.creditLimit,
    statementDay: input.statementDay !== undefined ? input.statementDay : existing.statementDay,
    paymentDueDay: input.paymentDueDay !== undefined ? input.paymentDueDay : existing.paymentDueDay,
    updatedAt: Date.now(),
  });
}

export async function updateIncomeCategory(
  id: string,
  input: { name: string; color: string; icon?: string },
): Promise<void> {
  const existing = await db.incomeCategories.get(id);
  if (!existing) return;
  await db.incomeCategories.put({
    ...existing,
    name: input.name.trim() || existing.name,
    color: input.color,
    icon: input.icon || existing.icon,
    updatedAt: Date.now(),
  });
}

type Soft = 'expenses' | 'incomes' | 'transfers' | 'categories' | 'accounts' | 'incomeCategories';

export async function softDelete(table: Soft, id: string): Promise<void> {
  const existing = await (db[table] as unknown as {
    get: (id: string) => Promise<Expense | Income | Transfer | Category | Account | IncomeCategory | undefined>;
  }).get(id);
  if (!existing) return;
  await (db[table] as unknown as { put: (row: unknown) => Promise<unknown> }).put({
    ...existing,
    deleted: true,
    updatedAt: Date.now(),
  });
}

type Orderable = 'categories' | 'accounts' | 'incomeCategories';

/** Persists a drag-and-drop reorder: `orderedIds` is the full list, top to bottom. */
export async function reorder(table: Orderable, orderedIds: string[]): Promise<void> {
  const coll = db[table] as unknown as {
    get: (id: string) => Promise<(Category | Account | IncomeCategory) | undefined>;
    put: (row: unknown) => Promise<unknown>;
  };
  const now = Date.now();
  for (let i = 0; i < orderedIds.length; i++) {
    const existing = await coll.get(orderedIds[i]);
    if (!existing) continue;
    await coll.put({ ...existing, order: i, updatedAt: now });
  }
}
