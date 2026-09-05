import { useState } from 'react';
import type { useSync } from '../hooks/useSync';

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
 * disclosure that answers both questions and adds a Disconnect action.
 */
export function SyncBadge({ sync }: { sync: ReturnType<typeof useSync> }) {
  const [open, setOpen] = useState(false);

  if (!sync.configured) {
    return <span className="text-[12px] text-faint">Saved on this device</span>;
  }

  if (!sync.connected) {
    return (
      <button
        type="button"
        onClick={() => void sync.connect()}
        title="Backs up to a private, hidden folder inside whichever Google account you sign in with — it can't see or touch anything else in that Drive."
        className="rounded-full border border-rule px-3 py-1 text-[12px] text-muted hover:border-brand hover:text-brand"
      >
        Back up to Drive
      </button>
    );
  }

  const label =
    sync.state === 'syncing'
      ? 'Saving…'
      : sync.state === 'error'
        ? 'Sync problem'
        : sync.lastSync
          ? `Saved ${ago(sync.lastSync)}`
          : 'Connected';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`text-[12px] ${sync.state === 'error' ? 'text-over' : 'text-faint'} hover:text-muted`}
      >
        {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Backup account"
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-rule bg-raised p-3.5 text-left shadow-pop"
          >
            <p className="text-[11px] text-faint">Signed in as</p>
            <p className="truncate text-[13.5px] font-medium">{sync.email ?? 'Unknown account'}</p>
            <p className="mt-2 text-[11.5px] text-faint">
              Backed up to a private, hidden folder inside this Google account's Drive — not a
              folder you pick, and not visible in that account's normal Drive file list.
            </p>
            {sync.error && <p className="mt-2 text-[12px] text-over">{sync.error}</p>}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void sync.syncNow();
                  setOpen(false);
                }}
                className="flex-1 rounded-lg border border-rule py-1.5 text-[12.5px] text-muted hover:border-brand hover:text-brand"
              >
                Sync now
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
        </>
      )}
    </div>
  );
}
