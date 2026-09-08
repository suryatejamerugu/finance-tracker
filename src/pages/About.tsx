function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-rule bg-raised p-5 shadow-card card-hover">
      <h2 className="mb-2 text-[15px] font-medium">{title}</h2>
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[12px] font-medium text-ink">
      {children}
    </span>
  );
}

/**
 * A note from the developer, not API docs — what this app is, how to actually
 * use it day to day, and the honest tradeoffs of the two ways it stores data.
 * Same shell as the dashboard (App.tsx swaps this in for Dashboard by path),
 * so it inherits the same header, footer, and light/dark theme automatically.
 */
export function About() {
  return (
    <div className="mx-auto max-w-[820px] px-4 pb-16 pt-6 sm:px-6">
      <h1 className="mb-1 text-[22px] font-semibold tracking-tight">Guide</h1>
      <p className="mb-6 text-[13.5px] text-faint">
        A note from the developer on what this is and how to use it — not a manual, just the
        things that aren't obvious from clicking around.
      </p>

      <Section title="What this actually is">
        <p>
          Finance Tracker is a static site with no backend. There's no server holding your
          numbers, no account to sign up for, and no company reading your spending. The app runs
          entirely in your browser.
        </p>
        <p>
          That has one real consequence worth understanding up front: your data lives{' '}
          <strong className="text-ink">on this device</strong>, in this browser, unless you turn
          on Drive backup (below). Open the app in a different browser or a different device and
          you'll see a fresh, empty ledger — not an error, just a separate local copy.
        </p>
      </Section>

      <Section title="Getting started">
        <p>
          The five buttons at the top — <Kbd>New expense</Kbd>, <Kbd>New income</Kbd>,{' '}
          <Kbd>New transfer</Kbd>, <Kbd>New category</Kbd>, <Kbd>New account</Kbd> — cover
          everything you log. A handful of starter categories and accounts are already there;
          rename, recolor, reorder or delete any of them from the <strong className="text-ink">Budget</strong> and{' '}
          <strong className="text-ink">Accounts</strong> cards — hover a row for a pencil (edit) and
          an × (delete), or drag the grip handle to reorder.
        </p>
        <p>
          If your ledger is completely empty, a banner offers to load a few months of sample data
          so you can see the budgets, charts, and history working before you type anything real —
          delete it later from Full history whenever you like.
        </p>
        <p>
          Already logged something and need to fix a name, amount, date, or category? Every row in
          the Expenses / Incomes / Transfers cards and in Full history has an edit pencil, not just
          delete.
        </p>
      </Section>

      <Section title="Categories, income sources, and colors">
        <p>
          Categories (for expenses) and income categories (for income) are separate lists, each
          with its own color, editable the same way. New ones cycle through a 16-color palette
          automatically; you can override the color from the swatch picker when creating one, or
          later from its edit pencil. Two categories can never end up visually indistinguishable in
          a chart even if they somehow share a stored color — the charts resolve that automatically.
        </p>
      </Section>

      <Section title="Full history, search, and export">
        <p>
          The <Kbd>Full history</Kbd> button opens every expense, income, and transfer merged into
          one chronological table — search by name, category, or account, filter by type, and
          narrow to a date range.
        </p>
        <p>
          From there you can export what you're looking at: <strong className="text-ink">CSV</strong>{' '}
          downloads exactly the rows the filter currently shows. <strong className="text-ink">PDF</strong>{' '}
          gives you a couple of ways to get a report — a specific month's budget-vs-spend summary,
          or everything matching your current search/filter/date range as a plain transaction
          list.
        </p>
      </Section>

      <Section title="Backing up locally">
        <p>
          Click the small backup icon in the header (next to the theme toggle) for{' '}
          <strong className="text-ink">Save a backup file</strong> and{' '}
          <strong className="text-ink">Restore from a backup file</strong> — a plain JSON file with
          everything in it. Worth doing before clearing your browser's site data, switching
          browsers, or moving to a new device, since none of that carries your local data over on
          its own.
        </p>
      </Section>

      <Section title="Syncing across devices with Google Drive">
        <p>
          If you want the same numbers on your phone and your laptop, click{' '}
          <strong className="text-ink">"Back up to Drive"</strong> in the header and sign in with
          Google. It backs up to one hidden, private file inside{' '}
          <em>your own</em> Google Drive — not a folder you pick, not visible in your normal Drive
          file list, and the app can't see or touch anything else in your Drive. Sign in with the
          same Google account on another device and it pulls the same file down, merging changes
          rather than overwriting either side.
        </p>
        <p>
          This app is early — if signing in shows an "unverified app" warning, that's Google
          flagging that the OAuth review hasn't finished (or hasn't been requested) yet, not a
          problem with your data. Depending on where things stand when you're reading this, you
          may need to be added as an approved tester first; the sync badge in the header will tell
          you plainly whether Drive backup is even configured for this deployment ("Saved on this
          device" means it isn't).
        </p>
        <p>
          None of this is required. Everything works fully offline, forever, without ever signing
          in — Drive only matters if you specifically want cross-device sync.
        </p>
      </Section>

      <Section title="Light and dark theme">
        <p>
          Follows your system setting by default. The sun/moon toggle in the header pins an
          explicit choice instead, remembered on this device.
        </p>
      </Section>

      <p className="mt-8 text-center text-[12.5px] text-faint">
        Still stuck, or something looks wrong?{' '}
        <a
          href="mailto:stylishsurya35@gmail.com?subject=Finance%20Tracker%20feedback"
          className="text-muted underline decoration-rule underline-offset-2 hover:text-brand"
        >
          Get in touch
        </a>
        .
      </p>
    </div>
  );
}
