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

/**
 * A bounded list rather than free text, so the account gallery can show a
 * matching icon without guessing. NRO/NRE are Indian non-resident account
 * types — distinct from a plain savings account, and specific enough that a
 * generic "bank account" type wouldn't do them justice.
 */
export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'nro',
  'nre',
  'loan',
  'investment',
  'cash',
  'other',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Notion: Accounts. Title property is "Account". */
export interface Account extends Synced {
  name: string;
  /**
   * For every type except credit_card: the starting balance, positive.
   * For credit_card: negative when there was already a balance owed when you
   * started tracking it — the same sign convention the Balance formula uses
   * for all ongoing spending, so nothing special is needed to make a credit
   * card's balance read as "owed" once real transactions exist.
   */
  initialAmount: Cents;
  /** ISO 4217 code (USD, INR, ...). Fixed once the account has any transaction. */
  currency: string;
  type: AccountType;
  /** credit_card only, all nullable/unset until the user configures them. */
  creditLimit: Cents | null;
  /** Day of month (1-31) the statement generates. Clamped to the real last day of a shorter month. */
  statementDay: number | null;
  /** Day of month (1-31) payment is due, relative to the statement date. */
  paymentDueDay: number | null;
  color: string;
  order: number;
}

/**
 * Notion: Categories. Title property is "Category". Budget is keyed by
 * currency rather than a single number, since the same category (e.g.
 * "Dining Out") can be used for expenses in more than one currency and a
 * budget only means something within one currency at a time. `icon` is a key
 * into the curated icon set in lib/icons.tsx, not the icon itself.
 */
export interface Category extends Synced {
  name: string;
  budgets: Record<string, Cents>;
  icon: string;
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

/** Seed list only — income categories are a real, user-editable table (below), same as Categories. */
export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Money Transfer',
  'Debt Repayment',
  'Credit Rewards',
  'Return / Refund Credits',
  'Dividend',
  'Credit Limit Increased',
  'Splitwise',
] as const;

/** Notion: Income Sources. Like Categories, but for income — no budget field. */
export interface IncomeCategory extends Synced {
  name: string;
  icon: string;
  color: string;
  order: number;
}

export interface Income extends Synced {
  name: string;
  amount: Cents;
  date: ISODate;
  accountId: string | null;
  sourceId: string | null;
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

export const SCHEMA_VERSION = 6;

export interface Snapshot {
  schemaVersion: number;
  exportedAt: number;
  accounts: Account[];
  categories: Category[];
  incomeCategories: IncomeCategory[];
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
