import { useRef, useState } from 'react';
import { buildSnapshot, isSnapshot, replaceWithSnapshot } from '../lib/db';
import type { Snapshot } from '../types';

/**
 * Save and restore the whole database as a JSON file.
 *
 * Restore REPLACES everything, so it goes through a confirmation that states
 * exactly what is about to arrive and what is about to be lost. Silently
 * wiping someone's ledger because they clicked the wrong button is not an
 * acceptable failure mode.
 */
export function DataMenu({ onChanged }: { onChanged: () => void }) {
  const [pending, setPending] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function save() {
    const snapshot = await buildSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Backup saved to your downloads.');
  }

  async function stage(file: File) {
    setNotice(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isSnapshot(parsed)) {
        setNotice("That file isn't a Finance Tracker backup. Nothing was changed.");
        return;
      }
      setPending(parsed);
    } catch {
      setNotice("Couldn't read that file — it may not be valid JSON. Nothing was changed.");
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      await replaceWithSnapshot(pending);
      onChanged();
      setNotice(
        `Restored ${pending.expenses.length} expenses, ${pending.incomes.length} incomes, ` +
          `${pending.transfers.length} transfers.`,
      );
      setPending(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Restore failed. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  }

  const btn = 'rounded-lg border border-rule px-3 py-1.5 text-[13px] text-muted hover:border-brand hover:text-brand';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void save()} className={btn}>
          Save a backup file
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={btn}>
          Restore from a backup file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void stage(file);
            e.target.value = '';
          }}
        />
      </div>

      {notice && <p className="mt-2 text-[13px] text-muted">{notice}</p>}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm restore"
            className="w-full max-w-md rounded-2xl bg-raised p-5 shadow-pop"
          >
            <h2 className="text-[16px] font-medium">Replace everything with this backup?</h2>

            <p className="mt-2 text-[13.5px] text-muted">This file contains:</p>
            <ul className="num mt-1.5 space-y-0.5 text-[13.5px]">
              <li>{pending.expenses.length} expenses</li>
              <li>{pending.incomes.length} incomes</li>
              <li>{pending.transfers.length} transfers</li>
              <li>{pending.categories.length} categories</li>
              <li>{pending.accounts.length} accounts</li>
            </ul>

            <p className="mt-3 rounded-lg border border-rule bg-over-soft px-3 py-2 text-[13px] text-over">
              Everything currently on this device will be erased and replaced. If you have data you
              care about, cancel and save a backup first.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="press flex-1 rounded-lg border border-rule py-2.5 text-[14px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmRestore()}
                className="press flex-1 rounded-lg bg-over py-2.5 text-[14px] font-medium text-white shadow-card disabled:opacity-50"
              >
                {busy ? 'Restoring…' : 'Replace my data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
