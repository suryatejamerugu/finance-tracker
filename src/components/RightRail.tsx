import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Account, AccountStatus, Expense, Income, Settings, Transfer } from '../types';
import { formatBig, formatMoney, HIDDEN_AMOUNT, shortDate, todayISO } from '../lib/money';
import { reorder, softDelete, updateAccount } from '../lib/store';
import { creditCardStatus } from '../lib/selectors';
import { accountTypeMeta, IconBadge } from '../lib/icons';
import { EmptyRow } from './Panel';
import { chartTooltip } from './chartTheme';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditNameColorModal } from './EditNameColorModal';
import { EditIcon } from './icons';

/**
 * Notion's right-column donut: this month's Expenses grouped by Category.
 * Hovering a legend row highlights its slice, and vice versa, so the chart
 * reads as one connected picture rather than two separate views of the data.
 */
export function SpendDonut({
  slices,
  total,
  currency,
  settings,
  hideBalances,
}: {
  slices: Array<{ name: string; value: number; color: string }>;
  total: number;
  /** The dashboard's current currency lens — slices are already scoped to it. */
  currency: string;
  settings: Settings;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
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
                  <Tooltip {...chartTooltip(currency, locale, hideBalances)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="num text-[20px] font-medium">
                  {hideBalances
                    ? HIDDEN_AMOUNT
                    : active !== null
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
                  <span className="num">{hideBalances ? HIDDEN_AMOUNT : formatBig(s.value * 100, currency, locale)}</span>
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
  expenses,
  incomes,
  transfers,
  settings,
  onChanged,
  limit,
  onViewAll,
  hideBalances,
}: {
  statuses: AccountStatus[];
  expenses: Expense[];
  incomes: Income[];
  transfers: Transfer[];
  settings: Settings;
  onChanged: () => void;
  /** Dashboard-overview mode: see CategoryGallery's identical prop for why. Omit both for the full, drag-to-reorder-capable view. */
  limit?: number;
  onViewAll?: () => void;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const today = todayISO();
  const totalsByCurrency = new Map<string, number>();
  for (const s of statuses) {
    totalsByCurrency.set(s.account.currency, (totalsByCurrency.get(s.account.currency) ?? 0) + s.balance);
  }
  const [editing, setEditing] = useState<Account | null>(null);

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
    <>
      <section className="mb-7">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium">Accounts</h2>
          <span className="num flex flex-wrap justify-end gap-x-2 text-[13px] text-muted">
            {hideBalances
              ? [...totalsByCurrency.keys()].map((cur) => <span key={cur}>{HIDDEN_AMOUNT}</span>)
              : [...totalsByCurrency.entries()].map(([cur, sum]) => (
                  <span key={cur} className={sum < 0 ? 'text-over' : ''}>
                    {formatMoney(sum, { currency: cur, locale })}
                  </span>
                ))}
          </span>
        </div>

        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {statuses.length === 0 ? (
            <EmptyRow>No accounts yet.</EmptyRow>
          ) : (
            (() => {
              const shown = limit ? statuses.slice(0, limit) : statuses;

              const Row = (s: AccountStatus, handle: Parameters<typeof DragHandle>[0] | null) => {
                const cc =
                  s.account.type === 'credit_card'
                    ? creditCardStatus(s.account, s.balance, expenses, incomes, transfers, today)
                    : null;
                return (
                  <div className="group bg-raised px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {handle && <DragHandle {...handle} />}
                        <IconBadge icon={accountTypeMeta(s.account.type).icon} color={s.account.color} size={20} />
                        <span className="truncate text-[13.5px]">{s.account.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={`num text-[14px] ${(cc ? cc.owed > 0 : s.balance < 0) ? 'text-over' : ''}`}>
                          {hideBalances
                            ? HIDDEN_AMOUNT
                            : formatMoney(cc ? cc.owed : s.balance, { currency: s.account.currency, locale })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditing(s.account)}
                          aria-label={`Edit ${s.account.name}`}
                          className="p-2 -m-2 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(s.account.name, s.account.id)}
                          aria-label={`Delete ${s.account.name}`}
                          className="p-2 -m-2 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                    {cc && (
                      <div className="mt-1 text-[11.5px] text-faint">
                        <div className="flex items-baseline justify-between gap-2">
                          <span>available</span>
                          <span className="num">
                            {hideBalances
                              ? HIDDEN_AMOUNT
                              : cc.availableCredit != null
                                ? `${formatBig(cc.availableCredit, s.account.currency, locale)} of ${formatBig(cc.creditLimit ?? 0, s.account.currency, locale)}`
                                : 'set a limit in edit'}
                          </span>
                        </div>
                        {cc.creditBalance > 0 && (
                          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-under">
                            <span>card credit</span>
                            <span className="num">
                              {hideBalances ? HIDDEN_AMOUNT : formatBig(cc.creditBalance, s.account.currency, locale)}
                            </span>
                          </div>
                        )}
                        {cc.lastStatementDate && (() => {
                          const overdue = Boolean(
                            cc.statementBalance && cc.statementBalance > 0 && cc.nextDueDate && cc.nextDueDate < today,
                          );
                          const suffix =
                            cc.statementBalance === 0
                              ? ' · paid'
                              : cc.nextDueDate
                                ? overdue
                                  ? ` overdue since ${shortDate(cc.nextDueDate, locale)}`
                                  : ` due ${shortDate(cc.nextDueDate, locale)}`
                                : '';
                          return (
                            <div className="mt-0.5 flex items-baseline justify-between gap-2">
                              <span>this cycle</span>
                              <span className={`num ${overdue ? 'text-over' : ''}`}>
                                {hideBalances ? HIDDEN_AMOUNT : formatBig(cc.statementBalance ?? 0, s.account.currency, locale)}
                                {suffix}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              };

              if (limit) {
                return (
                  <div className="divide-y divide-rule">
                    {shown.map((s) => (
                      <div key={s.account.id}>{Row(s, null)}</div>
                    ))}
                    {statuses.length > limit && (
                      <button
                        type="button"
                        onClick={onViewAll}
                        className="block w-full px-3.5 py-2 text-center text-[12.5px] text-muted hover:text-brand"
                      >
                        View all {statuses.length} accounts
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="max-h-[420px] divide-y divide-rule overflow-y-auto">
                  <SortableList ids={shown.map((s) => s.account.id)} onReorder={handleReorder}>
                    {shown.map((s) => (
                      <SortableRow key={s.account.id} id={s.account.id}>
                        {(handle) => Row(s, handle)}
                      </SortableRow>
                    ))}
                  </SortableList>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {editing && (() => {
        const status = statuses.find((s) => s.account.id === editing.id);
        if (!status) return null;
        const hasHistory =
          status.totalIncome > 0 || status.totalExpenses > 0 || status.transferIn > 0 || status.transferOut > 0;
        return (
          <EditNameColorModal
            title="Edit account"
            initialName={editing.name}
            initialColor={editing.color}
            currencyField={{ value: editing.currency, locked: hasHistory }}
            typeField={{ value: editing.type }}
            accountAmounts={{
              initialAmount: editing.initialAmount,
              creditLimit: editing.creditLimit,
              statementDay: editing.statementDay,
              paymentDueDay: editing.paymentDueDay,
              currentBalance: status.balance,
            }}
            onClose={() => setEditing(null)}
            onSave={async ({ name, color, currency, type, initialAmount, creditLimit, statementDay, paymentDueDay }) => {
              await updateAccount(editing.id, {
                name,
                color,
                currency,
                type,
                initialAmount,
                creditLimit,
                statementDay,
                paymentDueDay,
              });
              onChanged();
            }}
          />
        );
      })()}
    </>
  );
}
