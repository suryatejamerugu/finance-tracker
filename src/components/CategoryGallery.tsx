import type { CategoryStatus, Settings } from '../types';
import { formatMoney, parseAmount } from '../lib/money';
import { setMonthlyBudget } from '../lib/store';
import { EmptyRow, Panel } from './Panel';

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

  const render = (tab: Tab) => {
    if (statuses.length === 0) return <EmptyRow>No categories yet.</EmptyRow>;
    const isThis = tab === 'This Month';

    return (
      <div className="divide-y divide-rule">
        {statuses.map((s) => {
          const spent = isThis ? s.expenseThisMonth : s.expenseLastMonth;
          const usage = isThis ? s.usage : s.usageLastMonth;
          const budget = s.category.monthlyBudget;
          const pct = budget > 0 ? Math.min(100, usage * 100) : spent > 0 ? 100 : 0;
          const state = budget > 0 ? (usage > 1 ? 'over' : usage >= 0.85 ? 'close' : 'under') : 'unbudgeted';

          return (
            <div key={s.category.id} className="px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13.5px]">{s.category.name}</span>
                <span
                  className={`num shrink-0 text-[12px] ${
                    state === 'over' ? 'text-over' : 'text-faint'
                  }`}
                >
                  {budget > 0 ? `${Math.round(usage * 100)}%` : 'no budget'}
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
          );
        })}
      </div>
    );
  };

  return (
    <Panel title="Budget" tabs={TABS}>
      {render}
    </Panel>
  );
}
