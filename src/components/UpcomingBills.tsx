import { useState } from 'react';
import type { Account, Category, IncomeCategory, RecurringEntry, Settings } from '../types';
import type { UpcomingBill } from '../lib/selectors';
import { formatMoney, HIDDEN_AMOUNT, shortDate } from '../lib/money';
import { logRecurringEntry, softDelete } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { EmptyRow } from './Panel';
import { EditIcon } from './icons';
import { RecurringEntryModal } from './RecurringEntryModal';

const STATUS_CLASS: Record<UpcomingBill['status'], string> = {
  overdue: 'text-over',
  'due today': 'text-amber',
  upcoming: 'text-faint',
};

/**
 * Recurring entries' projected "what's due" view — never posts anything on
 * its own. Each row is a template's computed due date for the current
 * period; "Log it" is the one and only path from here to a real
 * transaction, and it's an explicit click every time. See RecurringEntry's
 * doc comment in types.ts.
 */
export function UpcomingBills({
  bills,
  categories,
  accounts,
  incomeCategories,
  settings,
  onChanged,
  hideBalances,
}: {
  bills: UpcomingBill[];
  categories: Category[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  settings: Settings;
  onChanged: () => void;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RecurringEntry | null>(null);

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

  return (
    <>
      <section className="mb-7">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium">Upcoming bills</h2>
          <button type="button" onClick={() => setCreating(true)} className="text-[12.5px] text-muted hover:text-brand">
            New recurring entry
          </button>
        </div>

        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {bills.length === 0 ? (
            <EmptyRow>Nothing due right now. Set up a recurring bill or income above.</EmptyRow>
          ) : (
            <div className="divide-y divide-rule">
              {bills.map((bill) => {
                const { entry } = bill;
                const money = (c: number) =>
                  formatMoney(c, { currency: accounts.find((a) => a.id === entry.accountId)?.currency ?? settings.currency, locale });
                return (
                  <div key={entry.id} className="group flex items-center gap-3 px-3.5 py-2.5">
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
                      className="shrink-0 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(entry.name, entry.id)}
                      aria-label={`Delete ${entry.name}`}
                      className="shrink-0 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
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
