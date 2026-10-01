export function HideBalancesToggle({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={hidden ? 'Show balances' : 'Hide balances'}
      title={hidden ? 'Show balances' : 'Hide balances'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule text-muted transition-colors hover:border-brand hover:text-brand"
    >
      {hidden ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4 10.5 7-0.6 1.1-1.5 2.4-2.7 3.5M6.2 6.2C4.1 7.5 2.5 9.4 1.5 12c1.5 3 5.5 7 10.5 7 1.4 0 2.7-0.3 3.9-0.8" />
          <path d="M9.9 10c-0.6 0.6-1 1.4-1 2.3 0 1.8 1.4 3.2 3.2 3.2 0.9 0 1.7-0.4 2.3-1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
