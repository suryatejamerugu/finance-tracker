import { Sheet } from './Sheet';
import { DataMenu } from './DataMenu';

/**
 * DataMenu (save/restore backup) used to live in a full-width section at the
 * bottom of the dashboard, adding a few hundred pixels of scroll to a page
 * that's mostly about that day's numbers. It's an account-level action, not a
 * this-month action, so it belongs behind a header button instead.
 */
export function DataMenuModal({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  return (
    <Sheet ariaLabel="Your data" onClose={onClose} surfaceClassName="w-full max-w-md p-5">
      {(requestClose) => (
      <>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium">Your data</h2>
          <button type="button" onClick={requestClose} aria-label="Close" className="p-2 -m-2 text-[16px] text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mt-1.5 mb-4 text-[13px] text-muted">
          Everything lives on this device, and in your own Google Drive if you connected it. A
          backup file is the way to move it somewhere else, or to bring your Notion export in.
        </p>
        <DataMenu onChanged={onChanged} />
      </>
      )}
    </Sheet>
  );
}
