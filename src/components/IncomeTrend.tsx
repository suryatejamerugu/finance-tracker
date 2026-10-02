import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Account, Category, Income, IncomeCategory, Settings } from '../types';
import { HIDDEN_AMOUNT, shortDate, shortMonthLabel, todayISO } from '../lib/money';
import { filterByCurrency, live, REPORT_RANGES, trendBuckets, type ReportRange } from '../lib/selectors';
import { resolveDistinctColors } from '../lib/colors';
import { EmptyRow } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';
import { CategoriesModal } from './CategoriesModal';

/**
 * Income-by-source trend over a selectable range — split out from what used
 * to be IncomesPanel's "Chart" tab, and later moved off the dashboard onto
 * the Reports page. "Categories" (managing both kinds) stays here too since
 * this is still the one place income's own settings live.
 */
export function IncomeTrend({
  incomes,
  accounts,
  categories,
  incomeCategories,
  currency,
  homeCurrency,
  range,
  settings,
  onChanged,
  hideBalances,
}: {
  incomes: Income[];
  accounts: Account[];
  categories: Category[];
  incomeCategories: IncomeCategory[];
  /** The dashboard's current currency lens. */
  currency: string;
  homeCurrency: string;
  range: ReportRange;
  settings: Settings;
  onChanged: () => void;
  hideBalances?: boolean;
}) {
  const { locale } = settings;
  const sourceName = new Map(incomeCategories.map((c) => [c.id, c.name]));
  const rows = filterByCurrency(live(incomes), accounts, currency, homeCurrency);
  const chartSeries = useSeriesInteraction();
  const [managingCategories, setManagingCategories] = useState(false);

  const { data, series, granularity } = trendBuckets(rows, range, todayISO(), (i) => sourceName.get(i.sourceId ?? '') ?? null);
  const dateKey = granularity === 'day' ? 'date' : 'month';
  const tickFormatter = (v: string) => (granularity === 'day' ? shortDate(v, locale) : shortMonthLabel(v, locale));
  const rangeLabel = REPORT_RANGES.find((r) => r.key === range)?.label.toLowerCase() ?? range;
  const rawColorOf = new Map(incomeCategories.map((c) => [c.name, c.color]));
  const resolved = resolveDistinctColors(series.map((name) => ({ name, color: rawColorOf.get(name) ?? '#9A9DA3' })));
  const colorOf = new Map(resolved.map((r) => [r.name, r.color]));
  const color = (name: string) => colorOf.get(name) ?? '#9A9DA3';
  const { hidden, active, setActive, toggle } = chartSeries;

  return (
    <>
      <section className="mb-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">Income trend</h2>
          <button
            type="button"
            onClick={() => setManagingCategories(true)}
            className="rounded-md px-2 py-1.5 -my-1 text-[12px] text-faint hover:text-brand"
          >
            Categories
          </button>
        </div>
        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {series.length === 0 ? (
            <EmptyRow>No income in the selected {rangeLabel}.</EmptyRow>
          ) : (
            <div className="p-3">
              <ResponsiveContainer width="100%" height={200}>
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
                        stackId="incomes"
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

      {managingCategories && (
        <CategoriesModal
          categories={categories}
          incomeCategories={incomeCategories}
          currency={currency}
          initialKind="income"
          onChanged={onChanged}
          onClose={() => setManagingCategories(false)}
        />
      )}
    </>
  );
}
