import { useState } from 'react';
import type { SavingsGoal, Settings } from '../types';
import { formatMoney, HIDDEN_AMOUNT, parseAmount } from '../lib/money';
import { goalProgress } from '../lib/selectors';
import { reorder, setSavingsGoalProgress, softDelete } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { EmptyRow } from './Panel';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditIcon } from './icons';
import { SavingsGoalModal } from './SavingsGoalModal';

/**
 * A manually-tracked list, not a rollup of any account or transaction — each
 * goal's "saved so far" is a number the user types in themselves, the same
 * way a category's budget is. See SavingsGoal's doc comment in types.ts for
 * why that's deliberate rather than a gap.
 */
export function SavingsGoals({
  goals,
  settings,
  defaultCurrency,
  onChanged,
  limit,
  onViewAll,
  hideBalances,
}: {
  goals: SavingsGoal[];
  settings: Settings;
  /** The dashboard's current currency lens — used only as the default for a brand-new goal. */
  defaultCurrency: string;
  onChanged: () => void;
  /** Dashboard-overview mode: see CategoryGallery's identical prop for why. Omit both for the full, drag-to-reorder-capable view. */
  limit?: number;
  onViewAll?: () => void;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  async function remove(name: string, id: string) {
    if (!window.confirm(`Delete "${name}"? This only removes the goal — it never touched any account.`)) return;
    await softDelete('savingsGoals', id);
    onChanged();
  }

  async function handleReorder(nextIds: string[]) {
    await reorder('savingsGoals', nextIds);
    onChanged();
  }

  const shown = limit ? goals.slice(0, limit) : goals;

  const Row = (g: SavingsGoal, handle: Parameters<typeof DragHandle>[0] | null) => {
    const money = (c: number) => formatMoney(c, { currency: g.currency, locale });
    const pct = goalProgress(g.savedAmount, g.targetAmount);
    const reached = g.targetAmount > 0 && g.savedAmount >= g.targetAmount;
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
      </div>
    );
  };

  return (
    <>
      <section className="mb-7">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium">Savings goals</h2>
          <button type="button" onClick={() => setCreating(true)} className="py-1 -my-1 text-[12.5px] text-muted hover:text-brand">
            New goal
          </button>
        </div>

        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {goals.length === 0 ? (
            <EmptyRow>No savings goals yet.</EmptyRow>
          ) : limit ? (
            <div className="divide-y divide-rule">
              {shown.map((g) => (
                <div key={g.id}>{Row(g, null)}</div>
              ))}
              {goals.length > limit && (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="block w-full px-3.5 py-2 text-center text-[12.5px] text-muted hover:text-brand"
                >
                  View all {goals.length} goals
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-[420px] divide-y divide-rule overflow-y-auto">
              <SortableList ids={shown.map((g) => g.id)} onReorder={handleReorder}>
                {shown.map((g) => (
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
          onChanged={onChanged}
          onClose={() => setCreating(false)}
        />
      )}

      {editing && (
        <SavingsGoalModal
          editing={editing}
          existingCount={goals.length}
          defaultCurrency={defaultCurrency}
          onChanged={onChanged}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
