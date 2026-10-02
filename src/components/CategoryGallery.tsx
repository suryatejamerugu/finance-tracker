import { useState } from 'react';
import type { Category, CategoryStatus, IncomeCategory, Settings } from '../types';
import { formatMoney, HIDDEN_AMOUNT, parseAmount } from '../lib/money';
import { reorder, setCategoryBudget, softDelete, updateCategory } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { EmptyRow, Panel } from './Panel';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditNameColorModal } from './EditNameColorModal';
import { CategoriesModal } from './CategoriesModal';
import { EditIcon } from './icons';

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
  currency,
  settings,
  incomeCategories,
  onChanged,
  hideBalances,
}: {
  statuses: CategoryStatus[];
  /** The dashboard's current currency lens — statuses are already scoped to it. */
  currency: string;
  settings: Settings;
  /** For the "Income sources" management link — income has no budget, so it has no card of its own; this is the one place on the dashboard both kinds of category are reachable from. */
  incomeCategories: IncomeCategory[];
  onChanged: () => void;
  /** When true, spent/budget figures are masked and the inline budget field becomes read-only (editing a value you can't see risks blurring it blank). */
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const [editing, setEditing] = useState<Category | null>(null);
  const [managingIncome, setManagingIncome] = useState(false);

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

    const Row = (s: CategoryStatus, handle: Parameters<typeof DragHandle>[0] | null) => {
      const spent = isThis ? s.expenseThisMonth : s.expenseLastMonth;
      const usage = isThis ? s.usage : s.usageLastMonth;
      const budget = s.category.budgets[currency] ?? 0;
      const pct = budget > 0 ? Math.min(100, usage * 100) : spent > 0 ? 100 : 0;
      const state = budget > 0 ? (usage > 1 ? 'over' : usage >= 0.85 ? 'close' : 'under') : 'unbudgeted';

      return (
        <div className="group bg-raised px-3.5 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              {handle && <DragHandle {...handle} />}
              <IconBadge icon={iconFor(s.category.icon)} color={s.category.color} size={20} />
              <span className="truncate text-[13.5px]">{s.category.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className={`num text-[12px] ${state === 'over' ? 'text-over' : 'text-faint'}`}>
                {budget > 0 ? `${Math.round(usage * 100)}%` : 'no budget'}
              </span>
              <button
                type="button"
                onClick={() => setEditing(s.category)}
                aria-label={`Edit ${s.category.name}`}
                className="p-2 -m-2 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => void remove(s.category.name, s.category.id)}
                aria-label={`Delete ${s.category.name}`}
                className="p-2 -m-2 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
              >
                ×
              </button>
            </span>
          </div>

          <div className="mt-1.5 h-[5px] overflow-hidden rounded-sm bg-rule">
            <div
              className={`bar-segmented h-full rounded-sm ${BAR[state]}`}
              style={{ width: `${pct}%`, transition: 'width 380ms cubic-bezier(.2,.7,.3,1)' }}
            />
          </div>

          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="num text-[12px] text-muted">{hideBalances ? HIDDEN_AMOUNT : money(spent)}</span>
            {isThis ? (
              hideBalances ? (
                <span className="num text-[12px] text-faint">{HIDDEN_AMOUNT}</span>
              ) : (
                <input
                  key={currency}
                  defaultValue={budget > 0 ? (budget / 100).toFixed(2) : ''}
                  onBlur={async (e) => {
                    await setCategoryBudget(s.category.id, currency, parseAmount(e.target.value) ?? 0);
                    onChanged();
                  }}
                  inputMode="decimal"
                  placeholder="budget"
                  aria-label={`Monthly ${currency} budget for ${s.category.name}`}
                  className="num w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-[12px] text-faint outline-none hover:border-rule focus:border-brand focus:text-ink"
                />
              )
            ) : (
              <span className="num text-[12px] text-faint">
                of {hideBalances ? HIDDEN_AMOUNT : money(budget)}
              </span>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="max-h-[480px] divide-y divide-rule overflow-y-auto">
        <SortableList ids={ids} onReorder={handleReorder}>
          {statuses.map((s) => (
            <SortableRow key={s.category.id} id={s.category.id}>
              {(handle) => Row(s, handle)}
            </SortableRow>
          ))}
        </SortableList>
      </div>
    );
  };

  return (
    <>
      <Panel
        title="Budget"
        tabs={TABS}
        action={
          <button
            type="button"
            onClick={() => setManagingIncome(true)}
            className="rounded-md px-2 py-1.5 -my-1 text-[12px] text-faint hover:text-brand"
          >
            Income sources
          </button>
        }
      >
        {render}
      </Panel>

      {editing && (
        <EditNameColorModal
          title="Edit category"
          initialName={editing.name}
          initialColor={editing.color}
          iconField={{ value: editing.icon }}
          onClose={() => setEditing(null)}
          onSave={async ({ name, color, icon }) => {
            await updateCategory(editing.id, { name, color, icon });
            onChanged();
          }}
        />
      )}

      {managingIncome && (
        <CategoriesModal
          categories={statuses.map((s) => s.category)}
          incomeCategories={incomeCategories}
          currency={currency}
          initialKind="income"
          onChanged={onChanged}
          onClose={() => setManagingIncome(false)}
        />
      )}
    </>
  );
}
