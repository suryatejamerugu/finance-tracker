import type { Cents, ISODate, ISOMonth } from '../types';

/** '12.34' or '12' or '$12.34' -> 1234. Returns null if it isn't a number. */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[^0-9.\-]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function formatMoney(
  cents: Cents,
  opts: { currency?: string; locale?: string; showCents?: boolean; signed?: boolean } = {},
): string {
  const { currency = 'USD', locale = 'en-US', showCents = true, signed = false } = opts;
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(Math.abs(cents) / 100);
  if (signed && cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

/** Compact form for headline figures: $1,247 rather than $1,247.00. */
export function formatBig(cents: Cents, currency = 'USD', locale = 'en-US'): string {
  return formatMoney(cents, { currency, locale, showCents: false });
}

export function todayISO(): ISODate {
  const now = new Date();
  return toISODate(now);
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function monthOf(date: ISODate): ISOMonth {
  return date.slice(0, 7);
}

export function currentMonth(): ISOMonth {
  return todayISO().slice(0, 7);
}

export function shiftMonth(month: ISOMonth, delta: number): ISOMonth {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: ISOMonth, locale = 'en-US'): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function shortMonthLabel(month: ISOMonth, locale = 'en-US'): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short' });
}

export function dayLabel(date: ISODate, locale = 'en-US'): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Days elapsed and total, used to pace spending against the month. */
export function monthProgress(month: ISOMonth): { elapsed: number; total: number } {
  const [y, m] = month.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  const now = new Date();
  const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m;
  const elapsed = isCurrent ? now.getDate() : total;
  return { elapsed, total };
}

export function uid(): string {
  return crypto.randomUUID();
}
