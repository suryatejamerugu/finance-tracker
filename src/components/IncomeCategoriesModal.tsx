import { useEffect, useState } from 'react';
import type { IncomeCategory } from '../types';
import { PALETTE, suggestedColor } from '../lib/colors';
import { addIncomeCategory, reorder, softDelete, updateIncomeCategory } from '../lib/store';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditIcon } from './icons';
import { EditNameColorModal } from './EditNameColorModal';
import { EmptyRow } from './Panel';

/**
 * Income categories manage the same way expense Categories do (add, edit,
 * delete, drag to reorder) but there's no natural dashboard column for them
 * to live in — income has no budget to track. So it's all one self-contained
 * modal, opened from the Incomes panel's header action slot instead.
 */
export function IncomeCategoriesModal({
  categories,
  onChanged,
  onClose,
}: {
  categories: IncomeCategory[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(() => suggestedColor(categories.length));
  const [editing, setEditing] = useState<IncomeCategory | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ids = categories.map((c) => c.id);

  async function handleReorder(nextIds: string[]) {
    await reorder('incomeCategories', nextIds);
    onChanged();
  }

  async function add() {
    if (!newName.trim()) return;
    await addIncomeCategory(newName, newColor);
    setNewName('');
    setNewColor(suggestedColor(categories.length + 1));
    onChanged();
  }

  async function remove(name: string, id: string) {
    if (
      !window.confirm(
        `Delete "${name}"? Past income logged under it stays in your ledger but will show as Uncategorised.`,
      )
    )
      return;
    await softDelete('incomeCategories', id);
    onChanged();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Income categories"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-raised shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
            <h2 className="text-[15px] font-medium">Income categories</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="px-1 text-[16px] text-muted hover:text-ink"
            >
              ✕
            </button>
          </div>

          <div className="border-b border-rule px-5 py-3">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void add()}
                placeholder="New category name"
                aria-label="New income category name"
                className="min-w-0 flex-1 rounded-lg border border-rule bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() => void add()}
                disabled={!newName.trim()}
                className="press shrink-0 rounded-lg bg-brand-gradient px-3 py-1.5 text-[13px] font-medium text-white shadow-card disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setNewColor(swatch)}
                  aria-label={`Use color ${swatch}`}
                  aria-pressed={newColor === swatch}
                  className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: swatch,
                    boxShadow:
                      newColor === swatch ? `0 0 0 2px var(--color-raised), 0 0 0 4px ${swatch}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {categories.length === 0 ? (
              <EmptyRow>No income categories yet.</EmptyRow>
            ) : (
              <SortableList ids={ids} onReorder={handleReorder}>
                <div className="divide-y divide-rule">
                  {categories.map((c) => (
                    <SortableRow key={c.id} id={c.id}>
                      {(handle) => (
                        <div className="group flex items-center gap-2 bg-raised px-5 py-2.5">
                          <DragHandle {...handle} />
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: c.color }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.name}</span>
                          <button
                            type="button"
                            onClick={() => setEditing(c)}
                            aria-label={`Edit ${c.name}`}
                            className="text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(c.name, c.id)}
                            aria-label={`Delete ${c.name}`}
                            className="text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </SortableRow>
                  ))}
                </div>
              </SortableList>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <EditNameColorModal
          title="Edit income category"
          initialName={editing.name}
          initialColor={editing.color}
          onClose={() => setEditing(null)}
          onSave={async (name, color) => {
            await updateIncomeCategory(editing.id, name, color);
            onChanged();
          }}
        />
      )}
    </>
  );
}
