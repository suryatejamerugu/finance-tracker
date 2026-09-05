import type { CategoryStatus, Settings } from '../types';
import { formatMoney, parseAmount } from '../lib/money';
import { reorder, setMonthlyBudget, softDelete } from '../lib/store';
import { EmptyRow, Panel } from './Panel';
import { DragHandle, SortableList, SortableRow } from './dnd';

const TABS = ['This Month', 'Last Month'] as const;
type Tab = (typeof TABS)[number];

const BAR: Record<CategoryStatus['state'], string> = {
  under: 'bg-under',
  close: 'bg-brand',
  over: 'bg-over',
  unbudgeted: 'bg-faint',
};

/**
 * Notion renders these as gallery cards showing Category, Expense This Month,
 * Monthly Budget and Usage. Usage is the number that matters, so it gets a bar
 * as well as a percentage.
 */
export function CategoryGallery({
  statuses,
  settings,
  onChanged,
}: {
  statuses: CategoryStatus[];
  settings: Settings;
  onChanged: () => void;
}) {
  const { currency, locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale, showCents: false });

  async function remove(name: string, id: string) {
    if (
      !window.confirm(`Delete "${name}"? Its past expenses stay in your ledger but will show as Uncategorised.`)
    )
      return;
    await softDelete('categories', id);
    onChanged();
  }

  async function handleReorder(nextIds: string[]) {
    await reorder('categories', nextIds);
    onChanged();
  }

  const render = (tab: Tab) => {
    if (statuses.length === 0) return <EmptyRow>No categories yet.</EmptyRow>;
    const isThis = tab === 'This Month';
    const ids = statuses.map((s) => s.category.id);

    return (
      <div className="max-h-[600px] divide-y divide-rule overflow-y-auto">
        <SortableList ids={ids} onReorder={handleReorder}>
          {statuses.map((s) => {
            const spent = isThis ? s.expenseThisMonth : s.expenseLastMonth;
            const usage = isThis ? s.usage : s.usageLastMonth;
            const budget = s.category.monthlyBudget;
            const pct = budget > 0 ? Math.min(100, usage * 100) : spent > 0 ? 100 : 0;
            const state = budget > 0 ? (usage > 1 ? 'over' : usage >= 0.85 ? 'close' : 'under') : 'unbudgeted';

            return (
              <SortableRow key={s.category.id} id={s.category.id}>
                {(handle) => (
                  <div className="group bg-raised px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <DragHandle {...handle} />
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: s.category.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-[13.5px]">{s.category.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`num text-[12px] ${state === 'over' ? 'text-over' : 'text-faint'}`}
                        >
                          {budget > 0 ? `${Math.round(usage * 100)}%` : 'no budget'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void remove(s.category.name, s.category.id)}
                          aria-label={`Delete ${s.category.name}`}
                          className="text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                        >
                          ×
                        </button>
                      </span>
                    </div>

                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-rule">
                      <div
                        className={`h-full rounded-full ${BAR[state]}`}
                        style={{ width: `${pct}%`, transition: 'width 380ms cubic-bezier(.2,.7,.3,1)' }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="num text-[12px] text-muted">{money(spent)}</span>
                      {isThis ? (
                        <input
                          defaultValue={budget > 0 ? (budget / 100).toFixed(0) : ''}
                          onBlur={async (e) => {
                            await setMonthlyBudget(s.category.id, parseAmount(e.target.value) ?? 0);
                            onChanged();
                          }}
                          inputMode="decimal"
                          placeholder="budget"
                          aria-label={`Monthly budget for ${s.category.name}`}
                          className="num w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-[12px] text-faint outline-none hover:border-rule focus:border-brand focus:text-ink"
                        />
                      ) : (
                        <span className="num text-[12px] text-faint">of {money(budget)}</span>
                      )}
                    </div>
                  </div>
                )}
              </SortableRow>
            );
          })}
        </SortableList>
      </div>
    );
  };

  return (
    <Panel title="Budget" tabs={TABS}>
      {render}
    </Panel>
  );
}
