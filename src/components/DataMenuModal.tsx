import { useEffect } from 'react';
import { DataMenu } from './DataMenu';

/**
 * DataMenu (save/restore backup) used to live in a full-width section at the
 * bottom of the dashboard, adding a few hundred pixels of scroll to a page
 * that's mostly about that day's numbers. It's an account-level action, not a
 * this-month action, so it belongs behind a header button instead.
 */
export function DataMenuModal({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your data"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-raised p-5 shadow-pop"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium">Your data</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="px-1 text-[16px] text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mt-1.5 mb-4 text-[13px] text-muted">
          Everything lives on this device, and in your own Google Drive if you connected it. A
          backup file is the way to move it somewhere else, or to bring your Notion export in.
        </p>
        <DataMenu onChanged={onChanged} />
      </div>
    </div>
  );
}
