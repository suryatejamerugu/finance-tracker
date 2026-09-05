import { useEffect, useMemo, useState } from 'react';
import type { Account, Category, CategoryStatus, Expense, Income, ISOMonth, Settings, Transfer } from '../types';
import { buildLedger, type LedgerEntry, type LedgerEntryType } from '../lib/ledger';
import { downloadFile, ledgerToCsv } from '../lib/exportCsv';
import { exportLedgerPdf, exportMonthPdf } from '../lib/exportPdf';
import type { MonthSummary } from '../lib/selectors';
import { formatMoney, monthLabel, todayISO } from '../lib/money';
import { softDelete } from '../lib/store';
import { EmptyRow } from './Panel';

const TYPE_LABEL: Record<LedgerEntryType, string> = { expense: 'Expense', income: 'Income', transfer: 'Transfer' };
const TYPE_TABLE: Record<LedgerEntryType, 'expenses' | 'incomes' | 'transfers'> = {
  expense: 'expenses',
  income: 'incomes',
  transfer: 'transfers',
};
const TYPE_BADGE: Record<LedgerEntryType, string> = {
  expense: 'bg-over-soft text-over',
  income: 'bg-under-soft text-under',
  transfer: 'bg-brand-soft text-brand',
};

const PAGE = 50;

/**
 * The single chronological table across all three ledgers — the "open the
 * database, see everything" view Notion gives you for free and the three
 * capped Recent/Weekly/Monthly tabs don't. Also where export lives, since
 * exporting is naturally a whole-history action.
 */
export function LedgerView({
  expenses,
  incomes,
  transfers,
  categories,
  accounts,
  settings,
  month,
  categoryStatuses,
  monthSummary,
  onChanged,
  onClose,
}: {
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  categories: Category[];
  accounts: Account[];
  settings: Settings;
  month: ISOMonth;
  categoryStatuses: CategoryStatus[];
  monthSummary: MonthSummary;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | LedgerEntryType>('all');
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const all = useMemo(
    () => buildLedger(expenses, incomes, transfers, categories, accounts),
    [expenses, incomes, transfers, categories, accounts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (type !== 'all' && e.type !== type) return false;
      if (!q) return true;
      return [e.name, e.detail, e.account, e.note].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [all, query, type]);

  const shown = filtered.slice(0, visible);
  const { currency, locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale, signed: true });

  async function remove(entry: LedgerEntry) {
    if (!window.confirm(`Delete "${entry.name}"?`)) return;
    await softDelete(TYPE_TABLE[entry.type], entry.id);
    onChanged();
  }

  function exportCsv() {
    downloadFile(`finance-tracker-history-${todayISO()}.csv`, ledgerToCsv(filtered), 'text/csv;charset=utf-8');
  }

  function exportMonthReport() {
    exportMonthPdf({
      month,
      currency,
      locale,
      summary: monthSummary,
      categoryStatuses,
      entries: all.filter((e) => e.date.slice(0, 7) === month),
    });
  }

  function exportAllPdf() {
    const title =
      type === 'all' && !query.trim()
        ? 'Finance Tracker — Full history'
        : `Finance Tracker — Full history (filtered: ${type === 'all' ? 'all types' : TYPE_LABEL[type]}${query.trim() ? `, "${query.trim()}"` : ''})`;
    exportLedgerPdf({ title, currency, locale, entries: filtered });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Full history"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92dvh] w-full max-w-3xl flex-col rounded-t-2xl bg-raised shadow-pop safe-bottom sm:h-[85dvh] sm:rounded-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-3.5">
          <h2 className="text-[15px] font-medium">Full history</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-md border border-rule px-2.5 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportMonthReport}
              title="A one-page report for the selected month: budget breakdown plus that month's transactions."
              className="rounded-md border border-rule px-2.5 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
            >
              PDF: {monthLabel(month, locale)}
            </button>
            <button
              type="button"
              onClick={exportAllPdf}
              title="Every row currently shown below (respects the search and type filter)."
              className="rounded-md border border-rule px-2.5 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
            >
              PDF: All ({filtered.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="px-1 text-[16px] text-muted hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE);
            }}
            placeholder="Search name, category, account…"
            aria-label="Search history"
            className="min-w-[10rem] flex-1 rounded-lg border border-rule bg-paper px-3 py-1.5 text-[13px] outline-none focus:border-brand"
          />
          <div className="flex gap-1">
            {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setVisible(PAGE);
                }}
                aria-current={type === t ? 'true' : undefined}
                className={`rounded-md px-2.5 py-1 text-[12px] ${
                  type === t ? 'bg-brand-soft text-brand' : 'text-faint hover:text-muted'
                }`}
              >
                {t === 'all' ? 'All' : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {shown.length === 0 ? (
            <EmptyRow>Nothing matches.</EmptyRow>
          ) : (
            <div className="divide-y divide-rule">
              {shown.map((e) => (
                <div key={`${e.type}-${e.id}`} className="group flex items-center gap-3 px-5 py-2.5">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${TYPE_BADGE[e.type]}`}
                  >
                    {TYPE_LABEL[e.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px]">{e.name}</div>
                    <div className="truncate text-[11.5px] text-faint">
                      {[e.date, e.detail, e.account, e.note].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span
                    className={`num shrink-0 text-[13.5px] ${
                      e.amount < 0 ? 'text-over' : e.type === 'income' ? 'text-under' : ''
                    }`}
                  >
                    {money(e.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(e)}
                    aria-label={`Delete ${e.name}`}
                    className="shrink-0 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-rule px-5 py-3 text-[12px] text-faint">
          <span>
            {shown.length} of {filtered.length} shown
            {filtered.length !== all.length ? ` (${all.length} total)` : ''}
          </span>
          {visible < filtered.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="rounded-md border border-rule px-2.5 py-1 text-brand hover:border-brand"
            >
              Show more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
