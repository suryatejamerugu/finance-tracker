import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Account, Category, Expense, Settings } from '../types';
import { HIDDEN_AMOUNT, shortDate, shortMonthLabel, todayISO } from '../lib/money';
import { filterByCurrency, live, REPORT_RANGES, trendBuckets, type ReportRange } from '../lib/selectors';
import { resolveDistinctColors } from '../lib/colors';
import { EmptyRow } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';

/**
 * Spending-by-category trend over a selectable range — split out from what
 * used to be ExpensesPanel's "Chart" tab, and later moved off the dashboard
 * entirely onto the Reports page so the range picker there controls it.
 */
export function SpendingTrend({
  expenses,
  categories,
  accounts,
  currency,
  homeCurrency,
  range,
  settings,
  hideBalances,
}: {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  /** The dashboard's current currency lens. */
  currency: string;
  homeCurrency: string;
  range: ReportRange;
  settings: Settings;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const rows = filterByCurrency(live(expenses), accounts, currency, homeCurrency);
  const chartSeries = useSeriesInteraction();

  const { data, series, granularity } = trendBuckets(rows, range, todayISO(), (e) => catName.get(e.categoryId ?? '') ?? null);
  const dateKey = granularity === 'day' ? 'date' : 'month';
  const tickFormatter = (v: string) => (granularity === 'day' ? shortDate(v, locale) : shortMonthLabel(v, locale));
  const rangeLabel = REPORT_RANGES.find((r) => r.key === range)?.label.toLowerCase() ?? range;
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
          <EmptyRow>No expenses in the selected {rangeLabel}.</EmptyRow>
        ) : (
          <div className="p-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                <XAxis
                  dataKey={dateKey}
                  tick={AXIS}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={tickFormatter}
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
