export function Footer() {
  return (
    <footer className="mx-auto max-w-[1400px] border-t border-rule px-4 py-6 text-center text-[12px] text-faint safe-bottom sm:px-6">
      <p>
        © 2026 Finance Tracker. All rights reserved. ·{' '}
        <a
          href="mailto:stylishsurya35@gmail.com?subject=Finance%20Tracker%20feedback"
          className="text-muted underline decoration-rule underline-offset-2 hover:text-brand"
        >
          Found a bug or have a suggestion? Get in touch
        </a>{' '}
        ·{' '}
        <a
          href="https://suryatejamerugu.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-rule underline-offset-2 hover:text-brand"
        >
          Portfolio
        </a>{' '}
        ·{' '}
        <a href="/about" className="text-muted underline decoration-rule underline-offset-2 hover:text-brand">
          Guide
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
