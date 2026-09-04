import { useCallback, useState } from 'react';
import { formatMoney } from '../lib/money';

export const AXIS = { fontSize: 11, fill: 'var(--color-faint)' } as const;

/**
 * Shared hover/toggle state for a stacked chart's series, so the legend below
 * it acts like a filter — click a name to hide that series, hover one to dim
 * the rest — instead of being a static color key.
 */
export function useSeriesInteraction() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);

  const toggle = useCallback((name: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return { hidden, active, setActive, toggle };
}

/** A clickable, hoverable legend rendered under a chart — see useSeriesInteraction. */
export function InteractiveLegend({
  series,
  colorOf,
  hidden,
  active,
  onToggle,
  onHover,
}: {
  series: string[];
  colorOf: (name: string) => string;
  hidden: Set<string>;
  active: string | null;
  onToggle: (name: string) => void;
  onHover: (name: string | null) => void;
}) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 pb-1 pt-2 text-[11px]">
      {series.map((name) => {
        const isHidden = hidden.has(name);
        const dimmed = active !== null && active !== name;
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => onToggle(name)}
              onMouseEnter={() => onHover(name)}
              onMouseLeave={() => onHover(null)}
              aria-pressed={!isHidden}
              title={isHidden ? `Show ${name}` : `Hide ${name}`}
              className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity"
              style={{ opacity: isHidden ? 0.35 : dimmed ? 0.55 : 1 }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(name) }} aria-hidden="true" />
              <span
                className="text-muted"
                style={{ textDecoration: isHidden ? 'line-through' : 'none' }}
              >
                {name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
