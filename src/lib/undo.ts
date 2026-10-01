import { db } from './db';
import type {
  Account,
  Category,
  Expense,
  Income,
  IncomeCategory,
  RecurringEntry,
  SavingsGoal,
  Transfer,
} from '../types';

export type Soft =
  | 'expenses'
  | 'incomes'
  | 'transfers'
  | 'categories'
  | 'accounts'
  | 'incomeCategories'
  | 'savingsGoals'
  | 'recurringEntries';
type Row = Expense | Income | Transfer | Category | Account | IncomeCategory | SavingsGoal | RecurringEntry;

const TABLE_LABEL: Record<Soft, string> = {
  expenses: 'expense',
  incomes: 'income',
  transfers: 'transfer',
  categories: 'category',
  accounts: 'account',
  incomeCategories: 'income source',
  savingsGoals: 'savings goal',
  recurringEntries: 'recurring entry',
};

export interface UndoState {
  table: Soft;
  id: string;
  previous: Row;
  label: string;
}

const DURATION_MS = 8000;

let state: UndoState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

/**
 * Every edit and delete in store.ts calls this with the row exactly as it
 * stood a moment before — one slot, not a history, since the toast that
 * surfaces it only stays up for a few seconds and a second mutation replaces
 * whatever was pending rather than stacking.
 */
export function recordUndo(table: Soft, id: string, previous: Row, action: 'edit' | 'delete'): void {
  const name = (previous as { name?: string }).name || 'item';
  const label = `${action === 'delete' ? 'Deleted' : 'Edited'} ${TABLE_LABEL[table]} "${name}"`;
  state = { table, id, previous, label };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    state = null;
    notify();
  }, DURATION_MS);
  notify();
}

export function subscribeUndo(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUndoState(): UndoState | null {
  return state;
}

/**
 * Puts the previous row back exactly as it was, except for `updatedAt` —
 * that gets a fresh timestamp, because the undo is itself a new edit for
 * Drive-sync purposes, not a time-travelling rewrite of the old one.
 */
export async function performUndo(): Promise<void> {
  if (!state) return;
  const { table, previous } = state;
  if (timer) clearTimeout(timer);
  timer = null;
  state = null;
  await (db[table] as unknown as { put: (row: unknown) => Promise<unknown> }).put({
    ...previous,
    updatedAt: Date.now(),
  });
  notify();
}

export function dismissUndo(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  state = null;
  notify();
}
