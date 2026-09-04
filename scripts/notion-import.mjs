#!/usr/bin/env node
/**
 * Convert a Notion Finance Tracker CSV export into a backup file.
 *
 *   node scripts/notion-import.mjs ./notion-export > backup.json
 *
 * Point it at the folder Notion produced. It finds the five databases by
 * filename — Expenses, Incomes, Transfers, Categories, Accounts — and links
 * them back together by title, because Notion's CSV export writes relations as
 * the related page's *title*, not its ID.
 *
 * Export from Notion with: ••• → Export → Markdown & CSV → Include subpages.
 * Then open the app and choose "Restore from a backup file".
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/* ------------------------------- CSV parsing ------------------------------ */

/** RFC 4180. Notion quotes any field containing a comma. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Turn a CSV into objects keyed by lowercased header. */
function readTable(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? '').trim()));
    return obj;
  });
}

/**
 * Notion's "Markdown & CSV" export (with Include subpages on) writes a relation
 * cell as `Title (relative/path/to/page.md)` rather than a bare title. Left
 * alone, that whole string becomes the name and every account and category gets
 * silently duplicated — one clean record from its own table, one path-suffixed
 * record from the relation cells — which splits balances in half.
 */
function relationTitle(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/\s*\([^()]*\.md\)/g, '')
    .trim();
}

const pick = (obj, ...names) => {
  for (const n of names) {
    const key = n.toLowerCase();
    if (obj[key] !== undefined && obj[key] !== '') return obj[key];
  }
  return '';
};

/* ------------------------------- Conversion ------------------------------- */

/** "$1,234.56", "(45.00)" and bare numbers all land as integer cents. */
function toCents(raw) {
  if (!raw) return 0;
  let s = String(raw).trim();
  let negative = s.startsWith('(') && s.endsWith(')');
  if (negative) s = s.slice(1, -1);
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/[^0-9.]/g, '');
  if (!s) return 0;
  const value = Number(s);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) * (negative ? -1 : 1);
}

/** Notion writes "September 3, 2026" or "2026-09-03" depending on format. */
function toISODate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SOURCES = [
  'Salary',
  'Money Transfer',
  'Debt Repayment',
  'Credit Rewards',
  'Return / Refund Credits',
  'Dividend',
  'Credit Limit Increased',
  'Splitwise',
];

const PALETTE = [
  '#3B37C4', '#2F7A55', '#C0654B', '#9B5FA8', '#4C8FB5',
  '#B5734C', '#6E63D8', '#5E8C6A', '#7FA8C4', '#4F6D8C', '#8A8F98',
];

/* --------------------------------- Driver --------------------------------- */

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));

/**
 * Rows with no Date are skipped by default. That is safe for expenses and
 * incomes, but NOT for transfers: Balance is a lifetime figure, so a dropped
 * transfer leaves both of its accounts wrong forever. `--undated=YYYY-MM-DD`
 * imports them on a stand-in date so the balances reconcile; fix the real dates
 * in the app afterwards.
 */
const undatedFlag = args.find((a) => a.startsWith('--undated='));
const UNDATED = undatedFlag ? undatedFlag.split('=')[1] : null;
if (UNDATED && !/^\d{4}-\d{2}-\d{2}$/.test(UNDATED)) {
  console.error('--undated needs a date like --undated=2026-01-01');
  process.exit(1);
}

if (!dir) {
  console.error('Usage: node scripts/notion-import.mjs <notion-export-folder> [--undated=YYYY-MM-DD] > backup.json');
  process.exit(1);
}

/** Notion names files like "Expenses 306de7d9....csv". Match on the prefix. */
function findCsv(root, name) {
  const hits = [];
  const walk = (p) => {
    for (const entry of readdirSync(p)) {
      const full = join(p, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.toLowerCase().endsWith('.csv') && entry.toLowerCase().startsWith(name)) {
        hits.push(full);
      }
    }
  };
  walk(root);
  // "Expenses.csv" beats "Expenses_all.csv"; shortest name is the main export.
  return hits.sort((a, b) => a.length - b.length)[0] ?? null;
}

const paths = {
  expenses: findCsv(dir, 'expenses'),
  incomes: findCsv(dir, 'incomes'),
  transfers: findCsv(dir, 'transfers'),
  categories: findCsv(dir, 'categories'),
  accounts: findCsv(dir, 'accounts'),
};

for (const [name, p] of Object.entries(paths)) {
  console.error(p ? `found ${name}: ${p}` : `no ${name}.csv found — that table will be empty`);
}
if (!paths.expenses && !paths.incomes) {
  console.error('\nNeither Expenses nor Incomes was found. Is this the right folder?');
  process.exit(1);
}

const now = Date.now();
const accounts = new Map(); // name -> record
const categories = new Map();

/**
 * Look up or create an account, returning the RECORD (not just the id) so the
 * caller never has to re-derive the map key. Re-deriving it was the original
 * bug here: the key was stored one way and looked up another, so any name that
 * normalised differently came back undefined.
 *
 * No comma-splitting. Expense.Account, Income.Accounts and Expense.Category are
 * all single relations (limit 1) in this Notion schema, so a comma in a cell is
 * part of the name, not a separator.
 */
function upsertAccount(name) {
  const clean = (name || '').trim();
  if (!clean) return null;
  if (!accounts.has(clean)) {
    accounts.set(clean, {
      id: randomUUID(),
      name: clean,
      initialAmount: 0,
      color: PALETTE[accounts.size % PALETTE.length],
      order: accounts.size,
      updatedAt: now,
      deleted: false,
    });
  }
  return accounts.get(clean);
}

const accountId = (name) => upsertAccount(name)?.id ?? null;

function upsertCategory(name) {
  const clean = (name || '').trim();
  if (!clean) return null;
  if (!categories.has(clean)) {
    categories.set(clean, {
      id: randomUUID(),
      name: clean,
      monthlyBudget: 0,
      color: PALETTE[categories.size % PALETTE.length],
      order: categories.size,
      updatedAt: now,
      deleted: false,
    });
  }
  return categories.get(clean);
}

const categoryId = (name) => upsertCategory(name)?.id ?? null;

// Seed the lookup tables first so budgets and initial amounts survive.
if (paths.categories) {
  for (const r of readTable(paths.categories)) {
    const record = upsertCategory(relationTitle(pick(r, 'category', 'name')));
    if (!record) continue;
    record.monthlyBudget = Math.abs(toCents(pick(r, 'monthly budget', 'budget')));
  }
}
if (paths.accounts) {
  for (const r of readTable(paths.accounts)) {
    const record = upsertAccount(relationTitle(pick(r, 'account', 'name')));
    if (!record) continue;
    record.initialAmount = toCents(pick(r, 'initial amount', 'initial'));
  }
}

const expenses = [];
const incomes = [];
const transfers = [];
const skipped = [];

if (paths.expenses) {
  readTable(paths.expenses).forEach((r, i) => {
    const date = toISODate(pick(r, 'date')) ?? UNDATED;
    const amount = Math.abs(toCents(pick(r, 'amount')));
    if (!date || amount === 0) {
      skipped.push(`Expenses line ${i + 2}: ${!date ? 'unreadable date' : 'zero or unreadable amount'}`);
      return;
    }
    expenses.push({
      id: randomUUID(),
      name: pick(r, 'expense', 'name') || 'Expense',
      amount,
      date,
      categoryId: categoryId(relationTitle(pick(r, 'category'))),
      accountId: accountId(relationTitle(pick(r, 'account'))),
      text: pick(r, 'text', 'note'),
      updatedAt: now,
      deleted: false,
    });
  });
}

if (paths.incomes) {
  readTable(paths.incomes).forEach((r, i) => {
    const date = toISODate(pick(r, 'date')) ?? UNDATED;
    const amount = Math.abs(toCents(pick(r, 'amount')));
    if (!date || amount === 0) {
      skipped.push(`Incomes line ${i + 2}: ${!date ? 'unreadable date' : 'zero or unreadable amount'}`);
      return;
    }
    const raw = pick(r, 'source');
    incomes.push({
      id: randomUUID(),
      name: pick(r, 'income', 'name') || 'Income',
      amount,
      date,
      accountId: accountId(relationTitle(pick(r, 'accounts', 'account'))),
      source: SOURCES.find((s) => s.toLowerCase() === raw.toLowerCase()) ?? null,
      updatedAt: now,
      deleted: false,
    });
  });
}

if (paths.transfers) {
  readTable(paths.transfers).forEach((r, i) => {
    const date = toISODate(pick(r, 'date')) ?? UNDATED;
    const amount = Math.abs(toCents(pick(r, 'amount')));
    if (!date || amount === 0) {
      skipped.push(`Transfers line ${i + 2}: ${!date ? 'unreadable date' : 'zero or unreadable amount'}`);
      return;
    }
    transfers.push({
      id: randomUUID(),
      name: pick(r, 'transactions', 'name') || 'Transfer',
      amount,
      date,
      fromAccountId: accountId(relationTitle(pick(r, 'from account', 'from'))),
      toAccountId: accountId(relationTitle(pick(r, 'to account', 'to'))),
      updatedAt: now,
      deleted: false,
    });
  });
}

process.stdout.write(
  JSON.stringify(
    {
      schemaVersion: 2,
      exportedAt: now,
      accounts: [...accounts.values()],
      categories: [...categories.values()],
      expenses,
      incomes,
      transfers,
      settings: { id: 'settings', currency: 'USD', locale: 'en-US', updatedAt: now },
    },
    null,
    2,
  ),
);

console.error(
  `\n${expenses.length} expenses · ${incomes.length} incomes · ${transfers.length} transfers` +
    ` · ${categories.size} categories · ${accounts.size} accounts`,
);
if (skipped.length) {
  console.error(`\nSkipped ${skipped.length} rows:`);
  for (const s of skipped.slice(0, 12)) console.error(`  ${s}`);
  if (skipped.length > 12) console.error(`  ...and ${skipped.length - 12} more`);

  const lostTransfers = skipped.filter((s) => s.startsWith('Transfers')).length;
  if (lostTransfers > 0 && !UNDATED) {
    console.error(
      `\n  WARNING: ${lostTransfers} skipped transfers means those account balances` +
        `\n  will NOT match Notion. Balance counts every transfer regardless of date.` +
        `\n  Either add the dates in Notion and re-export, or re-run with` +
        `\n  --undated=2026-01-01 to bring them in on a stand-in date.`,
    );
  }
}

// A name that appears only in relation cells and never in its own table usually
// means a spelling mismatch that would split one real account into two.
const orphanAccounts = [...accounts.values()].filter((a) => a.initialAmount === 0);
if (orphanAccounts.length > 0 && paths.accounts) {
  console.error(`\n${orphanAccounts.length} accounts have no Initial Amount — check for duplicates:`);
  for (const a of orphanAccounts.slice(0, 10)) console.error(`  ${JSON.stringify(a.name)}`);
}
console.error(
  '\nAll amounts imported as positive; direction comes from which table a row is in.' +
    '\nCheck a few account balances against Notion before you trust the totals.',
);
