import type { LucideIcon } from 'lucide-react';
import type { Account, Category, Cents, Expense, Income, IncomeCategory, ISODate, Transfer } from '../types';
import { live } from './selectors';
import { accountTypeMeta, iconFor } from './icons';

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
  /** The account's currency (a transfer's "from" side, since both sides always match), or the home currency when unlinked. */
  currency: string;
  /** Category icon for an expense, income-category icon for an income, from-account type icon for a transfer. */
  icon: LucideIcon;
  color: string;
}

export function buildLedger(
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
  categories: Category[],
  accounts: Account[],
  incomeCategories: IncomeCategory[] = [],
  homeCurrency = 'USD',
): LedgerEntry[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const acctById = new Map(accounts.map((a) => [a.id, a]));
  const sourceById = new Map(incomeCategories.map((c) => [c.id, c]));
  const sourceName = new Map(incomeCategories.map((c) => [c.id, c.name]));
  const currencyOf = (accountId: string | null) =>
    (accountId && acctById.get(accountId)?.currency) || homeCurrency;
  const FALLBACK_COLOR = '#9A9DA3';

  const expenseRows: LedgerEntry[] = live(expenses).map((e) => {
    const category = catById.get(e.categoryId ?? '');
    return {
      id: e.id,
      type: 'expense',
      date: e.date,
      name: e.name,
      amount: -e.amount,
      detail: catName.get(e.categoryId ?? '') ?? 'Uncategorised',
      account: acctName.get(e.accountId ?? '') ?? null,
      note: e.text,
      currency: currencyOf(e.accountId),
      icon: iconFor(category?.icon ?? 'tag'),
      color: category?.color ?? FALLBACK_COLOR,
    };
  });

  const incomeRows: LedgerEntry[] = live(incomes).map((i) => {
    const source = sourceById.get(i.sourceId ?? '');
    return {
      id: i.id,
      type: 'income',
      date: i.date,
      name: i.name,
      amount: i.amount,
      detail: sourceName.get(i.sourceId ?? '') ?? 'Uncategorised',
      account: acctName.get(i.accountId ?? '') ?? null,
      note: '',
      currency: currencyOf(i.accountId),
      icon: iconFor(source?.icon ?? 'tag'),
      color: source?.color ?? FALLBACK_COLOR,
    };
  });

  const transferRows: LedgerEntry[] = live(transfers).map((t) => {
    const fromAccount = acctById.get(t.fromAccountId ?? '');
    return {
      id: t.id,
      type: 'transfer',
      date: t.date,
      name: t.name,
      amount: t.amount,
      detail: null,
      account: `${acctName.get(t.fromAccountId ?? '') ?? '—'} → ${acctName.get(t.toAccountId ?? '') ?? '—'}`,
      note: '',
      currency: currencyOf(t.fromAccountId),
      icon: fromAccount ? accountTypeMeta(fromAccount.type).icon : iconFor('tag'),
      color: fromAccount?.color ?? FALLBACK_COLOR,
    };
  });

  return [...expenseRows, ...incomeRows, ...transferRows].sort((a, b) => b.date.localeCompare(a.date));
}
