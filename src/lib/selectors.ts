import type {
  Account,
  AccountStatus,
  Category,
  CategoryStatus,
  Cents,
  Expense,
  Income,
  ISOMonth,
  Transfer,
} from '../types';
import { monthOf, shiftMonth } from './money';

export const live = <T extends { deleted: boolean }>(rows: T[]): T[] => rows.filter((r) => !r.deleted);

export function inMonth<T extends { date: string }>(rows: T[], month: ISOMonth): T[] {
  return rows.filter((r) => monthOf(r.date) === month);
}

function sum<T>(rows: T[], pick: (row: T) => Cents): Cents {
  return rows.reduce((total, row) => total + pick(row), 0);
}

/* ------------------------------- Categories ------------------------------- */

export function categoryState(budget: Cents, spent: Cents): CategoryStatus['state'] {
  if (budget <= 0) return spent > 0 ? 'unbudgeted' : 'under';
  const ratio = spent / budget;
  if (ratio > 1) return 'over';
  if (ratio >= 0.85) return 'close';
  return 'under';
}

/**
 * Notion equivalents:
 *   Expense This Month = rollup(sum) over related Expenses filtered to the month
 *   Usage              = Expense This Month / Monthly Budget
 */
export function buildCategoryStatuses(
  categories: Category[],
  expenses: Expense[],
  month: ISOMonth,
): CategoryStatus[] {
  const prev = shiftMonth(month, -1);
  const rows = live(expenses);

  const thisMonth = new Map<string, Cents>();
  const lastMonth = new Map<string, Cents>();
  for (const e of rows) {
    if (!e.categoryId) continue;
    const m = monthOf(e.date);
    const bucket = m === month ? thisMonth : m === prev ? lastMonth : null;
    if (!bucket) continue;
    bucket.set(e.categoryId, (bucket.get(e.categoryId) ?? 0) + e.amount);
  }

  return live(categories)
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const spent = thisMonth.get(category.id) ?? 0;
      const spentPrev = lastMonth.get(category.id) ?? 0;
      const budget = category.monthlyBudget;
      return {
        category,
        expenseThisMonth: spent,
        expenseLastMonth: spentPrev,
        usage: budget > 0 ? spent / budget : 0,
        usageLastMonth: budget > 0 ? spentPrev / budget : 0,
        state: categoryState(budget, spent),
      };
    });
}

/* -------------------------------- Accounts -------------------------------- */

/**
 * Notion's Balance formula, resolved:
 *   Initial Amount + Total income − Total Expenses + Total TransferIn − Total TransferOut
 *
 * Note this is a lifetime balance, not a monthly one — it deliberately ignores
 * the selected month, exactly as the Notion rollups do.
 */
export function buildAccountStatuses(
  accounts: Account[],
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
): AccountStatus[] {
  const liveExpenses = live(expenses);
  const liveIncomes = live(incomes);
  const liveTransfers = live(transfers);

  return live(accounts)
    .sort((a, b) => a.order - b.order)
    .map((account) => {
      const totalIncome = sum(
        liveIncomes.filter((i) => i.accountId === account.id),
        (i) => i.amount,
      );
      const totalExpenses = sum(
        liveExpenses.filter((e) => e.accountId === account.id),
        (e) => e.amount,
      );
      const transferIn = sum(
        liveTransfers.filter((t) => t.toAccountId === account.id),
        (t) => t.amount,
      );
      const transferOut = sum(
        liveTransfers.filter((t) => t.fromAccountId === account.id),
        (t) => t.amount,
      );
      return {
        account,
        totalIncome,
        totalExpenses,
        transferIn,
        transferOut,
        balance:
          account.initialAmount + totalIncome - totalExpenses + transferIn - transferOut,
      };
    });
}

/* --------------------------------- Totals --------------------------------- */

export interface MonthSummary {
  income: Cents;
  spent: Cents;
  budgeted: Cents;
  /** budgeted − spent */
  left: Cents;
  /** income − spent */
  net: Cents;
  overspent: number;
  unbudgeted: number;
}

export function monthSummary(
  statuses: CategoryStatus[],
  expenses: Expense[],
  incomes: Income[],
  month: ISOMonth,
): MonthSummary {
  const spent = sum(inMonth(live(expenses), month), (e) => e.amount);
  const income = sum(inMonth(live(incomes), month), (i) => i.amount);
  const budgeted = sum(statuses, (s) => s.category.monthlyBudget);
  return {
    income,
    spent,
    budgeted,
    left: budgeted - spent,
    net: income - spent,
    overspent: statuses.filter((s) => s.state === 'over').length,
    unbudgeted: statuses.filter((s) => s.state === 'unbudgeted').length,
  };
}

/* --------------------------------- Charts --------------------------------- */

/**
 * Stacked column data: one row per month, one numeric key per series.
 * Notion's Expenses "Chart" tab stacks Amount by Category over 12 months;
 * the Incomes chart stacks by Source. Same shape, different key function.
 */
export function stackedByMonth<T extends { date: string; amount: Cents; deleted: boolean }>(
  rows: T[],
  endMonth: ISOMonth,
  months: number,
  seriesKey: (row: T) => string | null,
): { data: Array<Record<string, string | number>>; series: string[] } {
  const wanted: ISOMonth[] = [];
  for (let i = months - 1; i >= 0; i--) wanted.push(shiftMonth(endMonth, -i));
  const index = new Map(wanted.map((m, i) => [m, i]));

  const data: Array<Record<string, string | number>> = wanted.map((month) => ({ month }));
  const series = new Set<string>();

  for (const row of live(rows)) {
    const slot = index.get(monthOf(row.date));
    if (slot === undefined) continue;
    const key = seriesKey(row) ?? 'Uncategorised';
    series.add(key);
    const bucket = data[slot];
    bucket[key] = ((bucket[key] as number) ?? 0) + row.amount / 100;
  }

  // Recharts renders a gap rather than zero for a missing key.
  const names = [...series].sort();
  for (const bucket of data) for (const name of names) if (!(name in bucket)) bucket[name] = 0;

  return { data, series: names };
}

/** Donut slices: this month's expenses grouped by category, largest first. */
export function donutByCategory(
  categories: Category[],
  expenses: Expense[],
  month: ISOMonth,
): Array<{ name: string; value: number; color: string }> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, Cents>();
  for (const e of inMonth(live(expenses), month)) {
    const key = e.categoryId ?? 'none';
    totals.set(key, (totals.get(key) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .map(([id, cents]) => ({
      name: byId.get(id)?.name ?? 'Uncategorised',
      value: cents / 100,
      color: byId.get(id)?.color ?? '#9A9DA3',
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Group rows into buckets keyed by day, month, or year, newest bucket first. */
export function groupByPeriod<T extends { date: string }>(
  rows: T[],
  period: 'day' | 'month' | 'year',
): Array<[string, T[]]> {
  const width = period === 'day' ? 10 : period === 'month' ? 7 : 4;
  const buckets = new Map<string, T[]>();
  for (const row of [...rows].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = row.date.slice(0, width);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  return [...buckets.entries()];
}
