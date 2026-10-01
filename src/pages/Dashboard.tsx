import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../lib/db';
import {
  availableCurrencies,
  buildAccountStatuses,
  buildCategoryStatuses,
  donutByCategory,
  live,
  monthSummary,
} from '../lib/selectors';
import { currentMonth, formatBig, formatMoney, monthLabel, shiftMonth } from '../lib/money';
import { ADD_LABELS, AddModal, type AddKind, type EditingRow } from '../components/AddModal';
import { CategoryGallery } from '../components/CategoryGallery';
import { ExpensesPanel } from '../components/ExpensesPanel';
import { IncomesPanel } from '../components/IncomesPanel';
import { TransfersPanel } from '../components/TransfersPanel';
import { AccountsGallery, SpendDonut } from '../components/RightRail';
import { LedgerView } from '../components/LedgerView';
import { DemoDataBanner } from '../components/DemoDataBanner';

const ADD_ORDER: AddKind[] = ['expense', 'income', 'transfer', 'category', 'account'];
/** The three everyday transaction actions, grouped apart from the two setup actions below. */
const PRIMARY_ADD_COUNT = 3;

type SummaryTone = 'ink' | 'under' | 'over' | 'faint';
const TONE_CLASS: Record<SummaryTone, string> = {
  ink: 'text-ink',
  under: 'text-under',
  over: 'text-over',
  faint: 'text-faint',
};

/** One HUD-style readout: a label, a big tabular number, and an optional second line. */
function SummaryCard({
  label,
  value,
  sublabel,
  tone = 'ink',
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: SummaryTone;
}) {
  return (
    <div className="rounded-xl border border-rule bg-raised px-3.5 py-3 shadow-card card-hover">
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className={`num mt-1 text-[19px] font-semibold ${TONE_CLASS[tone]}`}>{value}</div>
      {sublabel && <div className="mt-0.5 text-[11px] text-faint">{sublabel}</div>}
    </div>
  );
}

/**
 * Everything on one page, three columns, matching the Notion dashboard:
 * budget cards left, the three ledgers in the middle, donut and balances right.
 * On narrow screens the columns stack, ordered so the numbers you check most
 * often come first.
 */
export function Dashboard({
  onChanged,
  userLabel,
}: {
  onChanged: () => void;
  userLabel: string | null;
}) {
  const [month, setMonth] = useState(currentMonth());
  const [modal, setModal] = useState<{ kind: AddKind; editing?: EditingRow } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dismissedOverspent, setDismissedOverspent] = useState<string | null>(null);
  const [dismissedUnbudgeted, setDismissedUnbudgeted] = useState<string | null>(null);
  const [currencyLens, setCurrencyLens] = useState(() => localStorage.getItem('ft.currencyLens') ?? '');
  const budgetRef = useRef<HTMLDivElement>(null);

  function reviewBudgets() {
    budgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setLens(c: string) {
    setCurrencyLens(c);
    localStorage.setItem('ft.currencyLens', c);
  }

  const data = useLiveQuery(async () => {
    const [accounts, categories, incomeCategories, expenses, incomes, transfers, settings] = await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.incomeCategories.toArray(),
      db.expenses.toArray(),
      db.incomes.toArray(),
      db.transfers.toArray(),
      db.settings.get('settings'),
    ]);
    return {
      accounts,
      categories,
      incomeCategories,
      expenses,
      incomes,
      transfers,
      settings: settings ?? DEFAULT_SETTINGS,
    };
  }, []);

  if (!data) return <div className="p-6 text-muted">Loading…</div>;

  const { settings } = data;
  const { locale } = settings;
  const liveCategories = live(data.categories).sort((a, b) => a.order - b.order);
  const liveAccounts = live(data.accounts).sort((a, b) => a.order - b.order);
  const liveIncomeCategories = live(data.incomeCategories).sort((a, b) => a.order - b.order);

  const currencies = availableCurrencies(data.accounts, settings.currency);
  const currency = currencies.includes(currencyLens) ? currencyLens : settings.currency;

  const categoryStatuses = buildCategoryStatuses(
    data.categories,
    data.expenses,
    data.accounts,
    month,
    currency,
    settings.currency,
  );
  const accountStatuses = buildAccountStatuses(data.accounts, data.expenses, data.incomes, data.transfers);
  const summary = monthSummary(
    categoryStatuses,
    data.expenses,
    data.incomes,
    data.accounts,
    month,
    currency,
    settings.currency,
  );
  const slices = donutByCategory(data.categories, data.expenses, data.accounts, month, currency, settings.currency);

  const isEmpty = data.expenses.length === 0 && data.incomes.length === 0 && data.transfers.length === 0;

  return (
    <div className="px-4 pb-16 sm:px-6">
      {isEmpty && (
        <div className="pt-4">
          <DemoDataBanner
            categories={liveCategories}
            accounts={liveAccounts}
            incomeCategories={liveIncomeCategories}
            onChanged={onChanged}
          />
        </div>
      )}

      {/* Month bar and currency lens */}
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

        {currencies.length > 1 && (
          <div className="flex gap-1 rounded-lg border border-rule p-0.5">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setLens(c)}
                aria-current={currency === c ? 'true' : undefined}
                className={`rounded-md px-2 py-1 text-[12.5px] ${
                  currency === c ? 'bg-brand text-white' : 'text-faint hover:text-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* This month's headline numbers, as a HUD-style readout row. */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Income" value={formatBig(summary.income, currency, locale)} tone="under" />
        <SummaryCard label="Spending" value={formatBig(summary.spent, currency, locale)} />
        <SummaryCard
          label="Net cash flow"
          value={formatMoney(summary.net, { currency, locale, signed: true })}
          tone={summary.net < 0 ? 'over' : 'under'}
        />
        <SummaryCard
          label="Budget status"
          value={summary.budgeted > 0 ? formatBig(Math.abs(summary.left), currency, locale) : 'No budget set'}
          sublabel={summary.budgeted > 0 ? (summary.left < 0 ? 'over budget' : 'left to spend') : undefined}
          tone={summary.budgeted === 0 ? 'faint' : summary.left < 0 ? 'over' : 'ink'}
        />
      </div>

      {/* Add expense stays the one unmissable action; income/transfer sit right
          beside it since they're used almost as often. Category/account are
          one-time setup, so they're visually set apart rather than hidden. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {ADD_ORDER.slice(0, PRIMARY_ADD_COUNT).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setModal({ kind })}
            className={`press rounded-lg px-3 py-1.5 text-[13px] ${
              kind === 'expense'
                ? 'bg-brand-gradient text-white shadow-card hover:shadow-card-hover'
                : 'border border-rule text-muted hover:border-brand hover:text-brand'
            }`}
          >
            {ADD_LABELS[kind]}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-rule" aria-hidden="true" />
        {ADD_ORDER.slice(PRIMARY_ADD_COUNT).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setModal({ kind })}
            className="press rounded-lg border border-rule px-3 py-1.5 text-[13px] text-muted hover:border-brand hover:text-brand"
          >
            {ADD_LABELS[kind]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="press ml-auto rounded-lg border border-rule px-3 py-1.5 text-[13px] text-muted hover:border-brand hover:text-brand"
        >
          Full history
        </button>
      </div>

      {/*
        Overspending and "no budget set" mean different things and don't
        deserve the same alarm: overspending is a real notice (red), a
        missing budget is just a gap to fill in when you get to it (amber).
        Each clears on its own rather than one dismiss hiding both.
      */}
      <div className={summary.overspent > 0 || summary.unbudgeted > 0 ? 'mb-5 space-y-2.5' : ''}>
      {(() => {
        if (summary.overspent === 0) return null;
        const key = `${month}:${summary.overspent}`;
        if (dismissedOverspent === key) return null;
        return (
          <p className="flex items-start justify-between gap-3 rounded-lg border border-rule bg-over-soft px-3 py-2 text-[13px] text-over">
            <span>
              {summary.overspent} {summary.overspent === 1 ? 'category is' : 'categories are'} over budget this
              month.
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <button type="button" onClick={reviewBudgets} className="font-medium underline-offset-2 hover:underline">
                Review budgets
              </button>
              <button
                type="button"
                onClick={() => setDismissedOverspent(key)}
                aria-label="Dismiss"
                className="text-[14px] leading-none hover:text-ink"
              >
                ×
              </button>
            </span>
          </p>
        );
      })()}
      {(() => {
        if (summary.unbudgeted === 0) return null;
        const key = `${month}:${summary.unbudgeted}`;
        if (dismissedUnbudgeted === key) return null;
        return (
          <p className="flex items-start justify-between gap-3 rounded-lg border border-rule bg-amber-soft px-3 py-2 text-[13px] text-amber">
            <span>
              {summary.unbudgeted} {summary.unbudgeted === 1 ? 'category has' : 'categories have'} spending but no
              budget set.
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <button type="button" onClick={reviewBudgets} className="font-medium underline-offset-2 hover:underline">
                Review budgets
              </button>
              <button
                type="button"
                onClick={() => setDismissedUnbudgeted(key)}
                aria-label="Dismiss"
                className="text-[14px] leading-none hover:text-ink"
              >
                ×
              </button>
            </span>
          </p>
        );
      })()}
      </div>

      {/* 21 / 54 / 25 on desktop, matching the Notion column ratios */}
      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[21fr_54fr_25fr]">
        <div ref={budgetRef} className="order-2 lg:order-1 scroll-mt-4">
          <CategoryGallery statuses={categoryStatuses} currency={currency} settings={settings} onChanged={onChanged} />
        </div>

        <div className="order-3 lg:order-2">
          <ExpensesPanel
            expenses={data.expenses}
            categories={liveCategories}
            accounts={liveAccounts}
            currency={currency}
            homeCurrency={settings.currency}
            month={month}
            settings={settings}
            onChanged={onChanged}
            onEdit={(expense) => setModal({ kind: 'expense', editing: expense })}
          />
          <IncomesPanel
            incomes={data.incomes}
            accounts={liveAccounts}
            incomeCategories={liveIncomeCategories}
            currency={currency}
            homeCurrency={settings.currency}
            month={month}
            settings={settings}
            onChanged={onChanged}
            onEdit={(income) => setModal({ kind: 'income', editing: income })}
          />
          <TransfersPanel
            transfers={data.transfers}
            accounts={liveAccounts}
            currency={currency}
            homeCurrency={settings.currency}
            settings={settings}
            onChanged={onChanged}
            onEdit={(transfer) => setModal({ kind: 'transfer', editing: transfer })}
          />
        </div>

        <div className="order-1 lg:order-3">
          <SpendDonut slices={slices} total={summary.spent} currency={currency} settings={settings} />
          <AccountsGallery
            statuses={accountStatuses}
            expenses={data.expenses}
            incomes={data.incomes}
            transfers={data.transfers}
            settings={settings}
            onChanged={onChanged}
          />
        </div>
      </div>

      {modal && (
        <AddModal
          kind={modal.kind}
          categories={liveCategories}
          accounts={liveAccounts}
          incomeCategories={liveIncomeCategories}
          currency={currency}
          editing={modal.editing ?? null}
          onClose={() => setModal(null)}
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
          incomeCategories={data.incomeCategories}
          currency={currency}
          homeCurrency={settings.currency}
          settings={settings}
          month={month}
          categoryStatuses={categoryStatuses}
          monthSummary={summary}
          userLabel={userLabel}
          onChanged={onChanged}
          onClose={() => setHistoryOpen(false)}
          onEdit={(kind, row) => setModal({ kind, editing: row })}
        />
      )}
    </div>
  );
}
