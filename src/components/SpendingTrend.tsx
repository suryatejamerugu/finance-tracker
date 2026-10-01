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
import { HIDDEN_AMOUNT, shortMonthLabel } from '../lib/money';
import { filterByCurrency, live, stackedByMonth } from '../lib/selectors';
import { resolveDistinctColors } from '../lib/colors';
import { EmptyRow } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';

/**
 * 12-month spending-by-category trend — split out from what used to be
 * ExpensesPanel's "Chart" tab. The Recent/Weekly/Monthly list views that
 * used to live alongside it moved into RecentActivity (recent, merged with
 * income/transfers) and Full History (everything else, with search and
 * export) — this keeps just the one capability neither of those covers.
 */
export function SpendingTrend({
  expenses,
  categories,
  accounts,
  currency,
  homeCurrency,
  month,
  settings,
  hideBalances,
}: {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  /** The dashboard's current currency lens. */
  currency: string;
  homeCurrency: string;
  month: ISOMonth;
  settings: Settings;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const rows = filterByCurrency(live(expenses), accounts, currency, homeCurrency);
  const chartSeries = useSeriesInteraction();

  const { data, series } = stackedByMonth(rows, month, 12, (e) => catName.get(e.categoryId ?? '') ?? null);
  const rawColorOf = new Map(categories.map((c) => [c.name, c.color]));
  const resolved = resolveDistinctColors(series.map((name) => ({ name, color: rawColorOf.get(name) ?? '#9A9DA3' })));
  const colorOf = new Map(resolved.map((r) => [r.name, r.color]));
  const color = (name: string) => colorOf.get(name) ?? '#9A9DA3';
  const { hidden, active, setActive, toggle } = chartSeries;

  return (
    <section className="mb-7">
      <h2 className="mb-2 text-[15px] font-medium">Spending trend</h2>
      <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
        {series.length === 0 ? (
          <EmptyRow>No expenses in the last 12 months.</EmptyRow>
        ) : (
          <div className="p-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={AXIS}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(m: string) => shortMonthLabel(m, locale)}
                />
                <YAxis
                  tick={AXIS}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={hideBalances ? () => HIDDEN_AMOUNT : undefined}
                />
                <Tooltip {...chartTooltip(currency, locale, hideBalances)} />
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
        )}
      </div>
    </section>
  );
}
