import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Account, Income, ISOMonth, Settings } from '../types';
import { formatMoney, monthLabel, shortMonthLabel } from '../lib/money';
import { groupByPeriod, live, stackedByMonth } from '../lib/selectors';
import { softDelete } from '../lib/store';
import { EmptyRow, GroupHeading, Panel } from './Panel';
import { AXIS, chartTooltip, InteractiveLegend, useSeriesInteraction } from './chartTheme';

const TABS = ['Recent', 'Monthly', 'Yearly', 'Chart'] as const;
type Tab = (typeof TABS)[number];

/** One colour per Source, so the stacked chart is readable across months. */
const SOURCE_COLORS: Record<string, string> = {
  Salary: '#2F7A55',
  'Money Transfer': '#4C8FB5',
  'Debt Repayment': '#3B37C4',
  'Credit Rewards': '#9B5FA8',
  'Return / Refund Credits': '#B5734C',
  Dividend: '#5E8C6A',
  'Credit Limit Increased': '#7FA8C4',
  Splitwise: '#8A6A4F',
  Uncategorised: '#9A9DA3',
};

export function IncomesPanel({
  incomes,
  accounts,
  month,
  settings,
  onChanged,
}: {
  incomes: Income[];
  accounts: Account[];
  month: ISOMonth;
  settings: Settings;
  onChanged: () => void;
}) {
  const { currency, locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = live(incomes);
  const chartSeries = useSeriesInteraction();

  const Row = ({ i }: { i: Income }) => (
    <div className="group flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[14px]">{i.name}</div>
        <div className="truncate text-[12px] text-faint">
          {[i.source, acctName.get(i.accountId ?? '')].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="num text-[14px] text-under">{money(i.amount)}</span>
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

  const render = (tab: Tab) => {
    if (tab === 'Chart') {
      const { data, series } = stackedByMonth(rows, month, 12, (i) => i.source);
      const color = (name: string) => SOURCE_COLORS[name] ?? '#9A9DA3';
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
    <Panel title="Incomes" tabs={TABS}>
      {render}
    </Panel>
  );
}
