import { useEffect, useState } from 'react';
import type { Account, SavingsGoal } from '../types';
import { PALETTE, suggestedColor } from '../lib/colors';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CURRENCIES, currencySymbol } from '../lib/currency';
import { parseAmount } from '../lib/money';
import { guessCategoryIcon } from '../lib/iconGuess';
import { addSavingsGoal, updateSavingsGoal } from '../lib/store';
import { IconPicker } from './Pickers';

/**
 * Create or edit a goal — name, target amount, currency, icon, color, and
 * (optionally) a linked account. Kept separate from AddModal (which already
 * covers five other kinds) since a goal has no category link, no date, and
 * its own "target amount" field; bolting it on there would mean yet another
 * kind-specific branch threaded through an already-long component.
 */
export function SavingsGoalModal({
  editing,
  existingCount,
  defaultCurrency,
  accounts,
  onChanged,
  onClose,
}: {
  editing: SavingsGoal | null;
  /** Used only for a new goal's default color, so it doesn't repeat an existing one. */
  existingCount: number;
  defaultCurrency: string;
  accounts: Account[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [amountInput, setAmountInput] = useState(
    editing ? (editing.targetAmount / 100).toFixed(2) : '',
  );
  const [savedInput, setSavedInput] = useState(
    editing && !editing.accountId ? (editing.savedAmount / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = useState(editing?.currency ?? defaultCurrency);
  const [accountId, setAccountId] = useState(editing?.accountId ?? '');
  const [color, setColor] = useState(editing?.color ?? suggestedColor(existingCount));
  const [icon, setIcon] = useState(editing?.icon ?? 'piggy-bank');
  const [iconTouched, setIconTouched] = useState(Boolean(editing));
  const [saving, setSaving] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const targetAmount = parseAmount(amountInput) ?? 0;
      const savedAmount = parseAmount(savedInput) ?? 0;
      const linkedAccount = accounts.find((a) => a.id === accountId);
      const effectiveCurrency = linkedAccount?.currency ?? currency;
      if (editing) {
        await updateSavingsGoal(editing.id, {
          name,
          targetAmount,
          currency: effectiveCurrency,
          color,
          icon,
          accountId: accountId || null,
          savedAmount,
        });
      } else {
        await addSavingsGoal({
          name,
          targetAmount,
          currency: effectiveCurrency,
          color,
          icon,
          accountId: accountId || null,
          savedAmount,
        });
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
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit goal' : 'New goal'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-raised p-5 shadow-pop"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">{editing ? 'Edit goal' : 'New goal'}</h2>
          <button type="button" onClick={onClose} className="px-2 text-[15px] text-muted">
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!iconTouched) setIcon(guessCategoryIcon(next));
            }}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            placeholder="What are you saving for?"
            aria-label="Goal name"
            autoFocus
            className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
          />

          <div>
            <span className="mb-1.5 block text-[12px] text-faint">Target amount</span>
            <div className="flex items-baseline gap-2 rounded-lg border border-rule bg-paper px-3 py-2">
              <span className="text-[15px] text-faint">{currencySymbol(currency)}</span>
              <input
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Target amount"
                className="num w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] text-faint">Link to an account</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="Link to an account"
              className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
            >
              <option value="">No account — track manually</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
              {accountId
                ? "Progress is derived from this account's balance, not typed in — see the goal's card for how."
                : "Leave unlinked to track progress by typing in a number yourself, like a budget."}
            </p>
          </div>

          {!accountId && (
            <div>
              <span className="mb-1.5 block text-[12px] text-faint">Saved so far</span>
              <div className="flex items-baseline gap-2 rounded-lg border border-rule bg-paper px-3 py-2">
                <span className="text-[15px] text-faint">{currencySymbol(currency)}</span>
                <input
                  value={savedInput}
                  onChange={(e) => setSavedInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Saved so far"
                  className="num w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
                />
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
                Cash, an envelope, a savings account you're not tracking here — however you're
                actually setting the money aside. Update this any time; it also has a quick inline
                field right on the goal's card.
              </p>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-[12px] text-faint">Currency</span>
            <select
              value={accountId ? (accounts.find((a) => a.id === accountId)?.currency ?? currency) : currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={Boolean(accountId)}
              aria-label="Currency"
              className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand disabled:opacity-60"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
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
