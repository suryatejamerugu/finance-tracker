import { useState } from 'react';
import type { Account, Settings, Transfer } from '../types';
import { formatMoney, monthLabel } from '../lib/money';
import { groupByPeriod, live } from '../lib/selectors';
import { softDelete } from '../lib/store';
import { accountTypeMeta, IconBadge } from '../lib/icons';
import { EmptyRow, Panel, PeriodPicker } from './Panel';
import { EditIcon } from './icons';

const TABS = ['Recent Transfers', 'Monthly'] as const;
type Tab = (typeof TABS)[number];

export function TransfersPanel({
  transfers,
  accounts,
  currency,
  homeCurrency,
  settings,
  onChanged,
  onEdit,
}: {
  transfers: Transfer[];
  accounts: Account[];
  /** The dashboard's current currency lens. Transfers are always same-currency, so the "from" side settles it. */
  currency: string;
  homeCurrency: string;
  settings: Settings;
  onChanged: () => void;
  onEdit: (transfer: Transfer) => void;
}) {
  const { locale } = settings;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const acctName = new Map(accounts.map((a) => [a.id, a.name]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const rows = live(transfers).filter(
    (t) => ((t.fromAccountId && accountById.get(t.fromAccountId)?.currency) || homeCurrency) === currency,
  );
  const [monthlyKey, setMonthlyKey] = useState<string | null>(null);

  const Row = ({ t }: { t: Transfer }) => {
    const fromAccount = accountById.get(t.fromAccountId ?? '');
    return (
    <div className="group flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
      {fromAccount && <IconBadge icon={accountTypeMeta(fromAccount.type).icon} color={fromAccount.color} size={22} />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px]">{t.name}</div>
        <div className="truncate text-[12px] text-faint">
          {acctName.get(t.fromAccountId ?? '') ?? '—'} → {acctName.get(t.toAccountId ?? '') ?? '—'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="num text-[14px]">{money(t.amount)}</span>
        <button
          type="button"
          onClick={() => onEdit(t)}
          aria-label={`Edit ${t.name}`}
          className="text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
        >
          <EditIcon />
        </button>
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
  };

  const render = (tab: Tab) => {
    if (rows.length === 0) return <EmptyRow>No transfers yet.</EmptyRow>;

    if (tab === 'Recent Transfers') {
      const recent = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
      return <div>{recent.map((t) => <Row key={t.id} t={t} />)}</div>;
    }

    // Every month is reachable via the dropdown rather than by scrolling
    // past every month in between, so nothing is sliced off here.
    return (
      <PeriodPicker
        groups={groupByPeriod(rows, 'month')}
        selected={monthlyKey}
        onSelect={setMonthlyKey}
        labelOf={(key) => monthLabel(key, locale)}
        totalOf={(group) => money(group.reduce((s, t) => s + t.amount, 0))}
        renderRow={(t) => <Row key={t.id} t={t} />}
        emptyLabel="No transfers yet."
      />
    );
  };

  return (
    <Panel title="Transfers" tabs={TABS}>
      {render}
    </Panel>
  );
}
