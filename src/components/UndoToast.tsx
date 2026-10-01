import { useSyncExternalStore } from 'react';
import { dismissUndo, getUndoState, performUndo, subscribeUndo } from '../lib/undo';

/**
 * A single, app-wide "Undo" toast — every edit and delete in store.ts records
 * what it overwrote, and this is the one place that offers to put it back.
 * Mounted once in App.tsx so it floats above whatever modal or page is open.
 */
export function UndoToast({ onChanged }: { onChanged: () => void }) {
  const state = useSyncExternalStore(subscribeUndo, getUndoState);
  if (!state) return null;

  async function undo() {
    await performUndo();
    onChanged();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 safe-bottom">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-lg border border-rule bg-raised px-4 py-2.5 shadow-pop"
      >
        <span className="text-[13px] text-muted">{state.label}.</span>
        <button
          type="button"
          onClick={() => void undo()}
          className="text-[13px] font-medium text-brand hover:underline"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={dismissUndo}
          aria-label="Dismiss"
          className="text-[13px] text-faint hover:text-ink"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
