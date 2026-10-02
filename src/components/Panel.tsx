import { useState, type ReactNode } from 'react';

/**
 * A dropdown to switch periods, showing only that period's rows — used by the
 * Monthly/Yearly panel tabs instead of stacking every period (and all its
 * transactions) on the page, which meant scrolling past every month in
 * between just to reach older data.
 */
export function PeriodPicker<T>({
  groups,
  selected,
  onSelect,
  labelOf,
  totalOf,
  renderRow,
  emptyLabel,
}: {
  groups: Array<[string, T[]]>;
  /** The last period the user picked, if any — falls back to the newest period when unset or no longer present. */
  selected: string | null;
  onSelect: (key: string) => void;
  labelOf: (key: string) => string;
  totalOf: (rows: T[]) => string;
  renderRow: (row: T) => ReactNode;
  emptyLabel: string;
}) {
  if (groups.length === 0) return <EmptyRow>{emptyLabel}</EmptyRow>;
  const activeKey = selected && groups.some(([key]) => key === selected) ? selected : groups[0][0];
  const activeGroup = groups.find(([key]) => key === activeKey)![1];
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-rule bg-paper px-4 py-2">
        <select
          value={activeKey}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Choose period"
          className="rounded-md border border-rule bg-raised px-2 py-1 text-[12.5px] outline-none focus:border-brand"
        >
          {groups.map(([key]) => (
            <option key={key} value={key}>{labelOf(key)}</option>
          ))}
        </select>
        <span className="num text-[12px] text-faint">{totalOf(activeGroup)}</span>
      </div>
      {activeGroup.map(renderRow)}
    </div>
  );
}

/**
 * A dashboard panel: a heading, a row of view tabs, and the active view.
 * Mirrors a Notion inline database, where each tab is a saved view of the same
 * underlying data rather than a different dataset.
 */
export function Panel<T extends string>({
  title,
  tabs,
  action,
  children,
}: {
  title: string;
  tabs: readonly T[];
  action?: ReactNode;
  children: (tab: T) => ReactNode;
}) {
  const [tab, setTab] = useState<T>(tabs[0]);

  return (
    <section className="mb-5">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {/* A bordered, divided segment cluster rather than loose pills — each
            view is a distinct "button" in the strip, with a solid fill for
            the one currently pressed. */}
        <div className="flex overflow-hidden rounded-lg border border-rule">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'true' : undefined}
              className={`px-2.5 py-1 text-[12px] font-medium transition-colors ${i > 0 ? 'border-l border-rule' : ''} ${
                tab === t ? 'bg-brand text-paper' : 'bg-raised text-faint hover:text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">{children(tab)}</div>
    </section>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-4 py-7 text-center text-[13px] text-faint">{children}</p>;
}

/** A date/month/year bucket heading inside a grouped list view. */
export function GroupHeading({ label, total }: { label: string; total?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-rule bg-paper px-4 py-1.5">
      <span className="text-[12px] text-faint">{label}</span>
      {total && <span className="num text-[12px] text-faint">{total}</span>}
    </div>
  );
}
