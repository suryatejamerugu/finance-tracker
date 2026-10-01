import { useState } from 'react';
import type { Account, SavingsGoal, Settings } from '../types';
import { formatMoney, HIDDEN_AMOUNT, parseAmount } from '../lib/money';
import { goalProgress } from '../lib/selectors';
import { reorder, setSavingsGoalProgress, softDelete } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { EmptyRow } from './Panel';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditIcon } from './icons';
import { SavingsGoalModal } from './SavingsGoalModal';

/**
 * Two ways a goal tracks progress, side by side in the same list: unlinked,
 * "saved so far" is a plain number typed in by hand, same as a category's
 * budget; linked to an account, it's derived from that account's real
 * balance (see goalAllocations() in selectors.ts for the contribution rule)
 * and shown read-only, with the account named so it's never a mystery where
 * the number comes from.
 *
 * Always drag-to-reorder and internally scrolling, on the dashboard card
 * and anywhere else this renders — unlike Budget/Accounts there's no
 * separate "compact preview, full view has the real controls" split, since
 * that split was exactly what left the dashboard card unable to reorder.
 */
export function SavingsGoals({
  goals,
  settings,
  defaultCurrency,
  accounts,
  allocations,
  onChanged,
  compact,
  hideBalances,
}: {
  goals: SavingsGoal[];
  settings: Settings;
  /** The dashboard's current currency lens — used only as the default for a brand-new goal. */
  defaultCurrency: string;
  accounts: Account[];
  /** Derived saved-amount per account-linked goal id — see goalAllocations(). */
  allocations: Map<string, number>;
  onChanged: () => void;
  /** Dashboard card: a shorter internal scroll height. Omit for a taller, full-page view. */
  compact?: boolean;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  async function remove(name: string, id: string) {
    if (!window.confirm(`Delete "${name}"? This only removes the goal — it never touched any account.`)) return;
    await softDelete('savingsGoals', id);
    onChanged();
  }

  async function handleReorder(nextIds: string[]) {
    await reorder('savingsGoals', nextIds);
    onChanged();
  }

  const Row = (g: SavingsGoal, handle: Parameters<typeof DragHandle>[0] | null) => {
    const money = (c: number) => formatMoney(c, { currency: g.currency, locale });
    const linked = g.accountId ? accountName.get(g.accountId) : null;
    const saved = g.accountId ? (allocations.get(g.id) ?? 0) : g.savedAmount;
    const pct = goalProgress(saved, g.targetAmount);
    const reached = g.targetAmount > 0 && saved >= g.targetAmount;
    return (
      <div className="group bg-raised px-3.5 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            {handle && <DragHandle {...handle} />}
            <IconBadge icon={iconFor(g.icon)} color={g.color} size={20} />
            <span className="truncate text-[13.5px]">{g.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className={`num text-[12px] ${reached ? 'text-under' : 'text-faint'}`}>
              {reached ? 'reached' : `${Math.round(pct)}%`}
            </span>
            <button
              type="button"
              onClick={() => setEditing(g)}
              aria-label={`Edit ${g.name}`}
              className="p-2 -m-2 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
            >
              <EditIcon />
            </button>
            <button
              type="button"
              onClick={() => void remove(g.name, g.id)}
              aria-label={`Delete ${g.name}`}
              className="p-2 -m-2 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
            >
              ×
            </button>
          </span>
        </div>

        <div className="mt-1.5 h-[5px] overflow-hidden rounded-sm bg-rule">
          <div
            className={`bar-segmented h-full rounded-sm ${reached ? 'bg-under' : 'bg-brand'}`}
            style={{ width: `${pct}%`, transition: 'width 380ms cubic-bezier(.2,.7,.3,1)' }}
          />
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          {hideBalances ? (
            <span className="num text-[12px] text-faint">{HIDDEN_AMOUNT}</span>
          ) : linked ? (
            <span className="num text-[12px] text-muted" title={`Derived from ${linked}'s balance`}>
              {money(saved)}
            </span>
          ) : (
            <input
              key={g.savedAmount}
              defaultValue={(g.savedAmount / 100).toFixed(2)}
              onBlur={async (e) => {
                await setSavingsGoalProgress(g.id, parseAmount(e.target.value) ?? 0);
                onChanged();
              }}
              inputMode="decimal"
              aria-label={`Saved so far for ${g.name}`}
              className="num w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-muted outline-none hover:border-rule focus:border-brand focus:text-ink"
            />
          )}
          <span className="num text-[12px] text-faint">of {hideBalances ? HIDDEN_AMOUNT : money(g.targetAmount)}</span>
        </div>
        {linked && <div className="mt-1 text-[10.5px] text-faint">linked: {linked}</div>}
      </div>
    );
  };

  return (
    <>
      <section className="mb-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium">Savings goals</h2>
          <button type="button" onClick={() => setCreating(true)} className="py-1 -my-1 text-[12.5px] text-muted hover:text-brand">
            New goal
          </button>
        </div>

        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {goals.length === 0 ? (
            <EmptyRow>No savings goals yet.</EmptyRow>
          ) : (
            <div className={`${compact ? 'max-h-[240px]' : 'max-h-[480px]'} divide-y divide-rule overflow-y-auto`}>
              <SortableList ids={goals.map((g) => g.id)} onReorder={handleReorder}>
                {goals.map((g) => (
                  <SortableRow key={g.id} id={g.id}>
                    {(handle) => Row(g, handle)}
                  </SortableRow>
                ))}
              </SortableList>
            </div>
          )}
        </div>
      </section>

      {creating && (
        <SavingsGoalModal
          editing={null}
          existingCount={goals.length}
          defaultCurrency={defaultCurrency}
          accounts={accounts}
          onChanged={onChanged}
          onClose={() => setCreating(false)}
        />
      )}

      {editing && (
        <SavingsGoalModal
          editing={editing}
          existingCount={goals.length}
          defaultCurrency={defaultCurrency}
          accounts={accounts}
          onChanged={onChanged}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
