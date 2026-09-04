import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Account, Category, Expense, ISOMonth, Settings } from '../types';
import { dayLabel, formatMoney, monthLabel, shortMonthLabel } from '../lib/money';
import { groupByPeriod, live, stackedByMonth } from '../lib/selectors';
import { softDelete } from '../lib/store';
import { EmptyRow, GroupHeading, Panel } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';

const TABS = ['Recent', 'Weekly', 'Monthly', 'Chart'] as const;
type Tab = (typeof TABS)[number];

export function ExpensesPanel({
  expenses,
  categories,
  accounts,
  month,
  settings,
  onChanged,
}: {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  month: ISOMonth;
  settings: Settings;
  onChanged: () => void;
}) {
  const { currency, locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = live(expenses);
  const chartSeries = useSeriesInteraction();

  const Row = ({ e, show }: { e: Expense; show: 'account' | 'category' }) => (
    <div className="group flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[14px]">{e.name}</div>
        <div className="truncate text-[12px] text-faint">
          {show === 'account'
            ? [acctName.get(e.accountId ?? ''), e.text].filter(Boolean).join(' · ') || '—'
            : catName.get(e.categoryId ?? '') || 'Uncategorised'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="num text-[14px]">{money(e.amount)}</span>
        <button
          type="button"
          onClick={async () => {
            await softDelete('expenses', e.id);
            onChanged();
          }}
          aria-label={`Delete ${e.name}`}
          className="text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
        >
          ×
        </button>
      </div>
    </div>
  );

  const render = (tab: Tab) => {
    if (tab === 'Chart') {
      const { data, series } = stackedByMonth(rows, month, 12, (e) => catName.get(e.categoryId ?? '') ?? null);
      const colorOf = new Map(categories.map((c) => [c.name, c.color]));
      const color = (name: string) => colorOf.get(name) ?? '#9A9DA3';
      if (series.length === 0) return <EmptyRow>No expenses in the last 12 months.</EmptyRow>;
      const { hidden, active, setActive, toggle } = chartSeries;
      return (
        <div className="p-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--color-rule)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                tickFormatter={(m: string) => shortMonthLabel(m, locale)}
              />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={46} />
              <Tooltip {...chartTooltip(currency, locale)} />
              {series
                .filter((name) => !hidden.has(name))
                .map((name) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="expenses"
                    fill={color(name)}
                    fillOpacity={active === null || active === name ? 1 : 0.3}
                    onMouseEnter={() => setActive(name)}
                    onMouseLeave={() => setActive(null)}
                    style={{ cursor: 'pointer', transition: 'fill-opacity 150ms ease' }}
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
          <InteractiveLegend
            series={series}
            colorOf={color}
            hidden={hidden}
            active={active}
            onToggle={toggle}
            onHover={setActive}
          />
        </div>
      );
    }

    if (tab === 'Recent') {
      const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
      if (recent.length === 0) return <EmptyRow>Nothing logged yet. Use New expense above.</EmptyRow>;
      return <div>{recent.map((e) => <Row key={e.id} e={e} show="account" />)}</div>;
    }

    const period = tab === 'Weekly' ? 'day' : 'month';
    const groups = groupByPeriod(rows, period).slice(0, period === 'day' ? 10 : 8);
    if (groups.length === 0) return <EmptyRow>Nothing logged yet.</EmptyRow>;

    return (
      <div>
        {groups.map(([key, group]) => (
          <div key={key}>
            <GroupHeading
              label={period === 'day' ? dayLabel(key, locale) : monthLabel(key, locale)}
              total={money(group.reduce((s, e) => s + e.amount, 0))}
            />
            {group.map((e) => <Row key={e.id} e={e} show="category" />)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Panel title="Expenses" tabs={TABS}>
      {render}
    </Panel>
  );
}
