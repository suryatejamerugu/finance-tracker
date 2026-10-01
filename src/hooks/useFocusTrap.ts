import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab/Shift+Tab cycling inside a modal instead of leaking into the
 * page behind it — every dialog here closes on Escape and has aria-modal,
 * but neither of those actually traps focus on its own, so without this a
 * keyboard-only user tabbing through a form eventually lands back on the
 * header behind the backdrop. Returns a ref to attach to the dialog's
 * outermost element.
 *
 * Doesn't fight a field's own `autoFocus` — it only moves focus itself when
 * nothing inside the container is already focused when the effect runs.
 * Restores focus to whatever triggered the modal when it closes.
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

    if (!container.contains(document.activeElement)) {
      focusables()[0]?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // The container (and everything in it) may already be gone by the
      // time this runs — only reclaim focus if it's still a real, attached
      // element, so closing the modal doesn't silently drop focus to <body>.
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active]);

  return ref;
}
