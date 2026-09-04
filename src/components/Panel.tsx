import { useState, type ReactNode } from 'react';

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
    <section className="mb-7">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-medium">{title}</h2>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'true' : undefined}
              className={`rounded-md px-2 py-0.5 text-[12px] ${
                tab === t ? 'bg-brand-soft text-brand' : 'text-faint hover:text-muted'
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
