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
import type { Account, Income, IncomeCategory, ISOMonth, Settings } from '../types';
import { shortMonthLabel } from '../lib/money';
import { filterByCurrency, live, stackedByMonth } from '../lib/selectors';
import { resolveDistinctColors } from '../lib/colors';
import { EmptyRow } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';
import { IncomeCategoriesModal } from './IncomeCategoriesModal';

/**
 * 12-month income-by-source trend — split out from what used to be
 * IncomesPanel's "Chart" tab. The Recent/Monthly/Yearly list views moved
 * into RecentActivity (recent, merged with expenses/transfers) and Full
 * History (everything else, with search and export); "Categories" (managing
 * income sources) stays here since this is still the one place income's own
 * settings live.
 */
export function IncomeTrend({
  incomes,
  accounts,
  incomeCategories,
  currency,
  homeCurrency,
  month,
  settings,
  onChanged,
}: {
  incomes: Income[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  /** The dashboard's current currency lens. */
  currency: string;
  homeCurrency: string;
  month: ISOMonth;
  settings: Settings;
  onChanged: () => void;
}) {
  const { locale } = settings;
  const sourceName = new Map(incomeCategories.map((c) => [c.id, c.name]));
  const rows = filterByCurrency(live(incomes), accounts, currency, homeCurrency);
  const chartSeries = useSeriesInteraction();
  const [managingCategories, setManagingCategories] = useState(false);

  const { data, series } = stackedByMonth(rows, month, 12, (i) => sourceName.get(i.sourceId ?? '') ?? null);
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
            className="rounded-md px-2 py-0.5 text-[12px] text-faint hover:text-brand"
          >
            Categories
          </button>
        </div>
        <div className="rounded-xl border border-rule bg-raised shadow-card card-hover">
          {series.length === 0 ? (
            <EmptyRow>No income in the last 12 months.</EmptyRow>
          ) : (
            <div className="p-3">
              <ResponsiveContainer width="100%" height={200}>
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
        <IncomeCategoriesModal
          categories={incomeCategories}
          onChanged={onChanged}
          onClose={() => setManagingCategories(false)}
        />
      )}
    </>
  );
}
