import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../lib/db';
import { availableCurrencies, live, REPORT_RANGES, type ReportRange } from '../lib/selectors';
import { SpendingTrend } from '../components/SpendingTrend';
import { IncomeTrend } from '../components/IncomeTrend';

const RANGE_KEY = 'ft.reportsRange';

/**
 * Charts, moved off the dashboard into their own page — same shell as the
 * dashboard and the Guide (App.tsx swaps this in by path), reached from the
 * header's Reports link. One range picker drives both charts, rather than
 * each chart getting its own, so "switch to last 6 months" means the same
 * thing everywhere on the page.
 */
export function Reports({ onChanged }: { onChanged: () => void }) {
  const [range, setRange] = useState<ReportRange>(
    () => (localStorage.getItem(RANGE_KEY) as ReportRange | null) ?? '12m',
  );
  const [currencyLens, setCurrencyLens] = useState(() => localStorage.getItem('ft.currencyLens') ?? '');

  function setAndPersistRange(r: ReportRange) {
    setRange(r);
    localStorage.setItem(RANGE_KEY, r);
  }

  const data = useLiveQuery(async () => {
    const [accounts, categories, incomeCategories, expenses, incomes, settings] = await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.incomeCategories.toArray(),
      db.expenses.toArray(),
      db.incomes.toArray(),
      db.settings.get('settings'),
    ]);
    return { accounts, categories, incomeCategories, expenses, incomes, settings: settings ?? DEFAULT_SETTINGS };
  }, []);

  if (!data) return <div className="p-6 text-muted">Loading…</div>;

  const { settings } = data;
  const liveAccounts = live(data.accounts).sort((a, b) => a.order - b.order);
  const liveCategories = live(data.categories).sort((a, b) => a.order - b.order);
  const liveIncomeCategories = live(data.incomeCategories).sort((a, b) => a.order - b.order);
  const currencies = availableCurrencies(data.accounts, settings.currency);
  const currency = currencies.includes(currencyLens) ? currencyLens : settings.currency;

  return (
    <div className="mx-auto max-w-[820px] px-4 pb-16 pt-6 sm:px-6">
      <h1 className="mb-1 text-[22px] font-semibold tracking-tight">Reports</h1>
      <p className="mb-5 text-[13.5px] text-faint">
        Spending and income over time — pick a range below. Scoped to the same currency lens as the
        dashboard.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex overflow-hidden rounded-lg border border-rule">
          {REPORT_RANGES.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setAndPersistRange(r.key)}
              aria-current={range === r.key ? 'true' : undefined}
              className={`px-2.5 py-1 text-[12px] font-medium transition-colors ${i > 0 ? 'border-l border-rule' : ''} ${
                range === r.key ? 'bg-brand text-paper' : 'bg-raised text-faint hover:text-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {currencies.length > 1 && (
          <div className="flex gap-1 rounded-lg border border-rule p-0.5">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCurrencyLens(c);
                  localStorage.setItem('ft.currencyLens', c);
                }}
                aria-current={currency === c ? 'true' : undefined}
                className={`rounded-md px-2 py-1 text-[12.5px] ${
                  currency === c ? 'bg-brand text-paper' : 'text-faint hover:text-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <SpendingTrend
        expenses={data.expenses}
        categories={liveCategories}
        accounts={liveAccounts}
        currency={currency}
        homeCurrency={settings.currency}
        range={range}
        settings={settings}
      />
      <IncomeTrend
        incomes={data.incomes}
        accounts={liveAccounts}
        incomeCategories={liveIncomeCategories}
        currency={currency}
        homeCurrency={settings.currency}
        range={range}
        settings={settings}
        onChanged={onChanged}
      />
    </div>
  );
}
