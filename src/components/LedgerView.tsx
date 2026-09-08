import { useEffect, useMemo, useState } from 'react';
import type {
  Account,
  Category,
  CategoryStatus,
  Expense,
  Income,
  IncomeCategory,
  ISOMonth,
  Settings,
  Transfer,
} from '../types';
import { buildLedger, type LedgerEntry, type LedgerEntryType } from '../lib/ledger';
import { downloadFile, ledgerToCsv } from '../lib/exportCsv';
import { exportLedgerPdf, exportMonthPdf } from '../lib/exportPdf';
import { buildCategoryStatuses, monthSummary as computeMonthSummary, type MonthSummary } from '../lib/selectors';
import { formatMoney, monthLabel, todayISO } from '../lib/money';
import { softDelete } from '../lib/store';
import { EmptyRow } from './Panel';
import { EditIcon } from './icons';
import type { AddKind, EditingRow } from './AddModal';

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
  incomeCategories,
  settings,
  month,
  categoryStatuses,
  monthSummary,
  userLabel,
  onChanged,
  onClose,
  onEdit,
}: {
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  categories: Category[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  settings: Settings;
  month: ISOMonth;
  categoryStatuses: CategoryStatus[];
  monthSummary: MonthSummary;
  userLabel: string | null;
  onChanged: () => void;
  onClose: () => void;
  onEdit: (kind: AddKind, row: EditingRow) => void;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | LedgerEntryType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [pdfMonth, setPdfMonth] = useState(month);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const all = useMemo(
    () => buildLedger(expenses, incomes, transfers, categories, accounts, incomeCategories),
    [expenses, incomes, transfers, categories, accounts, incomeCategories],
  );

  const availableMonths = useMemo(() => {
    const set = new Set(all.map((e) => e.date.slice(0, 7)));
    if (set.size === 0) set.add(month);
    return [...set].sort().reverse();
  }, [all, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (type !== 'all' && e.type !== type) return false;
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      if (!q) return true;
      return [e.name, e.detail, e.account, e.note].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [all, query, type, fromDate, toDate]);

  const shown = filtered.slice(0, visible);
  const { currency, locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale, signed: true });

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

  function exportCsv() {
    downloadFile(`finance-tracker-history-${todayISO()}.csv`, ledgerToCsv(filtered), 'text/csv;charset=utf-8');
  }

  function exportPickedMonthReport() {
    const statuses = pdfMonth === month ? categoryStatuses : buildCategoryStatuses(categories, expenses, pdfMonth);
    const summary = pdfMonth === month ? monthSummary : computeMonthSummary(statuses, expenses, incomes, pdfMonth);
    exportMonthPdf({
      month: pdfMonth,
      currency,
      locale,
      summary,
      categoryStatuses: statuses,
      entries: all.filter((e) => e.date.slice(0, 7) === pdfMonth),
      userLabel,
    });
  }

  function describeCriteria(): string | null {
    const parts: string[] = [];
    if (type !== 'all') parts.push(TYPE_LABEL[type]);
    if (query.trim()) parts.push(`search "${query.trim()}"`);
    if (fromDate || toDate) parts.push(`${fromDate || 'earliest'} → ${toDate || 'latest'}`);
    return parts.length ? parts.join(', ') : null;
  }

  function exportAllPdf() {
    const criteria = describeCriteria();
    const title = criteria ? `Finance Tracker — Full history (filtered)` : 'Finance Tracker — Full history';
    exportLedgerPdf({ title, currency, locale, entries: filtered, userLabel, criteria });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="px-1 text-[16px] text-muted hover:text-ink"
          >
            ✕
          </button>
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

        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-2.5">
          <label className="flex items-center gap-1.5 text-[12px] text-faint">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setVisible(PAGE);
              }}
              aria-label="From date"
              className="rounded-md border border-rule bg-paper px-2 py-1 text-[12.5px] outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-faint">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setVisible(PAGE);
              }}
              aria-label="To date"
              className="rounded-md border border-rule bg-paper px-2 py-1 text-[12.5px] outline-none focus:border-brand"
            />
          </label>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="text-[12px] text-faint hover:text-brand"
            >
              Clear dates
            </button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-md border border-rule px-2.5 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
            >
              Export CSV
            </button>
            <select
              value={pdfMonth}
              onChange={(e) => setPdfMonth(e.target.value)}
              aria-label="Month for PDF report"
              className="rounded-md border border-rule bg-paper px-2 py-1 text-[12px] text-muted outline-none focus:border-brand"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{monthLabel(m, locale)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportPickedMonthReport}
              title="A one-page report for the selected month: budget breakdown plus that month's transactions."
              className="rounded-md border border-rule px-2.5 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
            >
              PDF: month
            </button>
            <button
              type="button"
              onClick={exportAllPdf}
              title="Every row currently shown below (respects search, type and date filters)."
              className="rounded-md border border-rule px-2.5 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
            >
              PDF: filtered ({filtered.length})
            </button>
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
                    onClick={() => edit(e)}
                    aria-label={`Edit ${e.name}`}
                    className="shrink-0 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
                  >
                    <EditIcon />
                  </button>
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
