import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CategoryStatus } from '../types';
import type { LedgerEntry } from './ledger';
import type { MonthSummary } from './selectors';
import { formatMoney, monthLabel } from './money';

const BRAND: [number, number, number] = [91, 79, 232];
const BRAND_2: [number, number, number] = [11, 122, 112];

/** The header's "FT" badge mark, redrawn in jsPDF's vector primitives rather than embedded as an image — crisp at any zoom, no asset to keep in sync with the in-app wordmark's own colors. */
function drawLogo(doc: jsPDF, x: number, y: number): void {
  doc.setFillColor(...BRAND);
  doc.roundedRect(x, y, 14, 14, 2.5, 2.5, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FT', x + 7, y + 9.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

/** Draws the shared masthead (logo + title + generated/prepared-for line) and returns the Y to start the next block at. */
function drawHeader(doc: DocWithTable, title: string, userLabel?: string | null, subtitle?: string | null): number {
  drawLogo(doc, 14, 10);
  const textX = 32;

  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(title, textX, 18);
  doc.setDrawColor(...BRAND_2);
  doc.setLineWidth(0.6);
  doc.line(textX, 20, textX + doc.getTextWidth(title), 20);

  doc.setFontSize(9);
  doc.setTextColor(140);
  const generated = `Generated ${new Date().toLocaleDateString()}`;
  doc.text(userLabel ? `${generated}  ·  Prepared for ${userLabel}` : generated, textX, 26);

  let y = 26;
  if (subtitle) {
    y = 31;
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(subtitle, textX, y);
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
    body: categoryStatuses.map((s) => {
      const budget = s.category.budgets[currency] ?? 0;
      return [
        s.category.name,
        money(s.expenseThisMonth),
        budget > 0 ? money(budget) : '—',
        budget > 0 ? `${Math.round(s.usage * 100)}%` : '—',
      ];
    }),
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
      formatMoney(e.amount, { currency: e.currency, locale, signed: true }),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND },
  });

  doc.save(`finance-tracker-${month}-${currency}.pdf`);
}

/**
 * The month report above answers "how did this month go against budget?".
 * This answers "give me everything" — the same rows Full history is
 * currently showing (respecting its search/type filter), with no budget
 * breakdown since a mixed date range has no single month to budget against.
 */
/**
 * Entries can span more than one currency (when Full history's own currency
 * filter is "All"), so summing raw cents across them would be meaningless —
 * instead each currency present gets its own In/Out/Net figure, and each
 * row in the table is formatted in its own currency.
 */
export function exportLedgerPdf(opts: {
  title: string;
  locale: string;
  entries: LedgerEntry[];
  userLabel?: string | null;
  /** Human-readable summary of the search/type/date filters applied, if any. */
  criteria?: string | null;
}): void {
  const { title, locale, entries, userLabel, criteria } = opts;
  const doc = new jsPDF() as DocWithTable;

  const byCurrency = new Map<string, { income: number; expense: number }>();
  for (const e of entries) {
    const bucket = byCurrency.get(e.currency) ?? { income: 0, expense: 0 };
    if (e.amount > 0) bucket.income += e.amount;
    else bucket.expense += e.amount;
    byCurrency.set(e.currency, bucket);
  }
  const summaryLine = [...byCurrency.entries()]
    .map(([cur, b]) => {
      const m = (c: number) => formatMoney(c, { currency: cur, locale });
      return `${cur} — In ${m(b.income)}  Out ${m(Math.abs(b.expense))}  Net ${formatMoney(b.income + b.expense, { currency: cur, locale, signed: true })}`;
    })
    .join('   |   ');

  const headerY = drawHeader(doc, title, userLabel, criteria ? `Filters: ${criteria}` : null);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${entries.length} transactions`, 14, headerY);
  doc.setFontSize(8.5);
  doc.text(summaryLine || 'No transactions', 14, headerY + 5);

  autoTable(doc, {
    startY: headerY + 11,
    head: [['Date', 'Type', 'Name', 'Category / Account', 'Amount']],
    body: entries.map((e) => [
      e.date,
      e.type,
      e.name,
      e.detail ?? e.account ?? '',
      formatMoney(e.amount, { currency: e.currency, locale, signed: true }),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND },
  });

  doc.save(`finance-tracker-full-history.pdf`);
}
