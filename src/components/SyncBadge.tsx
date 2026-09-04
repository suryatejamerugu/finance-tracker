import type { useSync } from '../hooks/useSync';

function ago(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SyncBadge({ sync }: { sync: ReturnType<typeof useSync> }) {
  if (!sync.configured) {
    return (
      <span className="text-[12px] text-faint">Saved on this device</span>
    );
  }

  if (!sync.connected) {
    return (
      <button
        type="button"
        onClick={() => void sync.connect()}
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
    <button
      type="button"
      onClick={() => void sync.syncNow()}
      title={sync.error ?? sync.email ?? ''}
      className={`text-[12px] ${sync.state === 'error' ? 'text-over' : 'text-faint'}`}
    >
      {label}
    </button>
  );
}
