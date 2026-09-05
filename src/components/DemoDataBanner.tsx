import { useState } from 'react';
import type { Account, Category } from '../types';
import { loadDemoData } from '../lib/demoData';

const DISMISS_KEY = 'ft.demoDismissed';

/**
 * Shown only while the ledger is completely empty, so a new user can see the
 * budgets, charts and full-history view populated before entering a single
 * real transaction — rather than a blank dashboard with no obvious next step.
 */
export function DemoDataBanner({
  categories,
  accounts,
  onChanged,
}: {
  categories: Category[];
  accounts: Account[];
  onChanged: () => void;
}) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  async function load() {
    setLoading(true);
    try {
      await loadDemoData(categories, accounts);
      onChanged();
      dismiss();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-brand-soft px-4 py-3">
      <div>
        <p className="text-[13.5px] font-medium text-brand">New here?</p>
        <p className="text-[12.5px] text-muted">
          Load a few months of sample expenses, income and transfers to see the budgets, charts
          and full history in action — delete them anytime from Full history.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-brand-gradient px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Load sample data'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg border border-rule px-3 py-1.5 text-[13px] text-muted hover:border-brand hover:text-brand"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
