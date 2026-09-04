import type { LedgerEntry } from './ledger';

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function ledgerToCsv(entries: LedgerEntry[]): string {
  const header = ['Date', 'Type', 'Name', 'Category / Source', 'Account', 'Note', 'Amount'];
  const rows = entries.map((e) => [
    e.date,
    e.type,
    e.name,
    e.detail ?? '',
    e.account ?? '',
    e.note,
    (e.amount / 100).toFixed(2),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
