import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
function load(path) {
  const src = readFileSync(path, 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const req = (p) => p.startsWith('./') ? load(path.replace(/[^/]+$/, '') + p.slice(2) + '.ts') : createRequire(import.meta.url)(p);
  new Function('exports','require','module', out)(mod.exports, req, mod);
  return mod.exports;
}
const money = load(resolve(here, '../src/lib/money.ts'));
const sel = load(resolve(here, '../src/lib/selectors.ts'));

let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok?'PASS':'FAIL'}  ${n}${ok?'':`\n      got ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};

// --- money
eq('parseAmount "$1,234.56"', money.parseAmount('$1,234.56'), 123456);
eq('no float drift', money.parseAmount('0.1') + money.parseAmount('0.2'), 30);
eq('parseAmount garbage', money.parseAmount('abc'), null);
eq('formatBig', money.formatBig(124700), '$1,247');
eq('shiftMonth across year', money.shiftMonth('2026-01', -1), '2025-12');

const row = (o) => ({ updatedAt: 0, deleted: false, ...o });
const cat = (id, name, budget, order) => row({ id, name, monthlyBudget: budget, color:'#000', order });
const acct = (id, name, initial, order) => row({ id, name, initialAmount: initial, color:'#000', order });
const exp = (id, date, amount, categoryId, accountId) => row({ id, date, amount, categoryId, accountId, name:'e', text:'' });
const inc = (id, date, amount, accountId, source) => row({ id, date, amount, accountId, source, name:'i' });
const trf = (id, date, amount, from, to) => row({ id, date, amount, fromAccountId: from, toAccountId: to, name:'t' });

const categories = [cat('c1','Health & Self Care',10000,0), cat('c2','Dining Out/Coffee',0,1), cat('c3','Groceries',30000,2)];
const accounts = [acct('a1','BofA Checking',50000,0), acct('a2','SoFi Savings',0,1)];
const expenses = [
  exp('e1','2026-09-02',10044,'c1','a1'),
  exp('e2','2026-09-03',8800,'c2','a1'),
  exp('e3','2026-09-01',25000,'c3','a1'),
  exp('e4','2026-08-14',9000,'c1','a1'),   // LAST month
  exp('e5','2026-09-07',5000,'c3','a1'),   // deleted below
];
expenses[4].deleted = true;
const incomes = [inc('i1','2026-09-01',203000,'a1','Salary'), inc('i2','2026-08-15',203000,'a1','Salary')];
const transfers = [trf('t1','2026-09-02',25000,'a1','a2')];

// --- Notion: Expense This Month / Last Month / Usage
const st = sel.buildCategoryStatuses(categories, expenses, '2026-09');
const by = Object.fromEntries(st.map(s => [s.category.name, s]));
eq('Expense This Month (Health)', by['Health & Self Care'].expenseThisMonth, 10044);
eq('Expense Last Month (Health)', by['Health & Self Care'].expenseLastMonth, 9000);
eq('Usage 100.44/100 > 1', by['Health & Self Care'].usage > 1, true);
eq('Usage rounds to 100%', Math.round(by['Health & Self Care'].usage*100), 100);
eq('Health flagged over', by['Health & Self Care'].state, 'over');
eq('Dining no budget = unbudgeted', by['Dining Out/Coffee'].state, 'unbudgeted');
eq('Usage is 0 when no budget', by['Dining Out/Coffee'].usage, 0);
eq('deleted expense excluded', by['Groceries'].expenseThisMonth, 25000);

// --- Notion Balance formula: Initial + Income - Expenses + In - Out
const acs = sel.buildAccountStatuses(accounts, expenses, incomes, transfers);
const byA = Object.fromEntries(acs.map(a => [a.account.name, a]));
eq('BofA total income (all time)', byA['BofA Checking'].totalIncome, 406000);
eq('BofA total expenses (all time)', byA['BofA Checking'].totalExpenses, 10044+8800+25000+9000);
eq('BofA transferOut', byA['BofA Checking'].transferOut, 25000);
eq('BofA transferIn', byA['BofA Checking'].transferIn, 0);
eq('BofA Balance formula', byA['BofA Checking'].balance, 50000 + 406000 - 52844 - 25000);
eq('SoFi receives the transfer', byA['SoFi Savings'].balance, 25000);
eq('Balance ignores selected month', byA['BofA Checking'].totalIncome, 406000);

// --- month summary
const sum = sel.monthSummary(st, expenses, incomes, '2026-09');
eq('income this month only', sum.income, 203000);
eq('spent this month only', sum.spent, 10044+8800+25000);
eq('budgeted', sum.budgeted, 40000);
eq('net = income - spent', sum.net, 203000 - 43844);
eq('overspent count', sum.overspent, 1);
eq('unbudgeted count', sum.unbudgeted, 1);

// --- stacked chart
const { data, series } = sel.stackedByMonth(expenses, '2026-09', 3, e => e.categoryId);
eq('3 month buckets', data.length, 3);
eq('last bucket is target month', data[2].month, '2026-09');
eq('every series present in every bucket', data.every(d => series.every(s => typeof d[s] === 'number')), true);
eq('Aug bucket has only c1', data[1]['c1'], 90);
eq('deleted row not charted', data[2]['c3'], 250);

// --- donut
const donut = sel.donutByCategory(categories, expenses, '2026-09');
eq('donut sorted desc', donut.map(d=>d.name), ['Groceries','Health & Self Care','Dining Out/Coffee']);
eq('donut total matches spent', Math.round(donut.reduce((s,d)=>s+d.value,0)*100), 43844);

// --- grouping
const g = sel.groupByPeriod(expenses.filter(e=>!e.deleted), 'month');
eq('newest month group first', g[0][0], '2026-09');
eq('day grouping key width', sel.groupByPeriod(expenses.filter(e=>!e.deleted),'day')[0][0].length, 10);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
