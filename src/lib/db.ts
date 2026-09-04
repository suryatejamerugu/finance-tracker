import Dexie, { type EntityTable } from 'dexie';
import {
  SCHEMA_VERSION,
  type Account,
  type Category,
  type Expense,
  type Income,
  type Settings,
  type Snapshot,
  type Transfer,
} from '../types';

class LedgerDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
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
  const [accounts, categories, expenses, incomes, transfers, settings] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
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

const TABLES = ['accounts', 'categories', 'expenses', 'incomes', 'transfers', 'settings'] as const;

export async function mergeSnapshot(remote: Snapshot): Promise<void> {
  if (remote.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This backup was written by a newer version of the app. Update before syncing so nothing is lost.',
    );
  }
  const local = await buildSnapshot();

  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await db.accounts.bulkPut(mergeRows(local.accounts, remote.accounts ?? []));
    await db.categories.bulkPut(mergeRows(local.categories, remote.categories ?? []));
    await db.expenses.bulkPut(mergeRows(local.expenses, remote.expenses ?? []));
    await db.incomes.bulkPut(mergeRows(local.incomes, remote.incomes ?? []));
    await db.transfers.bulkPut(mergeRows(local.transfers, remote.transfers ?? []));
    if (remote.settings && remote.settings.updatedAt > local.settings.updatedAt) {
      await db.settings.put(remote.settings);
    }
  });
}

/** Replace local data outright. Used by file import, where the user chose to. */
export async function replaceWithSnapshot(snap: Snapshot): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
    await db.accounts.bulkPut(snap.accounts ?? []);
    await db.categories.bulkPut(snap.categories ?? []);
    await db.expenses.bulkPut(snap.expenses ?? []);
    await db.incomes.bulkPut(snap.incomes ?? []);
    await db.transfers.bulkPut(snap.transfers ?? []);
    await db.settings.put(snap.settings ?? DEFAULT_SETTINGS);
  });
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Snapshot>;
  return typeof v.schemaVersion === 'number' && Array.isArray(v.expenses);
}
