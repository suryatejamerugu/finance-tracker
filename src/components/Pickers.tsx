import { ACCOUNT_TYPES, ICON_OPTIONS } from '../lib/icons';
import type { AccountType } from '../types';

/** The open icon picker for categories and income categories — a grid of buttons, same interaction pattern as the color swatches next to it. */
export function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ICON_OPTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={label}
          aria-pressed={value === key}
          title={label}
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            value === key
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-rule text-muted hover:border-brand hover:text-brand'
          }`}
        >
          <Icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

/** Account type is a bounded list, so this shows the actual icon in each option rather than a plain text <select>. */
export function AccountTypePicker({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (type: AccountType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {ACCOUNT_TYPES.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] transition-colors ${
            value === v
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-rule text-muted hover:border-brand hover:text-brand'
          }`}
        >
          <Icon size={16} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
