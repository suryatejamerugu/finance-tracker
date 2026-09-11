import { Mail } from 'lucide-react';

const navLink = 'text-muted transition-colors hover:text-brand';
const legalLink = 'text-faint transition-colors hover:text-muted';

/**
 * Used to be one dense, fully-underlined sentence — six links and the
 * copyright line all run together, which read as a stray rule at the bottom
 * of the page rather than a real section. Split into a brand line, a primary
 * nav row (feedback gets a pill so it doesn't just blend in), and a quieter
 * legal row underneath, the way the rest of the app separates "what you're
 * looking at" from "the fine print."
 */
export function Footer() {
  return (
    <footer className="border-t border-rule safe-bottom">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-5 px-4 py-7 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="text-center sm:text-left">
          <span className="text-[14px] font-semibold tracking-tight">
            <span className="text-brand-gradient">Finance</span> Tracker
          </span>
          <p className="mt-1 text-[11.5px] text-faint">© {new Date().getFullYear()} · All rights reserved.</p>
        </div>

        <nav aria-label="Footer" className="flex flex-col items-center gap-2.5 sm:items-end">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] sm:justify-end">
            <a href="/about" className={navLink}>Guide</a>
            <a href="https://suryatejamerugu.netlify.app/" target="_blank" rel="noopener noreferrer" className={navLink}>
              Portfolio
            </a>
            <a
              href="mailto:stylishsurya35@gmail.com?subject=Finance%20Tracker%20feedback"
              className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <Mail size={12} strokeWidth={1.8} aria-hidden="true" />
              Found a bug or have a suggestion?
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:justify-end">
            <a href="/privacy.html" className={legalLink}>Privacy Policy</a>
            <span aria-hidden="true" className="text-rule">·</span>
            <a href="/terms.html" className={legalLink}>Terms</a>
            <span aria-hidden="true" className="text-rule">·</span>
            <a href="/cookies.html" className={legalLink}>Cookies</a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
