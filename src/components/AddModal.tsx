import { useEffect, useRef, useState } from 'react';
import { INCOME_SOURCES, type Account, type Category, type IncomeSource } from '../types';
import { parseAmount, todayISO } from '../lib/money';
import { addAccount, addCategory, addExpense, addIncome, addTransfer } from '../lib/store';
import { PALETTE, suggestedColor } from '../lib/colors';

export type AddKind = 'expense' | 'income' | 'transfer' | 'category' | 'account';

export const ADD_LABELS: Record<AddKind, string> = {
  expense: 'New expense',
  income: 'New income',
  transfer: 'New transfer',
  category: 'New category',
  account: 'New account',
};

const field =
  'w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[15px] outline-none focus:border-brand';

export function AddModal({
  kind,
  categories,
  accounts,
  onClose,
  onSaved,
}: {
  kind: AddKind;
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [source, setSource] = useState<IncomeSource>('Salary');
  const [text, setText] = useState('');
  const [color, setColor] = useState(() =>
    suggestedColor(kind === 'account' ? accounts.length : categories.length),
  );
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needsAmount = true;
  const cents = parseAmount(amount);

  async function save() {
    if (!name.trim()) {
      setError('Give it a name first');
      first.current?.focus();
      return;
    }
    if (needsAmount && (cents === null || (cents === 0 && kind !== 'account' && kind !== 'category'))) {
      setError('Enter an amount');
      return;
    }

    const value = cents ?? 0;
    if (kind === 'expense') {
      await addExpense({ name, amount: value, date, categoryId: categoryId || null, accountId: accountId || null, text });
    } else if (kind === 'income') {
      await addIncome({ name, amount: value, date, accountId: accountId || null, source });
    } else if (kind === 'transfer') {
      if (accountId && accountId === toAccountId) {
        setError('From and To must be different accounts');
        return;
      }
      await addTransfer({ name, amount: value, date, fromAccountId: accountId || null, toAccountId: toAccountId || null });
    } else if (kind === 'category') {
      await addCategory(name, value, color);
    } else {
      await addAccount(name, value, color);
    }

    onSaved();
    onClose();
  }

  const amountLabel =
    kind === 'category' ? 'Monthly budget' : kind === 'account' ? 'Initial amount' : 'Amount';
  const dated = kind === 'expense' || kind === 'income' || kind === 'transfer';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ADD_LABELS[kind]}
        className="w-full max-w-md rounded-t-2xl bg-raised p-5 shadow-pop safe-bottom sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">{ADD_LABELS[kind]}</h2>
          <button type="button" onClick={onClose} className="px-2 text-[15px] text-muted">
            Cancel
          </button>
        </div>

        <div className="space-y-3">
          <input
            ref={first}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder={kind === 'transfer' ? 'What is this transfer for?' : 'Name'}
            aria-label="Name"
            className={field}
          />

          <div className="flex items-baseline gap-2 rounded-lg border border-rule bg-paper px-3 py-2">
            <span className="text-[15px] text-faint">$</span>
            <input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
              inputMode="decimal"
              placeholder="0.00"
              aria-label={amountLabel}
              className="num w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            <span className="shrink-0 text-[12px] text-faint">{amountLabel}</span>
          </div>

          {dated && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Date"
              className={field}
            />
          )}

          {kind === 'expense' && (
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category" className={field}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {kind === 'income' && (
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as IncomeSource)}
              aria-label="Source"
              className={field}
            >
              {INCOME_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {(kind === 'expense' || kind === 'income' || kind === 'transfer') && (
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label={kind === 'transfer' ? 'From account' : 'Account'} className={field}>
              <option value="">{kind === 'transfer' ? 'From account' : 'No account'}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {kind === 'transfer' ? `From: ${a.name}` : a.name}
                </option>
              ))}
            </select>
          )}

          {kind === 'transfer' && (
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} aria-label="To account" className={field}>
              <option value="">To account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>To: {a.name}</option>
              ))}
            </select>
          )}

          {kind === 'expense' && (
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              className={field}
            />
          )}

          {(kind === 'category' || kind === 'account') && (
            <div>
              <span className="mb-1.5 block text-[12px] text-faint">Color</span>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    aria-label={`Use color ${swatch}`}
                    aria-pressed={color === swatch}
                    className="h-6 w-6 shrink-0 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: swatch,
                      boxShadow:
                        color === swatch ? `0 0 0 2px var(--color-raised), 0 0 0 4px ${swatch}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[13px] text-over">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void save()}
          className="press mt-5 w-full rounded-lg bg-brand-gradient py-3 text-[15px] font-medium text-white shadow-card hover:shadow-card-hover"
        >
          Save
        </button>
      </div>
    </div>
  );
}
