import type { Account, Category, Cents, Expense, Income, ISODate, Transfer } from '../types';
import { live } from './selectors';

/**
 * The unified, chronological view across Expenses/Incomes/Transfers —
 * the "full history" a Notion database view gives you, that the three
 * separate ledger panels don't. Amount is signed: expenses negative,
 * everything else positive.
 */
export type LedgerEntryType = 'expense' | 'income' | 'transfer';

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  date: ISODate;
  name: string;
  amount: Cents;
  /** Category name for an expense, Source for an income, null for a transfer. */
  detail: string | null;
  /** Account name, or "From → To" for a transfer. */
  account: string | null;
  note: string;
}

export function buildLedger(
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
  categories: Category[],
  accounts: Account[],
): LedgerEntry[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));

  const expenseRows: LedgerEntry[] = live(expenses).map((e) => ({
    id: e.id,
    type: 'expense',
    date: e.date,
    name: e.name,
    amount: -e.amount,
    detail: catName.get(e.categoryId ?? '') ?? 'Uncategorised',
    account: acctName.get(e.accountId ?? '') ?? null,
    note: e.text,
  }));

  const incomeRows: LedgerEntry[] = live(incomes).map((i) => ({
    id: i.id,
    type: 'income',
    date: i.date,
    name: i.name,
    amount: i.amount,
    detail: i.source,
    account: acctName.get(i.accountId ?? '') ?? null,
    note: '',
  }));

  const transferRows: LedgerEntry[] = live(transfers).map((t) => ({
    id: t.id,
    type: 'transfer',
    date: t.date,
    name: t.name,
    amount: t.amount,
    detail: null,
    account: `${acctName.get(t.fromAccountId ?? '') ?? '—'} → ${acctName.get(t.toAccountId ?? '') ?? '—'}`,
    note: '',
  }));

  return [...expenseRows, ...incomeRows, ...transferRows].sort((a, b) => b.date.localeCompare(a.date));
}
