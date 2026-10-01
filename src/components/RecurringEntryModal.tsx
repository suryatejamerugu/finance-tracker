import { useEffect, useState } from 'react';
import type { Account, Category, IncomeCategory, RecurringEntry } from '../types';
import { PALETTE, suggestedColor } from '../lib/colors';
import { currencySymbol } from '../lib/currency';
import { parseAmount } from '../lib/money';
import { guessCategoryIcon, guessIncomeIcon } from '../lib/iconGuess';
import { addRecurringEntry, updateRecurringEntry } from '../lib/store';
import { IconPicker } from './Pickers';

/**
 * Create or edit a recurring template — name, expense/income, amount,
 * account, category or source, and day of month. No date field: a template
 * doesn't have one, only the period's computed due date does (see
 * upcomingBills() in selectors.ts).
 */
export function RecurringEntryModal({
  editing,
  existingCount,
  categories,
  accounts,
  incomeCategories,
  onChanged,
  onClose,
}: {
  editing: RecurringEntry | null;
  existingCount: number;
  categories: Category[];
  accounts: Account[];
  incomeCategories: IncomeCategory[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<'expense' | 'income'>(editing?.type ?? 'expense');
  const [amountInput, setAmountInput] = useState(editing ? (editing.amount / 100).toFixed(2) : '');
  const [accountId, setAccountId] = useState(editing?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [dayInput, setDayInput] = useState(editing ? String(editing.dayOfMonth) : '1');
  const [color, setColor] = useState(editing?.color ?? suggestedColor(existingCount));
  const [icon, setIcon] = useState(editing?.icon ?? 'repeat');
  const [iconTouched, setIconTouched] = useState(Boolean(editing));
  const [saving, setSaving] = useState(false);

  const accountCurrency = accounts.find((a) => a.id === accountId)?.currency ?? '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const amount = parseAmount(amountInput) ?? 0;
      const dayOfMonth = parseInt(dayInput, 10) || 1;
      const input = {
        name,
        type,
        amount,
        accountId: accountId || null,
        categoryId: categoryId || null,
        dayOfMonth,
        color,
        icon,
      };
      if (editing) {
        await updateRecurringEntry(editing.id, input);
      } else {
        await addRecurringEntry(input);
      }
      onChanged();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit recurring entry' : 'New recurring entry'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-raised p-5 shadow-pop"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">{editing ? 'Edit recurring entry' : 'New recurring entry'}</h2>
          <button type="button" onClick={onClose} className="px-2 text-[15px] text-muted">
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex overflow-hidden rounded-lg border border-rule">
            {(['expense', 'income'] as const).map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setCategoryId('');
                }}
                aria-pressed={type === t}
                className={`flex-1 py-1.5 text-[13px] font-medium ${i > 0 ? 'border-l border-rule' : ''} ${
                  type === t ? 'bg-brand text-white' : 'bg-raised text-faint hover:text-muted'
                }`}
              >
                {t === 'expense' ? 'Bill / expense' : 'Income'}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!iconTouched) setIcon(type === 'expense' ? guessCategoryIcon(next) : guessIncomeIcon(next));
            }}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            placeholder={type === 'expense' ? 'What bill is this?' : 'What income is this?'}
            aria-label="Name"
            autoFocus
            className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <span className="mb-1.5 block text-[12px] text-faint">Amount</span>
              <div className="flex items-baseline gap-2 rounded-lg border border-rule bg-paper px-3 py-2">
                <span className="text-[15px] text-faint">{currencySymbol(accountCurrency)}</span>
                <input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Amount"
                  className="num w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
                />
              </div>
            </div>
            <div className="w-24">
              <span className="mb-1.5 block text-[12px] text-faint">Day of month</span>
              <input
                value={dayInput}
                onChange={(e) => setDayInput(e.target.value)}
                inputMode="numeric"
                placeholder="1"
                aria-label="Day of month"
                className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[15px] outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] text-faint">Account</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="Account"
              className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] text-faint">{type === 'expense' ? 'Category' : 'Source'}</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label={type === 'expense' ? 'Category' : 'Source'}
              className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
            >
              <option value="">{type === 'expense' ? 'No category' : 'No source'}</option>
              {(type === 'expense' ? categories : incomeCategories).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

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

          <div>
            <span className="mb-1.5 block text-[12px] text-faint">Icon</span>
            <IconPicker
              value={icon}
              onChange={(k) => {
                setIcon(k);
                setIconTouched(true);
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={!name.trim() || saving}
          className="press mt-5 w-full rounded-lg bg-brand-gradient py-3 text-[15px] font-medium text-white shadow-card hover:shadow-card-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
