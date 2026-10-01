import { useState } from 'react';
import type { Account, Category, IncomeCategory, RecurringEntry, Settings } from '../types';
import type { UpcomingBill } from '../lib/selectors';
import { formatMoney, HIDDEN_AMOUNT, shortDate } from '../lib/money';
import { logRecurringEntry, reorder, softDelete } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { EmptyRow } from './Panel';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditIcon } from './icons';
import { RecurringEntryModal } from './RecurringEntryModal';

const STATUS_CLASS: Record<UpcomingBill['status'], string> = {
  overdue: 'text-over',
  'due today': 'text-amber',
  upcoming: 'text-faint',
};

type SortMode = 'due' | 'custom';
const SORT_MODE_KEY = 'ft.billsSortMode';

/**
 * Recurring entries' projected "what's due" view — never posts anything on
 * its own. Each row is a template's computed due date for the current
 * period; "Log it" is the one and only path from here to a real
 * transaction, and it's an explicit click every time. See RecurringEntry's
 * doc comment in types.ts.
 *
 * Sorted by due date by default; "Custom order" is an explicit opt-in mode
 * that unlocks drag-to-reorder and persists it (see reorder('recurringEntries', …)
 * in store.ts) — the two modes stay distinct rather than silently switching
 * to a custom order the moment someone drags a row, which would be
 * surprising the next time a bill becomes overdue and doesn't jump to the
 * top of the list.
 */
export function UpcomingBills({
  bills,
  categories,
  accounts,
  incomeCategories,
  settings,
  onChanged,
  compact,
  hideBalances,
}: {
  bills: UpcomingBill[];
  categories: Category[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  settings: Settings;
  onChanged: () => void;
  /** Dashboard card: a shorter internal scroll height. Omit for a taller, full-page view. */
  compact?: boolean;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RecurringEntry | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(
    () => (localStorage.getItem(SORT_MODE_KEY) as SortMode | null) ?? 'due',
  );

  function setMode(mode: SortMode) {
    setSortMode(mode);
    localStorage.setItem(SORT_MODE_KEY, mode);
  }

  async function logIt(bill: UpcomingBill) {
    await logRecurringEntry(bill.entry, bill.dueDate);
    onChanged();
  }

  async function remove(name: string, id: string) {
    if (
      !window.confirm(`Delete "${name}"? Any transactions already logged from it stay in your ledger as-is.`)
    )
      return;
    await softDelete('recurringEntries', id);
    onChanged();
  }

  async function handleReorder(nextIds: string[]) {
    await reorder('recurringEntries', nextIds);
    onChanged();
  }

  const shown =
    sortMode === 'custom' ? [...bills].sort((a, b) => a.entry.order - b.entry.order) : bills;

  const Row = (bill: UpcomingBill, handle: Parameters<typeof DragHandle>[0] | null) => {
    const { entry } = bill;
    const money = (c: number) =>
      formatMoney(c, { currency: accounts.find((a) => a.id === entry.accountId)?.currency ?? settings.currency, locale });
    return (
      <div className="group flex items-center gap-3 px-3.5 py-2.5">
        {handle && <DragHandle {...handle} />}
        <IconBadge icon={iconFor(entry.icon)} color={entry.color} size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px]">{entry.name}</div>
          <div className={`truncate text-[11.5px] ${STATUS_CLASS[bill.status]}`}>
            {bill.status === 'upcoming' ? `Due ${shortDate(bill.dueDate, locale)}` : bill.status}
          </div>
        </div>
        <span className={`num shrink-0 text-[13.5px] ${entry.type === 'income' ? 'text-under' : ''}`}>
          {hideBalances ? HIDDEN_AMOUNT : money(entry.amount)}
        </span>
        <button
          type="button"
          onClick={() => void logIt(bill)}
          className="press shrink-0 rounded-md border border-rule px-2 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
        >
          Log it
        </button>
        <button
          type="button"
          onClick={() => setEditing(entry)}
          aria-label={`Edit ${entry.name}`}
          className="shrink-0 p-2 -m-2 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          onClick={() => void remove(entry.name, entry.id)}
          aria-label={`Delete ${entry.name}`}
          className="shrink-0 p-2 -m-2 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <>
      <section className="mb-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <h2 className="text-[15px] font-medium">Upcoming bills</h2>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-rule">
              {(['due', 'custom'] as const).map((mode, i) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMode(mode)}
                  aria-current={sortMode === mode ? 'true' : undefined}
                  title={mode === 'due' ? 'Sort by due date' : 'Drag rows below to set your own order'}
                  className={`px-2 py-1 text-[11.5px] font-medium transition-colors ${i > 0 ? 'border-l border-rule' : ''} ${
                    sortMode === mode ? 'bg-brand text-paper' : 'bg-raised text-faint hover:text-muted'
                  }`}
                >
                  {mode === 'due' ? 'Due date' : 'Custom order'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCreating(true)} className="py-1 -my-1 text-[12.5px] text-muted hover:text-brand">
              New recurring entry
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {bills.length === 0 ? (
            <EmptyRow>Nothing due right now. Set up a recurring bill or income above.</EmptyRow>
          ) : (
            <div className={`${compact ? 'max-h-[220px]' : 'max-h-[480px]'} divide-y divide-rule overflow-y-auto`}>
              {sortMode === 'custom' ? (
                <SortableList ids={shown.map((b) => b.entry.id)} onReorder={handleReorder}>
                  {shown.map((bill) => (
                    <SortableRow key={bill.entry.id} id={bill.entry.id}>
                      {(handle) => Row(bill, handle)}
                    </SortableRow>
                  ))}
                </SortableList>
              ) : (
                shown.map((bill) => <div key={bill.entry.id}>{Row(bill, null)}</div>)
              )}
            </div>
          )}
        </div>
      </section>

      {creating && (
        <RecurringEntryModal
          editing={null}
          existingCount={bills.length}
          categories={categories}
          accounts={accounts}
          incomeCategories={incomeCategories}
          onChanged={onChanged}
          onClose={() => setCreating(false)}
        />
      )}

      {editing && (
        <RecurringEntryModal
          editing={editing}
          existingCount={bills.length}
          categories={categories}
          accounts={accounts}
          incomeCategories={incomeCategories}
          onChanged={onChanged}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
