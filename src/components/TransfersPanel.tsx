import type { Account, Settings, Transfer } from '../types';
import { formatMoney, monthLabel } from '../lib/money';
import { groupByPeriod, live } from '../lib/selectors';
import { softDelete } from '../lib/store';
import { EmptyRow, GroupHeading, Panel } from './Panel';

const TABS = ['Recent Transfers', 'Monthly'] as const;
type Tab = (typeof TABS)[number];

export function TransfersPanel({
  transfers,
  accounts,
  settings,
  onChanged,
}: {
  transfers: Transfer[];
  accounts: Account[];
  settings: Settings;
  onChanged: () => void;
}) {
  const { currency, locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const rows = live(transfers);

  const Row = ({ t }: { t: Transfer }) => (
    <div className="group flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[14px]">{t.name}</div>
        <div className="truncate text-[12px] text-faint">
          {acctName.get(t.fromAccountId ?? '') ?? '—'} → {acctName.get(t.toAccountId ?? '') ?? '—'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="num text-[14px]">{money(t.amount)}</span>
        <button
          type="button"
          onClick={async () => {
            await softDelete('transfers', t.id);
            onChanged();
          }}
          aria-label={`Delete ${t.name}`}
          className="text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
        >
          ×
        </button>
      </div>
    </div>
  );

  const render = (tab: Tab) => {
    if (rows.length === 0) return <EmptyRow>No transfers yet.</EmptyRow>;

    if (tab === 'Recent Transfers') {
      const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
      return <div>{recent.map((t) => <Row key={t.id} t={t} />)}</div>;
    }

    return (
      <div>
        {groupByPeriod(rows, 'month')
          .slice(0, 6)
          .map(([key, group]) => (
            <div key={key}>
              <GroupHeading
                label={monthLabel(key, locale)}
                total={money(group.reduce((s, t) => s + t.amount, 0))}
              />
              {group.map((t) => <Row key={t.id} t={t} />)}
            </div>
          ))}
      </div>
    );
  };

  return (
    <Panel title="Transfers" tabs={TABS}>
      {render}
    </Panel>
  );
}
