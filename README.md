# Finance Tracker

A budget tracker that costs nothing to run, because it has no server. The app is
static files on a CDN. Your numbers live in your browser and, if you turn on
backup, in a hidden folder inside your own Google Drive.

Nobody else is holding your financial history. That is the entire point.

---

## What's here

- **Light and dark themes.** Follows the system by default; the toggle in the
  header pins an explicit choice to `localStorage` and applies it before
  first paint, so there's no flash of the wrong theme on reload.
- **Every category and account gets its own color automatically.** New rows
  cycle through a 16-color palette (`src/lib/colors.ts`) instead of all
  landing on the same grey, and you can override the pick with the swatch
  picker in the "New category" / "New account" form. That color is what
  shows up in the donut, the stacked bar charts, and the swatch next to the
  name everywhere else — one color per thing, everywhere that thing appears.
- **Charts are interactive, not just colored.** Hover a slice of the "This
  month" donut and its legend row highlights back, and vice versa. On the
  Expenses/Incomes "Chart" tab, click a legend entry to hide that series or
  hover it to dim the rest — useful once a category list gets long.
- **Accounts and categories can be deleted.** The gallery rows in "Accounts"
  and "Budget" both got an × on hover, same pattern as the ledger rows. It's
  a soft delete — the row disappears from the dashboard, and its past
  transactions stay in your ledger but show as "Uncategorised" (or lose the
  account name) rather than vanishing.
- **Full history.** The "Full history" button opens the three ledgers
  (Expenses, Incomes, Transfers) merged into one searchable, filterable,
  chronological table — the closest equivalent to opening a Notion database
  and seeing every row, rather than the capped Recent/Weekly/Monthly tabs.
- **Export.** From Full history: **Export CSV** downloads the currently
  filtered rows; **Export PDF** builds a one-page report for the selected
  month — headline numbers, the category/budget breakdown, and that month's
  transactions — using `jspdf` + `jspdf-autotable`.

---

## Run it locally

```bash
npm install
npm run dev
```

It works immediately with no Google account. Data is saved in IndexedDB on that
device. Set up the Google client ID below only when you want it to sync across
devices.

```bash
npm run build     # production build into dist/
npm test          # 35 assertions on the money and formula logic
```

---

## Turn on Drive backup

This takes about ten minutes in the Google Cloud console and never costs money.

1. **Create a project** at <https://console.cloud.google.com/projectcreate>.

2. **Enable the Drive API** — APIs & Services → Library → search "Google Drive
   API" → Enable.

3. **Configure the consent screen** — APIs & Services → OAuth consent screen.
   Choose **External**. Fill in an app name, your email, and a developer email.
   You do not need a privacy policy or homepage while the app is in testing.

4. **Add the scopes** — on the Scopes step, add:
   - `.../auth/userinfo.email`
   - `.../auth/drive.appdata`

   `drive.appdata` gives the app a private folder in the user's Drive. It
   **cannot** read, list, or touch any other file there — not even files this
   app created outside that folder. That restriction is enforced by Google, not
   by this code.

5. **Add yourself as a test user.** On the Audience/Test users step, add your own
   Google address. **You can add up to 100 test users with no verification and no
   review.** For personal use, and for handing it to friends, this is where you
   stop. See "Going public" below if you outgrow that.

6. **Create the credential** — APIs & Services → Credentials → Create
   credentials → **OAuth client ID** → Application type **Web application**.

   Under **Authorized JavaScript origins** add:
   ```
   http://localhost:5173
   https://your-site-name.netlify.app
   ```
   Leave "Authorized redirect URIs" empty. The token client doesn't use one.

7. **Copy the client ID into your env file:**
   ```bash
   cp .env.example .env
   # then edit .env and paste your ID
   ```

Restart `npm run dev`. A "Back up to Drive" button appears in the header.

---

## Deploy to Netlify

Same as any static site, with one extra step for the env var.

```bash
git init && git add -A && git commit -m "Finance Tracker"
# push to GitHub, then import the repo at app.netlify.com
```

`netlify.toml` already sets the build command, publish directory, and the SPA
redirect, so Netlify needs no configuration in the UI.

**One thing that is easy to miss:** `VITE_` variables are read at *build* time,
not runtime. Add `VITE_GOOGLE_CLIENT_ID` under Site configuration → Environment
variables, then **trigger a fresh deploy**. Adding the variable without
redeploying leaves the old bundle in place and sign-in stays broken.

Then add your real Netlify URL back to the Authorized JavaScript origins in step
6, or Google will reject sign-in from the deployed site.

---

## Bring your Notion data across

In Notion: open **Finance Tracker** → `•••` → **Export** → Markdown & CSV → turn on
**Include subpages** → unzip it.

```bash
node scripts/notion-import.mjs ./your-export-folder > backup.json
```

Then in the app: **Save a backup file** first if you have anything, then
**Restore from a backup file** and pick `backup.json`.

The importer finds all five CSVs by filename and relinks them. Notion's CSV
export writes relations as the related page's **title**, not its ID, so an
expense whose Category cell reads `Groceries` is matched back to the Groceries
category by name. Monthly Budget and Initial Amount carry across too.

Rows it can't read are **skipped and reported with line numbers** rather than
silently guessed at. Read that output.

Every amount is imported positive. Direction comes from which table a row is in,
the same as Notion. Check two or three account balances against Notion before
you trust the totals.

## How the pieces fit

```
src/
  types.ts                    the five Notion databases as TypeScript
  lib/money.ts                integer-cent parsing, formatting, month math
  lib/db.ts                   Dexie tables, snapshot build, row-level merge
  lib/selectors.ts            the Notion rollups and formulas, reimplemented
  lib/store.ts                every mutation, so updatedAt is always stamped
  lib/seed.ts                 starter categories and accounts
  lib/colors.ts               the categorical palette + auto-assignment
  lib/theme.ts                light/dark: read, apply, persist
  lib/ledger.ts                expenses + incomes + transfers, merged into one table
  lib/exportCsv.ts            CSV builder + browser download
  lib/exportPdf.ts            the month PDF report (jspdf + jspdf-autotable)
  sync/google.ts              GIS token client
  sync/drive.ts               appDataFolder read and write
  hooks/useSync.ts            debounced pull-then-push
  hooks/useTheme.ts           theme state, wired to lib/theme.ts
  components/Panel.tsx        panel shell with Notion-style view tabs
  components/ExpensesPanel    Recent · Weekly · Monthly · Chart
  components/IncomesPanel     Recent · Monthly · Yearly · Chart
  components/TransfersPanel   Recent Transfers · Monthly
  components/CategoryGallery  This Month · Last Month
  components/RightRail        donut chart + account balances
  components/AddModal         the five dashboard buttons + color picker
  components/LedgerView       Full history: search, filter, export
  components/ThemeToggle      the light/dark switch in the header
  components/Footer           copyright + portfolio link
  pages/Dashboard.tsx         the whole app, one page, three columns
tests/logic.test.mjs          35 assertions on the formulas
```

### Three tables, not one

Expenses, Incomes and Transfers are separate, exactly as in Notion. The first
version of this app collapsed them into one signed-amount table and it was
wrong: you lose `Source` on income, and you lose the two-sided account link on a
transfer, which is what makes the Balance formula work.

Every Amount is stored positive. Direction is carried by the table.

### The Notion formulas, reimplemented

| Notion | Here |
|---|---|
| `Expense This Month` (rollup) | sum of Expenses in the selected month |
| `Usage` (formula) | `Expense This Month / Monthly Budget` |
| `Balance` (formula) | `Initial + Income − Expenses + TransferIn − TransferOut` |

`Balance` is deliberately lifetime, not monthly — it ignores the month picker,
matching the Notion rollups. All of these are computed fresh on every render;
nothing derived is ever stored.

### Money is integer cents

`0.1 + 0.2 === 0.30000000000000004`. Notion stores dollars as floats; this app
converts at the boundary and does all arithmetic in cents.

### Sync merges rows, not files

Every record carries `updatedAt`, and deletes are soft. Pull happens before push
and records merge individually by timestamp, so the loser of a conflict is one
edited field rather than a day of entries.

### About the auth flow

An earlier plan for this app said PKCE. That was wrong for this shape of
application: Google will not issue a refresh token to a public client without a
secret, and a static site has nowhere to keep one. The GIS **token client** is
the supported path. It returns a one-hour access token which is refreshed
silently in the background.

The cost of that choice is real and worth knowing: clearing site data means
signing in again, and there is no background sync while the tab is closed.

---

## Going public

While the app is in testing you get 100 users and no review. If you want to hand
it to strangers, publishing the consent screen triggers a Google review because
Drive scopes are classified as sensitive. It is paperwork, not engineering — a
demo video and an explanation of why you need the scope — but budget a couple of
weeks for the round trip and do it before you promise anyone a launch date.

---

## Still to build

- Recurring expenses — Notion has a "Recurring Expense" template for this
- Editing a row after it's saved; right now you can add and delete
- Reordering categories and accounts (deleting is in; reordering isn't)
- A service worker, for genuine offline rather than just a cached shell
- Real PNG icons (`public/icon.svg` is currently the only one)
