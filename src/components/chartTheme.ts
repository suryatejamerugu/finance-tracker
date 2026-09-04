import { formatMoney } from '../lib/money';

export const AXIS = { fontSize: 11, fill: 'var(--color-faint)' } as const;

/**
 * Recharts 3 hands the formatter a number, a string, or an array of either, so
 * the callback has to accept all three even though every series here is
 * numeric dollars.
 */
type TooltipValue = number | string | readonly (number | string)[] | undefined;

export function chartTooltip(currency: string, locale: string) {
  return {
    formatter: (value: TooltipValue): string => {
      const n = Array.isArray(value) ? Number(value[0]) : Number(value);
      if (!Number.isFinite(n)) return '—';
      return formatMoney(n * 100, { currency, locale });
    },
    contentStyle: {
      background: 'var(--color-raised)',
      border: '1px solid var(--color-rule)',
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: 'var(--color-muted)' },
  };
}
