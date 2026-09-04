import type { Theme } from '../lib/theme';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule text-muted transition-colors hover:border-brand hover:text-brand"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M20.7 14.9a8.5 8.5 0 0 1-10.6-11 .6.6 0 0 0-.8-.8A9.7 9.7 0 1 0 21.5 15.7a.6.6 0 0 0-.8-.8Z" />
        </svg>
      )}
    </button>
  );
}
