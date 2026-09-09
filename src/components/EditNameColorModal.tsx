import { useEffect, useState } from 'react';
import type { AccountType } from '../types';
import { PALETTE } from '../lib/colors';
import { CURRENCIES } from '../lib/currency';
import { AccountTypePicker, IconPicker } from './Pickers';

export interface EditNameColorResult {
  name: string;
  color: string;
  currency: string;
  type: AccountType;
  icon: string;
}

/**
 * Shared by categories, income categories, and accounts — name and color are
 * always editable; `currencyField`/`typeField` (accounts) and `iconField`
 * (categories/income categories) are each optional sections, shown only when
 * the caller passes them, so one modal covers all three edit flows instead of
 * three near-duplicates. `onSave` gets a single result object rather than a
 * growing list of positional args, since this modal has picked up a new
 * optional field with each round of features.
 */
export function EditNameColorModal({
  title,
  initialName,
  initialColor,
  currencyField,
  typeField,
  iconField,
  onSave,
  onClose,
}: {
  title: string;
  initialName: string;
  initialColor: string;
  /** Accounts only. Locked once the account has any transaction — changing currency then would relabel real history. */
  currencyField?: { value: string; locked: boolean } | null;
  /** Accounts only. */
  typeField?: { value: AccountType } | null;
  /** Categories/income categories only. */
  iconField?: { value: string } | null;
  onSave: (result: EditNameColorResult) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [currency, setCurrency] = useState(currencyField?.value ?? '');
  const [type, setType] = useState<AccountType>(typeField?.value ?? 'other');
  const [icon, setIcon] = useState(iconField?.value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color, currency, type, icon });
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
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-raised p-5 shadow-pop"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-medium">{title}</h2>
          <button type="button" onClick={onClose} className="px-2 text-[15px] text-muted">
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
            placeholder="Name"
            aria-label="Name"
            autoFocus
            className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
          />

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

          {typeField && (
            <div>
              <span className="mb-1.5 block text-[12px] text-faint">Type</span>
              <AccountTypePicker value={type} onChange={setType} />
            </div>
          )}

          {iconField && (
            <div>
              <span className="mb-1.5 block text-[12px] text-faint">Icon</span>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          )}

          {currencyField && (
            <div>
              <span className="mb-1.5 block text-[12px] text-faint">Currency</span>
              {currencyField.locked ? (
                <p className="text-[13px] text-muted">
                  {currencyField.value} — locked because this account already has transactions.
                  Historical amounts stay correct only if the currency they were logged in never
                  changes.
                </p>
              ) : (
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Currency"
                  className="w-full rounded-lg border border-rule bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-brand"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
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
