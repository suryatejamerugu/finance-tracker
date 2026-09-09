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
import { formatMoney, monthLabel, shortMonthLabel } from '../lib/money';
import { filterByCurrency, groupByPeriod, live, stackedByMonth } from '../lib/selectors';
import { resolveDistinctColors } from '../lib/colors';
import { softDelete } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { EmptyRow, GroupHeading, Panel } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';
import { IncomeCategoriesModal } from './IncomeCategoriesModal';
import { EditIcon } from './icons';

const TABS = ['Recent', 'Monthly', 'Yearly', 'Chart'] as const;
type Tab = (typeof TABS)[number];

export function IncomesPanel({
  incomes,
  accounts,
  incomeCategories,
  currency,
  homeCurrency,
  month,
  settings,
  onChanged,
  onEdit,
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
  onEdit: (income: Income) => void;
}) {
  const { locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const sourceById = new Map(incomeCategories.map((c) => [c.id, c]));
  const sourceName = new Map(incomeCategories.map((c) => [c.id, c.name]));
  const rows = filterByCurrency(live(incomes), accounts, currency, homeCurrency);
  const chartSeries = useSeriesInteraction();
  const [managingCategories, setManagingCategories] = useState(false);

  const Row = ({ i }: { i: Income }) => {
    const source = sourceById.get(i.sourceId ?? '');
    return (
    <div className="group flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
      {source && <IconBadge icon={iconFor(source.icon)} color={source.color} size={22} />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px]">{i.name}</div>
        <div className="truncate text-[12px] text-faint">
          {[sourceName.get(i.sourceId ?? ''), acctName.get(i.accountId ?? '')].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="num text-[14px] text-under">{money(i.amount)}</span>
        <button
          type="button"
          onClick={() => onEdit(i)}
          aria-label={`Edit ${i.name}`}
          className="text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          onClick={async () => {
            await softDelete('incomes', i.id);
            onChanged();
          }}
          aria-label={`Delete ${i.name}`}
          className="text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
        >
          ×
        </button>
      </div>
    </div>
    );
  };

  const render = (tab: Tab) => {
    if (tab === 'Chart') {
      const { data, series } = stackedByMonth(rows, month, 12, (i) => sourceName.get(i.sourceId ?? '') ?? null);
      const rawColorOf = new Map(incomeCategories.map((c) => [c.name, c.color]));
      const resolved = resolveDistinctColors(series.map((name) => ({ name, color: rawColorOf.get(name) ?? '#9A9DA3' })));
      const colorOf = new Map(resolved.map((r) => [r.name, r.color]));
      const color = (name: string) => colorOf.get(name) ?? '#9A9DA3';
      if (series.length === 0) return <EmptyRow>No income in the last 12 months.</EmptyRow>;
      const { hidden, active, setActive, toggle } = chartSeries;
      return (
        <div className="p-3">
          <ResponsiveContainer width="100%" height={240}>
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
      );
    }

    if (tab === 'Recent') {
      const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
      if (recent.length === 0) return <EmptyRow>No income logged yet.</EmptyRow>;
      return <div>{recent.map((i) => <Row key={i.id} i={i} />)}</div>;
    }

    const period = tab === 'Monthly' ? 'month' : 'year';
    const groups = groupByPeriod(rows, period).slice(0, period === 'month' ? 8 : 5);
    if (groups.length === 0) return <EmptyRow>No income logged yet.</EmptyRow>;

    return (
      <div>
        {groups.map(([key, group]) => (
          <div key={key}>
            <GroupHeading
              label={period === 'month' ? monthLabel(key, locale) : key}
              total={money(group.reduce((s, i) => s + i.amount, 0))}
            />
            {group.map((i) => <Row key={i.id} i={i} />)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Panel
        title="Incomes"
        tabs={TABS}
        action={
          <button
            type="button"
            onClick={() => setManagingCategories(true)}
            className="rounded-md px-2 py-0.5 text-[12px] text-faint hover:text-brand"
          >
            Categories
          </button>
        }
      >
        {render}
      </Panel>

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
