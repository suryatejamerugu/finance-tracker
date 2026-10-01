import { useState } from 'react';
import type { Account, Category, Expense, Income, IncomeCategory, Settings, Transfer } from '../types';
import { buildLedger, type LedgerEntry, type LedgerEntryType } from '../lib/ledger';
import { dayLabel, formatMoney, HIDDEN_AMOUNT } from '../lib/money';
import { softDelete } from '../lib/store';
import { IconBadge } from '../lib/icons';
import { EmptyRow } from './Panel';
import { EditIcon } from './icons';
import type { AddKind, EditingRow } from './AddModal';

const TABS = ['All', 'Expenses', 'Income', 'Transfers'] as const;
type Tab = (typeof TABS)[number];
const TAB_TYPE: Record<Tab, LedgerEntryType | null> = {
  All: null,
  Expenses: 'expense',
  Income: 'income',
  Transfers: 'transfer',
};
const TYPE_TABLE: Record<LedgerEntryType, 'expenses' | 'incomes' | 'transfers'> = {
  expense: 'expenses',
  income: 'incomes',
  transfer: 'transfers',
};
const TYPE_LABEL: Record<LedgerEntryType, string> = { expense: 'Expense', income: 'Income', transfer: 'Transfer' };
const TYPE_BADGE: Record<LedgerEntryType, string> = {
  expense: 'bg-over-soft text-over',
  income: 'bg-under-soft text-under',
  transfer: 'bg-brand-soft text-brand',
};

const COUNT = 14;

/**
 * One chronological, filterable feed instead of three separate stacked
 * lists (Expenses, then Incomes, then Transfers) each scrolling the page
 * further down. buildLedger() already merges all three into one shape with
 * the right icon/color per row, so this is mostly a type filter + a shared
 * row renderer on top of it. "View all" hands off to Full History, which
 * already covers everything the old Weekly/Monthly tabs did and more
 * (search, date range, export) — so that browsing capability moved there
 * rather than being duplicated here.
 */
export function RecentActivity({
  expenses,
  incomes,
  transfers,
  categories,
  accounts,
  incomeCategories,
  currency,
  homeCurrency,
  settings,
  onChanged,
  onEdit,
  onViewAll,
  hideBalances,
}: {
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  categories: Category[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  /** The dashboard's current currency lens. */
  currency: string;
  homeCurrency: string;
  settings: Settings;
  onChanged: () => void;
  onEdit: (kind: AddKind, row: EditingRow) => void;
  onViewAll: () => void;
  hideBalances?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('All');
  const { locale } = settings;

  const all = buildLedger(expenses, incomes, transfers, categories, accounts, incomeCategories, homeCurrency).filter(
    (e) => e.currency === currency,
  );
  const wantType = TAB_TYPE[tab];
  const rows = (wantType ? all.filter((e) => e.type === wantType) : all).slice(0, COUNT);

  function rawRow(entry: LedgerEntry): EditingRow | undefined {
    if (entry.type === 'expense') return expenses.find((e) => e.id === entry.id);
    if (entry.type === 'income') return incomes.find((i) => i.id === entry.id);
    return transfers.find((t) => t.id === entry.id);
  }

  function edit(entry: LedgerEntry) {
    const row = rawRow(entry);
    if (row) onEdit(entry.type, row);
  }

  async function remove(entry: LedgerEntry) {
    if (!window.confirm(`Delete "${entry.name}"?`)) return;
    await softDelete(TYPE_TABLE[entry.type], entry.id);
    onChanged();
  }

  return (
    <section className="mb-7">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-medium">Recent activity</h2>
        <div className="flex overflow-hidden rounded-lg border border-rule">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'true' : undefined}
              className={`px-2.5 py-1 text-[12px] font-medium transition-colors ${i > 0 ? 'border-l border-rule' : ''} ${
                tab === t ? 'bg-brand text-paper' : 'bg-raised text-faint hover:text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="ml-auto py-1 -my-1 text-[12.5px] text-muted hover:text-brand"
        >
          View all transactions
        </button>
      </div>

      <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
        {rows.length === 0 ? (
          <EmptyRow>
            {tab === 'All' ? 'Nothing logged yet. Use New expense above.' : `No ${tab.toLowerCase()} logged yet.`}
          </EmptyRow>
        ) : (
          <div className="divide-y divide-rule">
            {rows.map((e) => (
              <div key={`${e.type}-${e.id}`} className="group flex items-center gap-3 px-4 py-2.5">
                <IconBadge icon={e.icon} color={e.color} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px]">{e.name}</span>
                    {tab === 'All' && (
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[e.type]}`}>
                        {TYPE_LABEL[e.type]}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[12px] text-faint">
                    {[dayLabel(e.date, locale), e.detail, e.account].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span
                  className={`num shrink-0 text-[14px] ${
                    e.amount < 0 ? 'text-over' : e.type === 'income' ? 'text-under' : ''
                  }`}
                >
                  {hideBalances ? HIDDEN_AMOUNT : formatMoney(e.amount, { currency: e.currency, locale, signed: true })}
                </span>
                <button
                  type="button"
                  onClick={() => edit(e)}
                  aria-label={`Edit ${e.name}`}
                  className="shrink-0 p-2 -m-2 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(e)}
                  aria-label={`Delete ${e.name}`}
                  className="shrink-0 p-2 -m-2 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
