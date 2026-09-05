import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AccountStatus, Settings } from '../types';
import { formatBig, formatMoney, parseAmount } from '../lib/money';
import { reorder, setInitialAmount, softDelete } from '../lib/store';
import { EmptyRow } from './Panel';
import { chartTooltip } from './chartTheme';
import { DragHandle, SortableList, SortableRow } from './dnd';

/**
 * Notion's right-column donut: this month's Expenses grouped by Category.
 * Hovering a legend row highlights its slice, and vice versa, so the chart
 * reads as one connected picture rather than two separate views of the data.
 */
export function SpendDonut({
  slices,
  total,
  settings,
}: {
  slices: Array<{ name: string; value: number; color: string }>;
  total: number;
  settings: Settings;
}) {
  const { currency, locale } = settings;
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="mb-7">
      <h2 className="mb-2 text-[15px] font-medium">This month</h2>
      <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
        {slices.length === 0 ? (
          <EmptyRow>No spending logged this month.</EmptyRow>
        ) : (
          <>
            <div className="relative">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={1}
                    stroke="none"
                    onMouseEnter={(_data, index) => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {slices.map((s, i) => (
                      <Cell
                        key={s.name}
                        fill={s.color}
                        opacity={active === null || active === i ? 1 : 0.35}
                        style={{ transition: 'opacity 150ms ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip(currency, locale)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-[20px] font-medium">
                  {active !== null
                    ? formatBig(slices[active].value * 100, currency, locale)
                    : formatBig(total, currency, locale)}
                </span>
                <span className="text-[11px] text-faint">{active !== null ? slices[active].name : 'spent'}</span>
              </div>
            </div>

            <ul className="border-t border-rule px-3.5 py-2.5">
              {slices.slice(0, 8).map((s, i) => (
                <li
                  key={s.name}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  className="flex cursor-default items-center gap-2 rounded-md px-1 py-0.5 text-[12.5px] transition-colors"
                  style={{ background: active === i ? 'var(--color-brand-soft)' : 'transparent' }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-muted">{s.name}</span>
                  <span className="num">{formatBig(s.value * 100, currency, locale)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/** Notion's Accounts gallery: Account name and the Balance formula result. */
export function AccountsGallery({
  statuses,
  settings,
  onChanged,
}: {
  statuses: AccountStatus[];
  settings: Settings;
  onChanged: () => void;
}) {
  const { currency, locale } = settings;
  const total = statuses.reduce((sum, s) => sum + s.balance, 0);

  async function remove(name: string, id: string) {
    if (
      !window.confirm(
        `Delete "${name}"? Its past transactions stay in your ledger but will no longer show an account name.`,
      )
    )
      return;
    await softDelete('accounts', id);
    onChanged();
  }

  async function handleReorder(nextIds: string[]) {
    await reorder('accounts', nextIds);
    onChanged();
  }

  return (
    <section className="mb-7">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium">Accounts</h2>
        <span className={`num text-[13px] ${total < 0 ? 'text-over' : 'text-muted'}`}>
          {formatMoney(total, { currency, locale, showCents: false })}
        </span>
      </div>

      <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
        {statuses.length === 0 ? (
          <EmptyRow>No accounts yet.</EmptyRow>
        ) : (
          <div className="max-h-[420px] divide-y divide-rule overflow-y-auto">
            <SortableList ids={statuses.map((s) => s.account.id)} onReorder={handleReorder}>
              {statuses.map((s) => (
                <SortableRow key={s.account.id} id={s.account.id}>
                  {(handle) => (
                    <div className="group bg-raised px-3.5 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <DragHandle {...handle} />
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: s.account.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate text-[13.5px]">{s.account.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={`num text-[14px] ${s.balance < 0 ? 'text-over' : ''}`}>
                            {formatMoney(s.balance, { currency, locale })}
                          </span>
                          <button
                            type="button"
                            onClick={() => void remove(s.account.name, s.account.id)}
                            aria-label={`Delete ${s.account.name}`}
                            className="text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2 text-[11.5px] text-faint">
                        <span>start</span>
                        <input
                          defaultValue={(s.account.initialAmount / 100).toFixed(0)}
                          onBlur={async (e) => {
                            await setInitialAmount(s.account.id, parseAmount(e.target.value) ?? 0);
                            onChanged();
                          }}
                          inputMode="decimal"
                          aria-label={`Initial amount for ${s.account.name}`}
                          className="num w-14 rounded border border-transparent bg-transparent px-1 text-right outline-none hover:border-rule focus:border-brand focus:text-ink"
                        />
                        <span className="ml-auto num">
                          +{formatBig(s.totalIncome + s.transferIn, currency, locale)} · −
                          {formatBig(s.totalExpenses + s.transferOut, currency, locale)}
                        </span>
                      </div>
                    </div>
                  )}
                </SortableRow>
              ))}
            </SortableList>
          </div>
        )}
      </div>
    </section>
  );
}
