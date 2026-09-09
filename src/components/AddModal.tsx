import { useEffect, useRef, useState } from 'react';
import type { Account, Category, Expense, Income, IncomeCategory, Transfer } from '../types';
import { parseAmount, todayISO } from '../lib/money';
import {
  addAccount,
  addCategory,
  addExpense,
  addIncome,
  addTransfer,
  updateExpense,
  updateIncome,
  updateTransfer,
} from '../lib/store';
import { PALETTE, suggestedColor } from '../lib/colors';
import { CURRENCIES, currencySymbol } from '../lib/currency';

export type AddKind = 'expense' | 'income' | 'transfer' | 'category' | 'account';

export const ADD_LABELS: Record<AddKind, string> = {
  expense: 'New expense',
  income: 'New income',
  transfer: 'New transfer',
  category: 'New category',
  account: 'New account',
};

const EDIT_LABELS: Record<AddKind, string> = {
  expense: 'Edit expense',
  income: 'Edit income',
  transfer: 'Edit transfer',
  category: 'Edit category',
  account: 'Edit account',
};

const field =
  'w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[15px] outline-none focus:border-brand';

/** The row being edited, when this is an edit rather than a create. */
export type EditingRow = Expense | Income | Transfer;

export function AddModal({
  kind,
  categories,
  accounts,
  incomeCategories,
  currency,
  editing,
  onClose,
  onSaved,
}: {
  kind: AddKind;
  categories: Category[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  /** The dashboard's current currency lens — the default for a new account, and the budget slot a new category's initial number is saved into. */
  currency: string;
  editing?: EditingRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(editing ? (editing.amount / 100).toFixed(2) : '');
  const [date, setDate] = useState(editing && 'date' in editing ? editing.date : todayISO());
  const [categoryId, setCategoryId] = useState(
    editing && kind === 'expense' ? ((editing as Expense).categoryId ?? '') : (categories[0]?.id ?? ''),
  );
  const [accountId, setAccountId] = useState(() => {
    if (editing) {
      if (kind === 'transfer') return (editing as Transfer).fromAccountId ?? '';
      return (editing as Expense | Income).accountId ?? '';
    }
    return accounts[0]?.id ?? '';
  });
  const [toAccountId, setToAccountId] = useState(() => {
    if (editing && kind === 'transfer') return (editing as Transfer).toAccountId ?? '';
    if (kind !== 'transfer') return '';
    const from = accounts[0];
    return accounts.find((a) => a.id !== from?.id && a.currency === from?.currency)?.id ?? '';
  });
  const [sourceId, setSourceId] = useState(
    editing && kind === 'income' ? ((editing as Income).sourceId ?? '') : (incomeCategories[0]?.id ?? ''),
  );
  const [text, setText] = useState(editing && kind === 'expense' ? ((editing as Expense).text ?? '') : '');
  const [color, setColor] = useState(() =>
    suggestedColor(kind === 'account' ? accounts.length : categories.length),
  );
  const [accountCurrency, setAccountCurrency] = useState(currency);
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const fromCurrency = kind === 'transfer' ? (accountById.get(accountId)?.currency ?? null) : null;
  const toAccounts = kind === 'transfer' ? accounts.filter((a) => !fromCurrency || a.currency === fromCurrency) : accounts;
  const rowCurrency = accountId ? (accountById.get(accountId)?.currency ?? currency) : currency;

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
    try {
      if (kind === 'expense') {
        const input = { name, amount: value, date, categoryId: categoryId || null, accountId: accountId || null, text };
        if (editing) await updateExpense(editing.id, input);
        else await addExpense(input);
      } else if (kind === 'income') {
        const input = { name, amount: value, date, accountId: accountId || null, sourceId: sourceId || null };
        if (editing) await updateIncome(editing.id, input);
        else await addIncome(input);
      } else if (kind === 'transfer') {
        if (accountId && accountId === toAccountId) {
          setError('From and To must be different accounts');
          return;
        }
        const input = {
          name,
          amount: value,
          date,
          fromAccountId: accountId || null,
          toAccountId: toAccountId || null,
        };
        if (editing) await updateTransfer(editing.id, input);
        else await addTransfer(input);
      } else if (kind === 'category') {
        await addCategory(name, value, color, currency);
      } else {
        await addAccount(name, value, color, accountCurrency);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
      return;
    }

    onSaved();
    onClose();
  }

  const title = editing ? EDIT_LABELS[kind] : ADD_LABELS[kind];
  const amountLabel =
    kind === 'category' ? `Monthly budget (${currency})` : kind === 'account' ? 'Initial amount' : 'Amount';
  const dated = kind === 'expense' || kind === 'income' || kind === 'transfer';
  const amountCurrency = kind === 'account' ? accountCurrency : kind === 'category' ? currency : rowCurrency;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-t-2xl bg-raised p-5 shadow-pop safe-bottom sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">{title}</h2>
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
            <span className="text-[15px] text-faint">{currencySymbol(amountCurrency)}</span>
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
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              aria-label="Source"
              className={field}
            >
              <option value="">No source</option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {(kind === 'expense' || kind === 'income' || kind === 'transfer') && (
            <select
              value={accountId}
              onChange={(e) => {
                const nextId = e.target.value;
                setAccountId(nextId);
                if (kind === 'transfer') {
                  const nextCurrency = accountById.get(nextId)?.currency;
                  const toCurrency = accountById.get(toAccountId)?.currency;
                  if (toAccountId && nextCurrency && toCurrency !== nextCurrency) setToAccountId('');
                }
              }}
              aria-label={kind === 'transfer' ? 'From account' : 'Account'}
              className={field}
            >
              <option value="">{kind === 'transfer' ? 'From account' : 'No account'}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {kind === 'transfer' ? `From: ${a.name} (${a.currency})` : a.name}
                </option>
              ))}
            </select>
          )}

          {kind === 'transfer' && (
            <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} aria-label="To account" className={field}>
              <option value="">To account</option>
              {toAccounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>To: {a.name} ({a.currency})</option>
                ))}
            </select>
          )}
          {kind === 'transfer' && fromCurrency && toAccounts.length <= 1 && (
            <p className="text-[12px] text-faint">
              No other {fromCurrency} account to transfer to yet — cross-currency transfers aren't
              supported directly. Log an expense here and an income on the other account instead.
            </p>
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

          {kind === 'account' && (
            <select
              value={accountCurrency}
              onChange={(e) => setAccountCurrency(e.target.value)}
              aria-label="Currency"
              className={field}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
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
          {editing ? 'Save changes' : 'Save'}
        </button>
      </div>
    </div>
  );
}
