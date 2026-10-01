import { useRef, useState, type RefObject } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../lib/db';
import {
  allocatedByAccount,
  availableCurrencies,
  buildAccountStatuses,
  buildCategoryStatuses,
  donutByCategory,
  goalAllocations,
  live,
  monthSummary,
  upcomingBills,
} from '../lib/selectors';
import { currentMonth, formatBig, formatMoney, HIDDEN_AMOUNT, monthLabel, shiftMonth, todayISO } from '../lib/money';
import { ADD_LABELS, AddModal, type AddKind, type EditingRow } from '../components/AddModal';
import { CategoryGallery } from '../components/CategoryGallery';
import { RecentActivity } from '../components/RecentActivity';
import { AccountsGallery, SpendDonut } from '../components/RightRail';
import { SavingsGoals } from '../components/SavingsGoals';
import { UpcomingBills } from '../components/UpcomingBills';
import { LedgerView } from '../components/LedgerView';
import { DemoDataBanner } from '../components/DemoDataBanner';
import { Overlay } from '../components/Panel';

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

/**
 * A short "vs last month" line — percentage only, never a dollar delta, so it
 * stays meaningful (and non-leaking) even while hide-balances is on, the same
 * way a budget's usage percentage already does.
 */
function monthOverMonth(current: number, previous: number): string | undefined {
  if (current === 0 && previous === 0) return undefined;
  if (previous === 0) return 'none last month';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return 'same as last month';
  return `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs last month`;
}

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
  hideBalances,
}: {
  onChanged: () => void;
  userLabel: string | null;
  hideBalances: boolean;
}) {
  const [month, setMonth] = useState(currentMonth());
  const [modal, setModal] = useState<{ kind: AddKind; editing?: EditingRow } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [dismissedOverspent, setDismissedOverspent] = useState<string | null>(null);
  const [dismissedUnbudgeted, setDismissedUnbudgeted] = useState<string | null>(null);
  const [currencyLens, setCurrencyLens] = useState(() => localStorage.getItem('ft.currencyLens') ?? '');
  const budgetRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const accountsRef = useRef<HTMLDivElement>(null);
  const goalsRef = useRef<HTMLDivElement>(null);
  const billsRef = useRef<HTMLDivElement>(null);

  function scrollTo(ref: RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reviewBudgets() {
    budgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setLens(c: string) {
    setCurrencyLens(c);
    localStorage.setItem('ft.currencyLens', c);
  }

  const data = useLiveQuery(async () => {
    const [
      accounts,
      categories,
      incomeCategories,
      expenses,
      incomes,
      transfers,
      savingsGoals,
      recurringEntries,
      settings,
    ] = await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.incomeCategories.toArray(),
      db.expenses.toArray(),
      db.incomes.toArray(),
      db.transfers.toArray(),
      db.savingsGoals.toArray(),
      db.recurringEntries.toArray(),
      db.settings.get('settings'),
    ]);
    return {
      accounts,
      categories,
      incomeCategories,
      expenses,
      incomes,
      transfers,
      savingsGoals,
      recurringEntries,
      settings: settings ?? DEFAULT_SETTINGS,
    };
  }, []);

  if (!data) return <div className="p-6 text-muted">Loading…</div>;

  const { settings } = data;
  const { locale } = settings;
  const liveCategories = live(data.categories).sort((a, b) => a.order - b.order);
  const liveAccounts = live(data.accounts).sort((a, b) => a.order - b.order);
  const liveIncomeCategories = live(data.incomeCategories).sort((a, b) => a.order - b.order);
  const liveSavingsGoals = live(data.savingsGoals).sort((a, b) => a.order - b.order);
  const bills = upcomingBills(data.recurringEntries, data.expenses, data.incomes, todayISO());

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
  const allocations = goalAllocations(liveSavingsGoals, accountStatuses);
  const goalsByAccount = allocatedByAccount(liveSavingsGoals, allocations);

  const NAV_ITEMS: Array<{ label: string; action: () => void } | { label: string; href: string }> = [
    { label: 'Overview', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Budget', action: () => scrollTo(budgetRef) },
    { label: 'Transactions', action: () => scrollTo(activityRef) },
    { label: 'Bills', action: () => scrollTo(billsRef) },
    { label: 'Reports', href: '/reports' },
    { label: 'Accounts', action: () => scrollTo(accountsRef) },
    { label: 'Goals', action: () => scrollTo(goalsRef) },
  ];

  return (
    <div className="px-4 pb-16 sm:px-6">
      {/* The header's own brand mark is a logo, not a page heading, so the
          page had no level-one heading at all — this one is visually
          hidden since the summary cards right below it already make
          "you're looking at your dashboard" obvious at a glance. */}
      <h1 className="sr-only">Dashboard</h1>
      {/* A slim, always-available way to jump to a section instead of scrolling
          to find it — the app is one page, so this isn't a router, just
          anchors into the page's own sections. */}
      <nav aria-label="Dashboard sections" className="-mx-1 flex flex-wrap items-center gap-x-0.5 gap-y-1 border-b border-rule py-2">
        {NAV_ITEMS.map((item) =>
          'href' in item ? (
            <a
              key={item.label}
              href={item.href}
              className="rounded-md px-2.5 py-1 text-[12.5px] text-faint no-underline transition-colors hover:bg-brand-soft hover:text-brand"
            >
              {item.label}
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="rounded-md px-2.5 py-1 text-[12.5px] text-faint transition-colors hover:bg-brand-soft hover:text-brand"
            >
              {item.label}
            </button>
          ),
        )}
      </nav>

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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="px-2.5 py-1 text-muted hover:text-ink"
          >
            ‹
          </button>
          <span className="min-w-[8.5rem] text-center text-[14px]">{monthLabel(month, locale)}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
            className="px-2.5 py-1 text-muted hover:text-ink"
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
                  currency === c ? 'bg-brand text-paper' : 'text-faint hover:text-muted'
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
        <SummaryCard
          label="Income"
          value={hideBalances ? HIDDEN_AMOUNT : formatBig(summary.income, currency, locale)}
          sublabel={monthOverMonth(summary.income, summary.incomePrev)}
          tone="under"
        />
        <SummaryCard
          label="Spending"
          value={hideBalances ? HIDDEN_AMOUNT : formatBig(summary.spent, currency, locale)}
          sublabel={monthOverMonth(summary.spent, summary.spentPrev)}
        />
        <SummaryCard
          label="Net cash flow"
          value={hideBalances ? HIDDEN_AMOUNT : formatMoney(summary.net, { currency, locale, signed: true })}
          tone={summary.net < 0 ? 'over' : 'under'}
        />
        <SummaryCard
          label="Budget status"
          value={
            summary.budgeted === 0
              ? 'No budget set'
              : hideBalances
                ? HIDDEN_AMOUNT
                : formatBig(Math.abs(summary.left), currency, locale)
          }
          sublabel={summary.budgeted > 0 ? (summary.left < 0 ? 'over budget' : 'left to spend') : undefined}
          tone={summary.budgeted === 0 ? 'faint' : summary.left < 0 ? 'over' : 'ink'}
        />
      </div>

      {/* Add expense stays the one unmissable action; income/transfer sit right
          beside it since they're used almost as often. Category/account are
          one-time setup, so they're visually set apart rather than hidden. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
              <button type="button" onClick={reviewBudgets} className="p-1 -m-1 font-medium underline-offset-2 hover:underline">
                Review budgets
              </button>
              <button
                type="button"
                onClick={() => setDismissedOverspent(key)}
                aria-label="Dismiss"
                className="p-2 -m-2 text-[14px] leading-none hover:text-ink"
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
              <button type="button" onClick={reviewBudgets} className="p-1 -m-1 font-medium underline-offset-2 hover:underline">
                Review budgets
              </button>
              <button
                type="button"
                onClick={() => setDismissedUnbudgeted(key)}
                aria-label="Dismiss"
                className="p-2 -m-2 text-[14px] leading-none hover:text-ink"
              >
                ×
              </button>
            </span>
          </p>
        );
      })()}
      </div>

      {/* 21 / 54 / 25 on desktop, matching the Notion column ratios */}
      {/* minmax(0, Nfr) rather than plain Nfr — a plain fr track won't shrink
          below its content's natural width, which at in-between widths like
          1024px was blowing the third column (and the whole grid) past the
          viewport instead of letting its own text/legend truncate. */}
      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[minmax(0,21fr)_minmax(0,54fr)_minmax(0,25fr)]">
        <div ref={budgetRef} className="order-2 min-w-0 lg:order-1 scroll-mt-4">
          <CategoryGallery
            statuses={categoryStatuses}
            currency={currency}
            settings={settings}
            onChanged={onChanged}
            limit={6}
            onViewAll={() => setBudgetsOpen(true)}
            hideBalances={hideBalances}
          />
        </div>

        <div className="order-3 min-w-0 lg:order-2">
          <div ref={activityRef} className="scroll-mt-4">
            <RecentActivity
              expenses={data.expenses}
              incomes={data.incomes}
              transfers={data.transfers}
              categories={liveCategories}
              accounts={liveAccounts}
              incomeCategories={liveIncomeCategories}
              currency={currency}
              homeCurrency={settings.currency}
              settings={settings}
              onChanged={onChanged}
              onEdit={(kind, row) => setModal({ kind, editing: row })}
              onViewAll={() => setHistoryOpen(true)}
              hideBalances={hideBalances}
            />
          </div>
          <div ref={billsRef} className="scroll-mt-4">
            <UpcomingBills
              bills={bills}
              categories={liveCategories}
              accounts={liveAccounts}
              incomeCategories={liveIncomeCategories}
              settings={settings}
              onChanged={onChanged}
              compact
              hideBalances={hideBalances}
            />
          </div>
        </div>

        <div ref={accountsRef} className="order-1 min-w-0 lg:order-3 scroll-mt-4">
          <SpendDonut
            slices={slices}
            total={summary.spent}
            currency={currency}
            settings={settings}
            hideBalances={hideBalances}
          />
          <AccountsGallery
            statuses={accountStatuses}
            expenses={data.expenses}
            incomes={data.incomes}
            transfers={data.transfers}
            settings={settings}
            goalsByAccount={goalsByAccount}
            onChanged={onChanged}
            limit={6}
            onViewAll={() => setAccountsOpen(true)}
            hideBalances={hideBalances}
          />
          <div ref={goalsRef} className="scroll-mt-4">
            <SavingsGoals
              goals={liveSavingsGoals}
              settings={settings}
              defaultCurrency={currency}
              accounts={liveAccounts}
              allocations={allocations}
              onChanged={onChanged}
              compact
              hideBalances={hideBalances}
            />
          </div>
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
          hideBalances={hideBalances}
        />
      )}

      {budgetsOpen && (
        <Overlay title="All budgets" onClose={() => setBudgetsOpen(false)}>
          <CategoryGallery
            statuses={categoryStatuses}
            currency={currency}
            settings={settings}
            onChanged={onChanged}
            hideBalances={hideBalances}
          />
        </Overlay>
      )}

      {accountsOpen && (
        <Overlay title="All accounts" onClose={() => setAccountsOpen(false)}>
          <AccountsGallery
            statuses={accountStatuses}
            expenses={data.expenses}
            incomes={data.incomes}
            transfers={data.transfers}
            settings={settings}
            goalsByAccount={goalsByAccount}
            onChanged={onChanged}
            hideBalances={hideBalances}
          />
        </Overlay>
      )}

    </div>
  );
}
