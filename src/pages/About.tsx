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

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>;
}

/**
 * A note from the developer, not API docs — organized around the things
 * you're actually trying to do, in roughly the order you'd do them. Same
 * shell as the dashboard (App.tsx swaps this in for Dashboard by path), so
 * it inherits the same header, footer, and light/dark theme automatically.
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
          on Drive backup. Open the app in a different browser or a different device and you'll
          see a fresh, empty ledger — not an error, just a separate local copy.
        </p>
      </Section>

      <Section title="Add an expense">
        <p>Logging a purchase takes a few fields, all on one screen.</p>
        <Steps>
          <li>
            Click <Kbd>New expense</Kbd>.
          </li>
          <li>Give it a short name — "Groceries," "Coffee," whatever you'll recognize later.</li>
          <li>Enter the amount, date, category, and the account you paid from.</li>
          <li>
            Click <Kbd>Save</Kbd>.
          </li>
        </Steps>
        <p>
          Made a mistake? Every expense row — on the dashboard and in Full History — has an edit
          pencil, not just a delete button. Hover a row to see it.
        </p>
      </Section>

      <Section title="Record income">
        <p>Same shape as an expense, with a source instead of a category.</p>
        <Steps>
          <li>
            Click <Kbd>New income</Kbd>.
          </li>
          <li>Name it, enter the amount and date, pick a source (Salary, Freelance, etc.) and an account.</li>
          <li>
            Click <Kbd>Save</Kbd>.
          </li>
        </Steps>
        <p>
          Income sources are their own editable list — rename, recolor, or delete one from the{' '}
          <strong className="text-ink">Categories</strong> link above the Income trend chart.
        </p>
      </Section>

      <Section title="Transfer money">
        <p>A transfer moves money between two of your own accounts — it's never counted as spending or income.</p>
        <Steps>
          <li>
            Click <Kbd>New transfer</Kbd>.
          </li>
          <li>Pick a from-account and a to-account, then the amount.</li>
          <li>
            Click <Kbd>Save</Kbd>.
          </li>
        </Steps>
        <p>
          Both accounts need to share a currency — there's no exchange rate applied, so a transfer
          can't cross currencies. Moving money between an INR and a USD account isn't a transfer;
          log it as an expense on one and an income on the other for whatever amount actually
          landed.
        </p>
        <p>
          Paying off a credit card works the same way: a transfer from your bank account to the
          card account. See <strong className="text-ink">Understand credit-card balances</strong>{' '}
          below for what that does to the numbers.
        </p>
      </Section>

      <Section title="Set a monthly budget">
        <p>
          On the <strong className="text-ink">Budget</strong> card, each category has a small
          number field on the right. Type an amount and click elsewhere to save it — that's the
          category's monthly budget.
        </p>
        <p>
          A budget isn't tied to one month: once set, the same amount applies every month until
          you change it. There's no separate "reset" step, and nothing carries over from a month
          you came in under or over — unused budget is just yours to use however you want outside
          the budget system, and overspending doesn't shrink next month's number.
        </p>
        <p>
          A category with no budget set shows <span className="text-faint">no budget</span>{' '}
          instead of a percentage — spending still shows up on the dashboard and in charts, it's
          just not measured against a limit until you give it one.
        </p>
        <p>
          New categories (and income sources, from the Categories link above the Income trend
          chart) get a color from a 16-color palette and an icon guessed from the name you type —
          pick a different one from the icon picker if you'd rather. Two categories never end up
          visually indistinguishable in a chart even if they somehow share a stored color; the
          charts resolve that automatically. A budget is per currency, too: the same "Dining Out"
          category can carry a separate number for each currency you spend in.
        </p>
      </Section>

      <Section title="Manage accounts">
        <p>
          Click <Kbd>New account</Kbd>, name it, and pick a type — Checking, Savings, Credit Card,
          NRO, NRE, Loan, Investment, or Cash. Typing a name like "HDFC NRE" or "Chase Credit Card"
          pre-selects a sensible type automatically; change it if it guesses wrong.
        </p>
        <p>
          From the <strong className="text-ink">Accounts</strong> card, hover a row for a pencil
          (rename, recolor, change type or currency) and an × (delete — its past transactions stay
          in your history, just without an account name attached). Drag the grip handle to
          reorder. An account's currency locks once it has its first transaction, so a real
          historical amount can never get silently relabeled into a different currency.
        </p>
      </Section>

      <Section title="Understand credit-card balances">
        <p>For a credit-card account, the dashboard shows three different numbers — they answer three different questions.</p>
        <p>
          <strong className="text-ink">Owed</strong> is what you currently owe in total, right
          now — every charge minus every payment, for as long as you've had the account. This is
          the big number on the card.
        </p>
        <p>
          <strong className="text-ink">Available</strong> is your credit limit minus what you
          owe. Set the limit from the account's edit pencil; until you do, this reads "set a limit
          in edit" instead of guessing.
        </p>
        <p>
          <strong className="text-ink">This cycle</strong> is what's actually due by your next
          payment date — not everything you owe, just what was on your last statement, reduced by
          any payment you've made since. It needs a statement day and a payment due day (day of
          the month, set in the edit pencil) to appear at all. Once a statement is fully paid it
          reads "paid" instead of a due date; if the due date passes with a balance still
          outstanding, it reads "overdue" instead of quietly looking like a normal upcoming
          payment.
        </p>
        <p>
          A credit limit increase or decrease, or a partial payment, all just change these numbers
          directly — there's nothing extra to configure. If the owed amount ever looks wrong (most
          commonly: a card you set up before using this app had its starting balance entered under
          the old, unsigned convention), open its edit pencil and use{' '}
          <em>"Owed/available not matching your card? Set what you owe right now"</em> — type the
          actual balance from your bank's app, and everything recalculates from there. It doesn't
          touch any past expense, income, or transfer.
        </p>
      </Section>

      <Section title="Use USD and INR">
        <p>
          Each account has a fixed currency, set when you create it — a bank account in real life
          is always one currency, so this app treats it the same way. An expense or income you log
          against an account is automatically in that account's currency; nothing to pick each
          time you enter something.
        </p>
        <p>
          Once you have more than one currency across your accounts — USD and INR, say — a small
          switcher appears next to the month picker. It scopes the summary cards, the donut, the
          charts, and Recent Activity to one currency at a time, so nothing ever gets summed across
          currencies by accident. <strong className="text-ink">Full History</strong> and its
          exports are the exception — they show everything at once, each row in its own currency,
          with their own separate currency filter.
        </p>
        <p>
          There's no automatic exchange-rate conversion anywhere — every number stays exactly what
          you entered, in the currency you entered it in.
        </p>
      </Section>

      <Section title="Find a transaction">
        <p>
          <strong className="text-ink">Recent activity</strong> on the dashboard has its own
          All/Expenses/Income/Transfers filter for a quick look at what's recent.
        </p>
        <p>
          For anything further back, click <Kbd>Full history</Kbd> (or "View all transactions").
          It opens every expense, income, and transfer merged into one chronological table — search
          by name, category, or account, filter by type, and narrow to a date range.
          <strong className="text-ink"> More filters</strong> adds account, category, and a min/max
          amount range on top of that, for when you're hunting a specific charge in a long history.
        </p>
        <p>
          From there you can export what you're looking at:{' '}
          <strong className="text-ink">CSV</strong> downloads exactly the rows the filter
          currently shows. <strong className="text-ink">PDF</strong> gives you a couple of ways to
          get a report — a specific month's budget-vs-spend summary, or everything matching your
          current search/filter/date range as a plain transaction list.
        </p>
      </Section>

      <Section title="Back up and restore data">
        <p>
          Click the small backup icon in the header (next to the theme toggle) for{' '}
          <strong className="text-ink">Save a backup file</strong> and{' '}
          <strong className="text-ink">Restore from a backup file</strong> — a plain JSON file with
          everything in it. Worth doing before clearing your browser's site data, switching
          browsers, or moving to a new device, since none of that carries your local data over on
          its own.
        </p>
        <p>
          If you want the same numbers on your phone and your laptop, click{' '}
          <strong className="text-ink">"Back up to Drive"</strong> in the header and sign in with
          Google. It backs up to one hidden, private file inside <em>your own</em> Google Drive —
          not a folder you pick, not visible in your normal Drive file list, and the app can't see
          or touch anything else in your Drive. Sign in with the same Google account on another
          device and it pulls the same file down, merging changes rather than overwriting either
          side. Changes save automatically a couple of seconds after you make them — the badge in
          the header shows "Saving…" while that's in progress and "Saved just now" (or how long ago)
          once it's done, so you can tell at a glance whether the last thing you typed actually went
          up.
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
          Email the developer
        </a>
        .
      </p>
    </div>
  );
}
