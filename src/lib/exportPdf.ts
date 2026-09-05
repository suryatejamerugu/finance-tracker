import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CategoryStatus } from '../types';
import type { LedgerEntry } from './ledger';
import type { MonthSummary } from './selectors';
import { formatMoney, monthLabel } from './money';

const BRAND: [number, number, number] = [91, 79, 232];

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

export function exportMonthPdf(opts: {
  month: string;
  currency: string;
  locale: string;
  summary: MonthSummary;
  categoryStatuses: CategoryStatus[];
  entries: LedgerEntry[];
}): void {
  const { month, currency, locale, summary, categoryStatuses, entries } = opts;
  const money = (c: number) => formatMoney(c, { currency, locale });
  const doc = new jsPDF() as DocWithTable;

  doc.setFontSize(16);
  doc.text(`Finance Tracker — ${monthLabel(month, locale)}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Income ${money(summary.income)}   Spent ${money(summary.spent)}   Net ${formatMoney(summary.net, { currency, locale, signed: true })}`,
    14,
    25,
  );

  autoTable(doc, {
    startY: 32,
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
}): void {
  const { title, currency, locale, entries } = opts;
  const doc = new jsPDF() as DocWithTable;

  const income = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
  const expense = entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
  const money = (c: number) => formatMoney(c, { currency, locale });

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${entries.length} transactions   In ${money(income)}   Out ${money(Math.abs(expense))}   Net ${formatMoney(income + expense, { currency, locale, signed: true })}`,
    14,
    25,
  );

  autoTable(doc, {
    startY: 32,
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
