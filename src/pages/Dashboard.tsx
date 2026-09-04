import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../lib/db';
import {
  buildAccountStatuses,
  buildCategoryStatuses,
  donutByCategory,
  live,
  monthSummary,
} from '../lib/selectors';
import { currentMonth, formatBig, formatMoney, monthLabel, shiftMonth } from '../lib/money';
import { ADD_LABELS, AddModal, type AddKind } from '../components/AddModal';
import { CategoryGallery } from '../components/CategoryGallery';
import { ExpensesPanel } from '../components/ExpensesPanel';
import { IncomesPanel } from '../components/IncomesPanel';
import { TransfersPanel } from '../components/TransfersPanel';
import { AccountsGallery, SpendDonut } from '../components/RightRail';
import { DataMenu } from '../components/DataMenu';
import { LedgerView } from '../components/LedgerView';

const ADD_ORDER: AddKind[] = ['expense', 'income', 'transfer', 'category', 'account'];

/**
 * Everything on one page, three columns, matching the Notion dashboard:
 * budget cards left, the three ledgers in the middle, donut and balances right.
 * On narrow screens the columns stack, ordered so the numbers you check most
 * often come first.
 */
export function Dashboard({ onChanged }: { onChanged: () => void }) {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState<AddKind | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [accounts, categories, expenses, incomes, transfers, settings] = await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.expenses.toArray(),
      db.incomes.toArray(),
      db.transfers.toArray(),
      db.settings.get('settings'),
    ]);
    return { accounts, categories, expenses, incomes, transfers, settings: settings ?? DEFAULT_SETTINGS };
  }, []);

  if (!data) return <div className="p-6 text-muted">Loading…</div>;

  const { settings } = data;
  const { currency, locale } = settings;
  const liveCategories = live(data.categories).sort((a, b) => a.order - b.order);
  const liveAccounts = live(data.accounts).sort((a, b) => a.order - b.order);

  const categoryStatuses = buildCategoryStatuses(data.categories, data.expenses, month);
  const accountStatuses = buildAccountStatuses(data.accounts, data.expenses, data.incomes, data.transfers);
  const summary = monthSummary(categoryStatuses, data.expenses, data.incomes, month);
  const slices = donutByCategory(data.categories, data.expenses, month);

  return (
    <div className="px-4 pb-16 sm:px-6">
      {/* Month bar and headline figures */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="px-2 py-1 text-muted hover:text-ink"
          >
            ‹
          </button>
          <span className="min-w-[8.5rem] text-center text-[14px]">{monthLabel(month, locale)}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
            className="px-2 py-1 text-muted hover:text-ink"
          >
            ›
          </button>
        </div>

        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-[12px] text-faint">In</dt>
            <dd className="num text-[15px] text-under">{formatBig(summary.income, currency, locale)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-[12px] text-faint">Out</dt>
            <dd className="num text-[15px]">{formatBig(summary.spent, currency, locale)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-[12px] text-faint">Net</dt>
            <dd className={`num text-[15px] ${summary.net < 0 ? 'text-over' : ''}`}>
              {formatMoney(summary.net, { currency, locale, showCents: false, signed: true })}
            </dd>
          </div>
          {summary.budgeted > 0 && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-[12px] text-faint">{summary.left < 0 ? 'Over budget' : 'Left'}</dt>
              <dd className={`num text-[15px] ${summary.left < 0 ? 'text-over' : ''}`}>
                {formatBig(Math.abs(summary.left), currency, locale)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* The five Notion dashboard buttons, plus the full-history/export view */}
      <div className="mb-5 flex flex-wrap gap-2">
        {ADD_ORDER.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setAdding(kind)}
            className={`rounded-lg px-3 py-1.5 text-[13px] transition-transform hover:-translate-y-px ${
              kind === 'expense'
                ? 'bg-brand-gradient text-white shadow-card'
                : 'border border-rule text-muted hover:border-brand hover:text-brand'
            }`}
          >
            {ADD_LABELS[kind]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="ml-auto rounded-lg border border-rule px-3 py-1.5 text-[13px] text-muted transition-transform hover:-translate-y-px hover:border-brand hover:text-brand"
        >
          Full history
        </button>
      </div>

      {(summary.overspent > 0 || summary.unbudgeted > 0) && (
        <p className="mb-5 rounded-lg border border-rule bg-over-soft px-3 py-2 text-[13px] text-over">
          {summary.overspent > 0 &&
            `${summary.overspent} ${summary.overspent === 1 ? 'category is' : 'categories are'} over budget.`}
          {summary.overspent > 0 && summary.unbudgeted > 0 && ' '}
          {summary.unbudgeted > 0 &&
            `${summary.unbudgeted} ${summary.unbudgeted === 1 ? 'category has' : 'categories have'} spending but no budget set.`}
        </p>
      )}

      {/* 21 / 54 / 25 on desktop, matching the Notion column ratios */}
      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[21fr_54fr_25fr]">
        <div className="order-2 lg:order-1">
          <CategoryGallery statuses={categoryStatuses} settings={settings} onChanged={onChanged} />
        </div>

        <div className="order-3 lg:order-2">
          <ExpensesPanel
            expenses={data.expenses}
            categories={liveCategories}
            accounts={liveAccounts}
            month={month}
            settings={settings}
            onChanged={onChanged}
          />
          <IncomesPanel
            incomes={data.incomes}
            accounts={liveAccounts}
            month={month}
            settings={settings}
            onChanged={onChanged}
          />
          <TransfersPanel
            transfers={data.transfers}
            accounts={liveAccounts}
            settings={settings}
            onChanged={onChanged}
          />
        </div>

        <div className="order-1 lg:order-3">
          <SpendDonut slices={slices} total={summary.spent} settings={settings} />
          <AccountsGallery statuses={accountStatuses} settings={settings} onChanged={onChanged} />
        </div>
      </div>

      <section className="mt-8 border-t border-rule pt-5">
        <h2 className="mb-2 text-[15px] font-medium">Your data</h2>
        <p className="mb-3 max-w-prose text-[13px] text-muted">
          Everything lives on this device, and in your own Google Drive if you connected it. A
          backup file is the way to move it somewhere else, or to bring your Notion export in.
        </p>
        <DataMenu onChanged={onChanged} />
      </section>

      {adding && (
        <AddModal
          kind={adding}
          categories={liveCategories}
          accounts={liveAccounts}
          onClose={() => setAdding(null)}
          onSaved={onChanged}
        />
      )}

      {historyOpen && (
        <LedgerView
          expenses={data.expenses}
          incomes={data.incomes}
          transfers={data.transfers}
          categories={data.categories}
          accounts={data.accounts}
          settings={settings}
          month={month}
          categoryStatuses={categoryStatuses}
          monthSummary={summary}
          onChanged={onChanged}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
