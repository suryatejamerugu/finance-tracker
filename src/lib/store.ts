import { db } from './db';
import { uid } from './money';
import type { Account, Category, Cents, Expense, Income, IncomeSource, ISODate, Transfer } from '../types';

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

export async function addIncome(input: {
  name: string;
  amount: Cents;
  date: ISODate;
  accountId: string | null;
  source: IncomeSource | null;
}): Promise<void> {
  await db.incomes.put({
    id: uid(),
    name: input.name.trim() || 'Income',
    amount: Math.abs(input.amount),
    date: input.date,
    accountId: input.accountId,
    source: input.source,
    ...stamp(),
  });
}

export async function addTransfer(input: {
  name: string;
  amount: Cents;
  date: ISODate;
  fromAccountId: string | null;
  toAccountId: string | null;
}): Promise<void> {
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

export async function addCategory(name: string, monthlyBudget: Cents, color: string): Promise<void> {
  const order = await db.categories.count();
  await db.categories.put({
    id: uid(),
    name: name.trim(),
    monthlyBudget: Math.max(0, monthlyBudget),
    color,
    order,
    ...stamp(),
  });
}

export async function addAccount(name: string, initialAmount: Cents, color: string): Promise<void> {
  const order = await db.accounts.count();
  await db.accounts.put({
    id: uid(),
    name: name.trim(),
    initialAmount,
    color,
    order,
    ...stamp(),
  });
}

export async function setMonthlyBudget(categoryId: string, budget: Cents): Promise<void> {
  const existing = await db.categories.get(categoryId);
  if (!existing) return;
  await db.categories.put({
    ...existing,
    monthlyBudget: Math.max(0, budget),
    updatedAt: Date.now(),
  });
}

export async function setInitialAmount(accountId: string, amount: Cents): Promise<void> {
  const existing = await db.accounts.get(accountId);
  if (!existing) return;
  await db.accounts.put({ ...existing, initialAmount: amount, updatedAt: Date.now() });
}

type Soft = 'expenses' | 'incomes' | 'transfers' | 'categories' | 'accounts';

export async function softDelete(table: Soft, id: string): Promise<void> {
  const existing = await (db[table] as unknown as {
    get: (id: string) => Promise<Expense | Income | Transfer | Category | Account | undefined>;
  }).get(id);
  if (!existing) return;
  await (db[table] as unknown as { put: (row: unknown) => Promise<unknown> }).put({
    ...existing,
    deleted: true,
    updatedAt: Date.now(),
  });
}

type Orderable = 'categories' | 'accounts';

/** Persists a drag-and-drop reorder: `orderedIds` is the full list, top to bottom. */
export async function reorder(table: Orderable, orderedIds: string[]): Promise<void> {
  const coll = db[table] as unknown as {
    get: (id: string) => Promise<(Category | Account) | undefined>;
    put: (row: unknown) => Promise<unknown>;
  };
  const now = Date.now();
  for (let i = 0; i < orderedIds.length; i++) {
    const existing = await coll.get(orderedIds[i]);
    if (!existing) continue;
    await coll.put({ ...existing, order: i, updatedAt: now });
  }
}
