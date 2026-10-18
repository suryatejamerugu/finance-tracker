import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Spring, SPRING, rubberBand } from '../lib/spring';

export type SheetVariant = 'dialog' | 'sheet';

const DIALOG_FROM_SCALE = 0.95;
const DISMISS_DISTANCE_RATIO = 0.3;
/** px/ms — a quick downward flick commits to dismiss even if it hasn't crossed the distance threshold yet. */
const DISMISS_VELOCITY = 0.6;

/**
 * The glass+spring shell every modal in the app is built on (see the 9
 * call sites). Two variants: `dialog` is a small centered card that fades
 * and scales in (settings forms, confirmations) — never draggable, that's
 * not how alerts behave on iOS either. `sheet` is a bottom sheet on mobile
 * (centered like a dialog at `sm:` and up) that slides up on open, and can
 * be dragged down to dismiss with real rubber-banding past the resting
 * position and velocity-based fling-to-commit — exactly the "iOS-style
 * sheet" interaction the redesign asked for.
 *
 * Closing is never instant: requestClose() lets the exit spring finish
 * (and, for a drag, carries its release velocity into that same spring)
 * before calling the real onClose prop that actually unmounts this — the
 * "interruptible, never jumps, never restarts" principle applied to a
 * dialog's own lifecycle, not just its content. `children` is a render
 * prop (gets `requestClose`) specifically so a modal's own Cancel/✕ button
 * can trigger that same animated close instead of calling the raw onClose
 * prop and skipping the exit spring entirely — a Save button that finishes
 * an async action and then calls its own onClose() is a deliberate
 * exception, since that's "task complete," not "never mind."
 *
 * Centralizes what all nine modals used to duplicate: the backdrop, the
 * focus trap, and the Escape-to-close handler.
 */
export function Sheet({
  onClose,
  ariaLabel,
  variant = 'dialog',
  surfaceClassName = 'w-full max-w-md',
  children,
}: {
  onClose: () => void;
  ariaLabel: string;
  variant?: SheetVariant;
  /** Sizing/layout classes for the surface — max-w-*, flex column, fixed heights, etc. */
  surfaceClassName?: string;
  children: (requestClose: () => void) => ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>();
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      surfaceRef.current = node;
      (trapRef as React.RefObject<HTMLDivElement | null>).current = node;
    },
    [trapRef],
  );

  const [dragEnabled, setDragEnabled] = useState(true);
  const springRef = useRef<Spring | null>(null);
  const measuredHeight = useRef(0);
  const closingRef = useRef(false);

  function applyDialog(progress: number) {
    const el = surfaceRef.current;
    if (el) {
      const scale = DIALOG_FROM_SCALE + (1 - DIALOG_FROM_SCALE) * progress;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = String(progress);
    }
    backdropRef.current?.style.setProperty('--backdrop-opacity', String(progress));
  }

  function applySheetY(y: number) {
    const el = surfaceRef.current;
    const height = measuredHeight.current || 1;
    if (el) {
      el.style.transform = `translateY(${y}px)`;
      el.style.opacity = '1';
    }
    backdropRef.current?.style.setProperty('--backdrop-opacity', String(Math.max(0, 1 - y / height)));
  }

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setDragEnabled(false);
    const spring = springRef.current;
    if (!spring) {
      onClose();
      return;
    }
    if (variant === 'sheet') {
      spring.set(measuredHeight.current || window.innerHeight, SPRING.sheet, { onSettle: onClose });
    } else {
      spring.set(0, SPRING.default, { onSettle: onClose });
    }
  }, [onClose, variant]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  // Measure, then spring the surface in from its resting-offscreen position.
  // Runs once per mount; StrictMode's dev-only double-invoke is harmless
  // here since each Spring instance owns and cancels its own rAF loop.
  useLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const height = el.getBoundingClientRect().height || window.innerHeight * 0.6;
    measuredHeight.current = height;

    if (variant === 'sheet') {
      const spring = new Spring(height, applySheetY);
      springRef.current = spring;
      applySheetY(height);
      spring.set(0, SPRING.sheet);
    } else {
      const spring = new Spring(0, applyDialog);
      springRef.current = spring;
      applyDialog(0);
      spring.set(1, SPRING.default);
    }
    return () => springRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const dragRef = useRef<{ startY: number; lastY: number; lastTime: number } | null>(null);

  function onGrabberPointerDown(e: React.PointerEvent) {
    if (!dragEnabled) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const now = performance.now();
    dragRef.current = { startY: e.clientY, lastY: e.clientY, lastTime: now };
    springRef.current?.stop();
  }

  function onGrabberPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const height = measuredHeight.current || 1;
    const raw = e.clientY - drag.startY;
    const y = raw < 0 ? rubberBand(raw, height * 0.4) : raw;
    drag.lastY = e.clientY;
    drag.lastTime = performance.now();
    if (springRef.current) springRef.current.value = y;
    applySheetY(y);
  }

  function onGrabberPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    const spring = springRef.current;
    dragRef.current = null;
    if (!drag || !spring) return;
    const dt = Math.max(1, performance.now() - drag.lastTime);
    const dy = e.clientY - drag.startY;
    const velocity = (e.clientY - drag.lastY) / dt; // px/ms, from the most recent sample
    const height = measuredHeight.current || 1;
    if (dy > height * DISMISS_DISTANCE_RATIO || velocity > DISMISS_VELOCITY) {
      closingRef.current = true;
      setDragEnabled(false);
      spring.set(height, SPRING.sheet, { velocity: velocity * 1000, onSettle: onClose });
    } else {
      spring.set(0, SPRING.sheet, { velocity: velocity * 1000 });
    }
  }

  return (
    <div
      ref={backdropRef}
      className={`sheet-backdrop fixed inset-0 z-50 flex justify-center p-0 sm:items-center sm:p-4 ${
        variant === 'sheet' ? 'items-end' : 'items-center'
      }`}
      onClick={requestClose}
    >
      <div
        ref={setRefs}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className={`glass-strong opacity-0 shadow-pop ${
          variant === 'sheet' ? 'rounded-t-3xl sm:rounded-3xl' : 'rounded-3xl'
        } ${surfaceClassName}`}
      >
        {variant === 'sheet' && (
          <div
            aria-hidden="true"
            onPointerDown={onGrabberPointerDown}
            onPointerMove={onGrabberPointerMove}
            onPointerUp={onGrabberPointerUp}
            onPointerCancel={onGrabberPointerUp}
            className="mx-auto mt-2 h-1.5 w-10 shrink-0 cursor-grab touch-none rounded-full bg-rule/50 active:cursor-grabbing sm:hidden"
          />
        )}
        {children(requestClose)}
      </div>
    </div>
  );
}
