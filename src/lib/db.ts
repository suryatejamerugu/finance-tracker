import Dexie, { type EntityTable } from 'dexie';
import {
  DEFAULT_INCOME_CATEGORIES,
  SCHEMA_VERSION,
  type Account,
  type Category,
  type Expense,
  type Income,
  type IncomeCategory,
  type Settings,
  type Snapshot,
  type Transfer,
} from '../types';
import { uid } from './money';
import { suggestedColor } from './colors';

/**
 * Colors income categories had *before* they were a real table — a hardcoded
 * map in IncomesPanel keyed by the fixed source name. Used once, during the
 * v3 migration, so nothing changes color the first time someone opens the
 * upgraded app. Any name outside this list (there shouldn't be any, since the
 * old UI only ever wrote these eight) falls back to the palette.
 */
export const LEGACY_SOURCE_COLORS: Record<string, string> = {
  Salary: '#2F7A55',
  'Money Transfer': '#4C8FB5',
  'Debt Repayment': '#3B37C4',
  'Credit Rewards': '#9B5FA8',
  'Return / Refund Credits': '#B5734C',
  Dividend: '#5E8C6A',
  'Credit Limit Increased': '#7FA8C4',
  Splitwise: '#8A6A4F',
};

class LedgerDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  incomeCategories!: EntityTable<IncomeCategory, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  incomes!: EntityTable<Income, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('ledgerlight');
    // v1 used a single signed `transactions` table. v2 splits it to match
    // Notion. The old store is dropped rather than migrated: it never shipped.
    this.version(2)
      .stores({
        accounts: 'id, order',
        categories: 'id, order',
        expenses: 'id, date, categoryId, accountId',
        incomes: 'id, date, accountId, source',
        transfers: 'id, date, fromAccountId, toAccountId',
        settings: 'id',
        transactions: null,
        budgets: null,
        goals: null,
      })
      .upgrade(async (tx) => {
        await tx.table('settings').clear();
      });

    // v3: income "source" (a hardcoded 8-value union) becomes a real,
    // user-editable table — Income Categories — the same shape as expense
    // Categories minus the budget field. Every existing income row's source
    // string is matched to a newly seeded category of the same name, so
    // nothing already logged loses its source or its color.
    this.version(3)
      .stores({
        incomeCategories: 'id, order',
        incomes: 'id, date, accountId, sourceId',
      })
      .upgrade(async (tx) => {
        const now = Date.now();
        const names = new Set<string>();
        await tx
          .table('incomes')
          .toCollection()
          .each((row: { source?: string | null }) => {
            if (row.source) names.add(row.source);
          });
        for (const name of DEFAULT_INCOME_CATEGORIES) names.add(name);

        const idByName = new Map<string, string>();
        const categories: IncomeCategory[] = [...names].map((name, order) => {
          const id = uid();
          idByName.set(name, id);
          return {
            id,
            name,
            color: LEGACY_SOURCE_COLORS[name] ?? suggestedColor(order),
            order,
            updatedAt: now,
            deleted: false,
          };
        });
        await tx.table('incomeCategories').bulkAdd(categories);

        await tx
          .table('incomes')
          .toCollection()
          .modify((row: { source?: string | null; sourceId?: string | null }) => {
            row.sourceId = row.source ? (idByName.get(row.source) ?? null) : null;
            delete row.source;
          });
      });
  }
}

export const db = new LedgerDB();

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  currency: 'USD',
  locale: 'en-US',
  updatedAt: 0,
};

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
}

export async function buildSnapshot(): Promise<Snapshot> {
  const [accounts, categories, incomeCategories, expenses, incomes, transfers, settings] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.incomeCategories.toArray(),
    db.expenses.toArray(),
    db.incomes.toArray(),
    db.transfers.toArray(),
    getSettings(),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    accounts,
    categories,
    incomeCategories,
    expenses,
    incomes,
    transfers,
    settings,
  };
}

type Versioned = { id: string; updatedAt: number };

/**
 * Last-write-wins per row, not per file.
 *
 * The naive Drive sync overwrites the whole blob, so logging lunch on your
 * phone while the laptop tab is open loses one of them. Merging row by row
 * means the loser of a conflict is one edited field, not a day of entries.
 */
function mergeRows<T extends Versioned>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const existing = byId.get(row.id);
    if (!existing || row.updatedAt > existing.updatedAt) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/**
 * A snapshot written by a pre-v3 build (an older Drive backup, or a backup
 * file saved before this update) still has `income.source` strings instead
 * of `sourceId`. Rather than trust it blindly and silently lose every
 * income's category, resolve each legacy name against the categories already
 * known locally — creating one only if genuinely nothing matches — before
 * it's merged or restored. Rows already in the new shape pass through as-is.
 */
function normalizeIncomes(
  incomes: unknown[],
  localCategories: IncomeCategory[],
): { incomes: Income[]; newCategories: IncomeCategory[] } {
  const byName = new Map(localCategories.map((c) => [c.name.toLowerCase(), c.id]));
  const newCategories: IncomeCategory[] = [];
  const now = Date.now();
  let order = localCategories.length;

  const resolved = (incomes as Array<Income & { source?: string | null }>).map((row) => {
    if (row.sourceId !== undefined) return row as Income;
    const { source, ...rest } = row;
    let sourceId: string | null = null;
    if (source) {
      const key = source.toLowerCase();
      sourceId = byName.get(key) ?? null;
      if (!sourceId) {
        sourceId = uid();
        byName.set(key, sourceId);
        newCategories.push({
          id: sourceId,
          name: source,
          color: LEGACY_SOURCE_COLORS[source] ?? suggestedColor(order),
          order: order++,
          updatedAt: now,
          deleted: false,
        });
      }
    }
    return { ...rest, sourceId } as Income;
  });

  return { incomes: resolved, newCategories };
}

const TABLES = ['accounts', 'categories', 'incomeCategories', 'expenses', 'incomes', 'transfers', 'settings'] as const;

export async function mergeSnapshot(remote: Snapshot): Promise<void> {
  if (remote.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This backup was written by a newer version of the app. Update before syncing so nothing is lost.',
    );
  }
  const local = await buildSnapshot();
  const { incomes: remoteIncomes, newCategories } = normalizeIncomes(remote.incomes ?? [], local.incomeCategories);

  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await db.accounts.bulkPut(mergeRows(local.accounts, remote.accounts ?? []));
    await db.categories.bulkPut(mergeRows(local.categories, remote.categories ?? []));
    await db.incomeCategories.bulkPut(
      mergeRows([...local.incomeCategories, ...newCategories], remote.incomeCategories ?? []),
    );
    await db.expenses.bulkPut(mergeRows(local.expenses, remote.expenses ?? []));
    await db.incomes.bulkPut(mergeRows(local.incomes, remoteIncomes));
    await db.transfers.bulkPut(mergeRows(local.transfers, remote.transfers ?? []));
    if (remote.settings && remote.settings.updatedAt > local.settings.updatedAt) {
      await db.settings.put(remote.settings);
    }
  });
}

/** Replace local data outright. Used by file import, where the user chose to. */
export async function replaceWithSnapshot(snap: Snapshot): Promise<void> {
  const { incomes, newCategories } = normalizeIncomes(snap.incomes ?? [], snap.incomeCategories ?? []);
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
    await db.accounts.bulkPut(snap.accounts ?? []);
    await db.categories.bulkPut(snap.categories ?? []);
    await db.incomeCategories.bulkPut([...(snap.incomeCategories ?? []), ...newCategories]);
    await db.expenses.bulkPut(snap.expenses ?? []);
    await db.incomes.bulkPut(incomes);
    await db.transfers.bulkPut(snap.transfers ?? []);
    await db.settings.put(snap.settings ?? DEFAULT_SETTINGS);
  });
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Snapshot>;
  return typeof v.schemaVersion === 'number' && Array.isArray(v.expenses);
}
