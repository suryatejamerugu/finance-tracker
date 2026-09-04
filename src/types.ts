/**
 * The data model, mirroring the five databases in the Notion Finance Tracker.
 *
 * The structural point the first version of this app got wrong: Expenses,
 * Incomes and Transfers are three separate tables, not one signed-amount table.
 * Every Amount here is POSITIVE. Direction is carried by which table a row
 * lives in, exactly as Notion does it. Collapsing them loses Source on income
 * and the two-sided account link on transfers.
 *
 * Money is stored as integer cents. Notion stores dollars as floats; we convert
 * at the boundary, because 0.1 + 0.2 !== 0.3 and a budget app cannot afford it.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISOMonth = string; // 'YYYY-MM'
export type Cents = number;

/** Fields every row carries so two devices can merge without clobbering. */
interface Synced {
  id: string;
  updatedAt: number;
  deleted: boolean;
}

/** Notion: Accounts. Title property is "Account". */
export interface Account extends Synced {
  name: string;
  initialAmount: Cents;
  color: string;
  order: number;
}

/** Notion: Categories. Title property is "Category". */
export interface Category extends Synced {
  name: string;
  monthlyBudget: Cents;
  color: string;
  order: number;
}

/** Notion: Expenses. Title "Expense", plus the free-text "Text" field. */
export interface Expense extends Synced {
  name: string;
  amount: Cents;
  date: ISODate;
  accountId: string | null;
  categoryId: string | null;
  text: string;
}

/** Notion: Incomes. Source is a select with this exact option list. */
export const INCOME_SOURCES = [
  'Salary',
  'Money Transfer',
  'Debt Repayment',
  'Credit Rewards',
  'Return / Refund Credits',
  'Dividend',
  'Credit Limit Increased',
  'Splitwise',
] as const;

export type IncomeSource = (typeof INCOME_SOURCES)[number];

export interface Income extends Synced {
  name: string;
  amount: Cents;
  date: ISODate;
  accountId: string | null;
  source: IncomeSource | null;
}

/** Notion: Transfers. Title property is "Transactions". */
export interface Transfer extends Synced {
  name: string;
  amount: Cents;
  date: ISODate;
  fromAccountId: string | null;
  toAccountId: string | null;
}

export interface Settings {
  id: 'settings';
  currency: string;
  locale: string;
  updatedAt: number;
}

export const SCHEMA_VERSION = 2;

export interface Snapshot {
  schemaVersion: number;
  exportedAt: number;
  accounts: Account[];
  categories: Category[];
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  settings: Settings;
}

/* ---- Derived values: computed fresh, never stored, same as Notion rollups ---- */

/** A Categories row as it appears on the dashboard gallery card. */
export interface CategoryStatus {
  category: Category;
  /** Rollup: sum of Expenses in the selected month. */
  expenseThisMonth: Cents;
  /** Formula: sum of Expenses in the month before it. */
  expenseLastMonth: Cents;
  /** Formula: Expense This Month / Monthly Budget. */
  usage: number;
  usageLastMonth: number;
  state: 'unbudgeted' | 'under' | 'close' | 'over';
}

/** An Accounts row with the Balance formula resolved. */
export interface AccountStatus {
  account: Account;
  totalIncome: Cents;
  totalExpenses: Cents;
  transferIn: Cents;
  transferOut: Cents;
  /** Initial + income − expenses + transferIn − transferOut. */
  balance: Cents;
}
