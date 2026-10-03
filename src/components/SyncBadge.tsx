import { useEffect, useState } from 'react';
import type { useSync } from '../hooks/useSync';
import { useFocusTrap } from '../hooks/useFocusTrap';

function ago(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Which Google account, and where it backs up to, used to be discoverable
 * only by hovering the badge for a title tooltip — easy to miss, and there
 * was no way to sign out or switch accounts from the UI at all even though
 * useSync() already exposes disconnect(). This turns the badge into a
 * disclosure that answers both questions and adds Switch account/Disconnect
 * actions — switching is also how you'd move everything on this device to a
 * new Google account, since nothing here is tied to the account beyond
 * which Drive it backs up to.
 */
export function SyncBadge({ sync }: { sync: ReturnType<typeof useSync> }) {
  const [open, setOpen] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!sync.configured) {
    return <span className="max-w-[9.5rem] truncate text-[12px] text-faint sm:max-w-none">Saved on this device</span>;
  }

  if (!sync.connected) {
    return (
      <button
        type="button"
        onClick={() => void sync.connect()}
        title="Backs up to a private, hidden folder inside whichever Google account you sign in with — it can't see or touch anything else in that Drive."
        className="max-w-[9.5rem] truncate rounded-lg border border-rule px-3 py-1 text-[12px] text-muted hover:border-brand hover:text-brand sm:max-w-none"
      >
        Back up to Drive
      </button>
    );
  }

  const label =
    sync.state === 'syncing'
      ? 'Saving…'
      : sync.state === 'error'
        ? sync.lastSync
          ? `Sync problem · saved ${ago(sync.lastSync)}`
          : 'Sync problem'
        : sync.lastSync
          ? `Saved ${ago(sync.lastSync)}`
          : 'Connected';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`block max-w-[9.5rem] truncate text-[12px] sm:max-w-none ${sync.state === 'error' ? 'text-over' : 'text-faint'} hover:text-muted`}
      >
        {label}
      </button>

      {/*
        A viewport-centered overlay rather than a popover anchored to this
        button — an `absolute right-0`-style panel measures itself against
        its own tiny anchor, which overflows off-screen the moment that
        anchor isn't near the real right edge (e.g. once the header wraps
        onto its own line on a narrow phone, this button can end up hard
        against the left edge instead). Centering in the viewport, the same
        pattern every other dialog in this app already uses, works the same
        regardless of where the button that opened it happens to sit.
      */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Backup account"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-raised p-5 text-left shadow-pop"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium">Backup account</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-2 -m-2 text-[16px] text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-faint">Signed in as</p>
            <p className="truncate text-[13.5px] font-medium">{sync.email ?? 'Unknown account'}</p>
            <p className="mt-2 text-[11.5px] text-faint">
              Backed up to a private, hidden folder inside this Google account's Drive — not a
              folder you pick, and not visible in that account's normal Drive file list.
            </p>
            {sync.error && (
              <>
                <p className="mt-2 text-[12px] text-over">{sync.error}</p>
                <p className="mt-1 text-[11.5px] text-faint">
                  Retrying automatically for a bit — nothing on this device is lost either way.
                  Tap Sync now to try immediately.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                void sync.syncNow();
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg border border-rule py-1.5 text-[12.5px] text-muted hover:border-brand hover:text-brand"
            >
              Sync now
            </button>

            <div className="mt-4 border-t border-rule pt-3">
              <p className="text-[11.5px] leading-relaxed text-faint">
                Want to use a different Google account, or hand this device off to someone else?{' '}
                <strong className="text-ink">Switch account</strong> signs out of this one and opens
                Google's sign-in so you can pick another — everything already on this device goes
                with you and uploads fresh to whichever account you choose next.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void sync.switchAccount();
                  }}
                  className="flex-1 rounded-lg border border-rule py-1.5 text-[12.5px] text-muted hover:border-brand hover:text-brand"
                >
                  Switch account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void sync.disconnect();
                    setOpen(false);
                  }}
                  className="flex-1 rounded-lg border border-rule py-1.5 text-[12.5px] text-over hover:border-over"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
