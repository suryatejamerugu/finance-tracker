import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CategoryStatus } from '../types';
import type { LedgerEntry } from './ledger';
import type { MonthSummary } from './selectors';
import { formatMoney, monthLabel } from './money';

const BRAND: [number, number, number] = [91, 79, 232];

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

/** Draws the shared masthead (title + generated/prepared-for line) and returns the Y to start the next block at. */
function drawHeader(doc: DocWithTable, title: string, userLabel?: string | null, subtitle?: string | null): number {
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(title, 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(140);
  const generated = `Generated ${new Date().toLocaleDateString()}`;
  doc.text(userLabel ? `${generated}  ·  Prepared for ${userLabel}` : generated, 14, 24);

  let y = 24;
  if (subtitle) {
    y = 29;
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(subtitle, 14, y);
  }
  return y + 7;
}

export function exportMonthPdf(opts: {
  month: string;
  currency: string;
  locale: string;
  summary: MonthSummary;
  categoryStatuses: CategoryStatus[];
  entries: LedgerEntry[];
  userLabel?: string | null;
}): void {
  const { month, currency, locale, summary, categoryStatuses, entries, userLabel } = opts;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const doc = new jsPDF() as DocWithTable;

  const headerY = drawHeader(doc, `Finance Tracker — ${monthLabel(month, locale)}`, userLabel);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Income ${money(summary.income)}   Spent ${money(summary.spent)}   Net ${formatMoney(summary.net, { currency, locale, signed: true })}`,
    14,
    headerY,
  );

  autoTable(doc, {
    startY: headerY + 7,
    head: [['Category', 'Spent', 'Budget', 'Usage']],
    body: categoryStatuses.map((s) => [
      s.category.name,
      money(s.expenseThisMonth),
      s.category.monthlyBudget > 0 ? money(s.category.monthlyBudget) : '—',
      s.category.monthlyBudget > 0 ? `${Math.round(s.usage * 100)}%` : '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND },
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY ?? 40) + 8,
    head: [['Date', 'Type', 'Name', 'Category / Account', 'Amount']],
    body: entries.map((e) => [
      e.date,
      e.type,
      e.name,
      e.detail ?? e.account ?? '',
      formatMoney(e.amount, { currency, locale, signed: true }),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND },
  });

  doc.save(`finance-tracker-${month}.pdf`);
}

/**
 * The month report above answers "how did this month go against budget?".
 * This answers "give me everything" — the same rows Full history is
 * currently showing (respecting its search/type filter), with no budget
 * breakdown since a mixed date range has no single month to budget against.
 */
export function exportLedgerPdf(opts: {
  title: string;
  currency: string;
  locale: string;
  entries: LedgerEntry[];
  userLabel?: string | null;
  /** Human-readable summary of the search/type/date filters applied, if any. */
  criteria?: string | null;
}): void {
  const { title, currency, locale, entries, userLabel, criteria } = opts;
  const doc = new jsPDF() as DocWithTable;

  const income = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
  const expense = entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
  const money = (c: number) => formatMoney(c, { currency, locale });

  const headerY = drawHeader(doc, title, userLabel, criteria ? `Filters: ${criteria}` : null);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${entries.length} transactions   In ${money(income)}   Out ${money(Math.abs(expense))}   Net ${formatMoney(income + expense, { currency, locale, signed: true })}`,
    14,
    headerY,
  );

  autoTable(doc, {
    startY: headerY + 7,
    head: [['Date', 'Type', 'Name', 'Category / Account', 'Amount']],
    body: entries.map((e) => [
      e.date,
      e.type,
      e.name,
      e.detail ?? e.account ?? '',
      formatMoney(e.amount, { currency, locale, signed: true }),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND },
  });

  doc.save(`finance-tracker-full-history.pdf`);
}
