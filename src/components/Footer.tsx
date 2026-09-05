export function Footer() {
  return (
    <footer className="mx-auto max-w-[1400px] border-t border-rule px-4 py-6 text-center text-[12px] text-faint safe-bottom sm:px-6">
      <p>
        © 2026 Finance Tracker. All rights reserved. ·{' '}
        <a
          href="https://suryatejamerugu.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-rule underline-offset-2 hover:text-brand"
        >
          Portfolio
        </a>{' '}
        ·{' '}
        <a
          href="/privacy.html"
          className="text-muted underline decoration-rule underline-offset-2 hover:text-brand"
        >
          Privacy Policy
        </a>
      </p>
    </footer>
  );
}
