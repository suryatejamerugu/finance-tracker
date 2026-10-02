import { useEffect, useState } from 'react';
import type { Category, IncomeCategory } from '../types';
import { PALETTE, suggestedColor } from '../lib/colors';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { addCategory, addIncomeCategory, reorder, softDelete, updateCategory, updateIncomeCategory } from '../lib/store';
import { IconBadge, iconFor } from '../lib/icons';
import { guessCategoryIcon, guessIncomeIcon } from '../lib/iconGuess';
import { DragHandle, SortableList, SortableRow } from './dnd';
import { EditIcon } from './icons';
import { EditNameColorModal } from './EditNameColorModal';
import { IconPicker } from './Pickers';
import { EmptyRow } from './Panel';

type Kind = 'expense' | 'income';
/** The fields CategoriesModal actually touches — both Category and IncomeCategory satisfy this structurally. */
type Item = { id: string; name: string; icon: string; color: string; order: number };

/**
 * One place to create, rename, recolor, reorder, and delete both kinds of
 * category — expense (budget) and income (source) — instead of expense
 * management living on the Budget card and income management needing its
 * own separate trip. The "New category" button and the Budget card's
 * "Income sources" link both open this, defaulted to whichever kind makes
 * sense from where they were clicked.
 */
export function CategoriesModal({
  categories,
  incomeCategories,
  currency,
  initialKind = 'expense',
  onChanged,
  onClose,
}: {
  categories: Category[];
  incomeCategories: IncomeCategory[];
  /** A brand-new budget category is created unbudgeted (no amount typed here — that's the Budget card's job); this is only the currency slot a later budget would go into. */
  currency: string;
  initialKind?: Kind;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(() => suggestedColor(categories.length));
  const [newIcon, setNewIcon] = useState('tag');
  const [newIconTouched, setNewIconTouched] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items: Item[] = kind === 'expense' ? categories : incomeCategories;
  const ids = items.map((c) => c.id);

  function switchKind(next: Kind) {
    setKind(next);
    setNewName('');
    setNewColor(suggestedColor((next === 'expense' ? categories : incomeCategories).length));
    setNewIcon('tag');
    setNewIconTouched(false);
  }

  async function handleReorder(nextIds: string[]) {
    await reorder(kind === 'expense' ? 'categories' : 'incomeCategories', nextIds);
    onChanged();
  }

  async function add() {
    if (!newName.trim()) return;
    if (kind === 'expense') {
      await addCategory({ name: newName, budget: 0, color: newColor, currency, icon: newIcon });
    } else {
      await addIncomeCategory({ name: newName, color: newColor, icon: newIcon });
    }
    setNewName('');
    setNewColor(suggestedColor(items.length + 1));
    setNewIcon('tag');
    setNewIconTouched(false);
    onChanged();
  }

  async function remove(name: string, id: string) {
    const warning =
      kind === 'expense'
        ? `Delete "${name}"? Its past expenses stay in your ledger but will show as Uncategorised.`
        : `Delete "${name}"? Past income logged under it stays in your ledger but will show as Uncategorised.`;
    if (!window.confirm(warning)) return;
    await softDelete(kind === 'expense' ? 'categories' : 'incomeCategories', id);
    onChanged();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Categories"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-raised shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
            <h2 className="text-[15px] font-medium">Categories</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 -m-2 text-[16px] text-muted hover:text-ink"
            >
              ✕
            </button>
          </div>

          <div className="border-b border-rule px-5 pt-3">
            <div className="flex overflow-hidden rounded-lg border border-rule">
              {(['expense', 'income'] as const).map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchKind(t)}
                  aria-pressed={kind === t}
                  className={`flex-1 py-1.5 text-[13px] font-medium ${i > 0 ? 'border-l border-rule' : ''} ${
                    kind === t ? 'bg-brand text-paper' : 'bg-raised text-faint hover:text-muted'
                  }`}
                >
                  {t === 'expense' ? 'Budget categories' : 'Income sources'}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-rule px-5 py-3">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => {
                  const next = e.target.value;
                  setNewName(next);
                  if (!newIconTouched) setNewIcon(kind === 'expense' ? guessCategoryIcon(next) : guessIncomeIcon(next));
                }}
                onKeyDown={(e) => e.key === 'Enter' && void add()}
                placeholder={kind === 'expense' ? 'New category name' : 'New source name'}
                aria-label={kind === 'expense' ? 'New category name' : 'New income source name'}
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
            <div className="mt-2">
              <IconPicker
                value={newIcon}
                onChange={(k) => {
                  setNewIcon(k);
                  setNewIconTouched(true);
                }}
              />
            </div>
            {kind === 'expense' && (
              <p className="mt-2 text-[11.5px] text-faint">
                New categories start unbudgeted — set a monthly amount from the Budget card.
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <EmptyRow>{kind === 'expense' ? 'No categories yet.' : 'No income sources yet.'}</EmptyRow>
            ) : (
              <SortableList ids={ids} onReorder={handleReorder}>
                <div className="divide-y divide-rule">
                  {items.map((c) => (
                    <SortableRow key={c.id} id={c.id}>
                      {(handle) => (
                        <div className="group flex items-center gap-2 bg-raised px-5 py-2.5">
                          <DragHandle {...handle} />
                          <IconBadge icon={iconFor(c.icon)} color={c.color} size={20} />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.name}</span>
                          <button
                            type="button"
                            onClick={() => setEditing(c)}
                            aria-label={`Edit ${c.name}`}
                            className="p-2 -m-2 text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-brand"
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(c.name, c.id)}
                            aria-label={`Delete ${c.name}`}
                            className="p-2 -m-2 text-[14px] text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-over"
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
          title={kind === 'expense' ? 'Edit category' : 'Edit income source'}
          initialName={editing.name}
          initialColor={editing.color}
          iconField={{ value: editing.icon }}
          onClose={() => setEditing(null)}
          onSave={async ({ name, color, icon }) => {
            if (kind === 'expense') await updateCategory(editing.id, { name, color, icon });
            else await updateIncomeCategory(editing.id, { name, color, icon });
            onChanged();
          }}
        />
      )}
    </>
  );
}
