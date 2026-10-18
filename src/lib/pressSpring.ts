import { Spring, SPRING } from './spring';

/**
 * Every `.press` element in the app (there's no per-component wiring — any
 * button gets this just by having the class) gets real spring-driven press
 * feedback from one delegated listener here, instead of each needing its own
 * pointer handlers. Down sets `--press-scale` toward 0.97 with a near-instant
 * spring ("respond on touch-down, in ~100ms" — principle 1); up/cancel
 * springs it back with the gentler default spring. Tracking by pointerId
 * (not by the pointerup event's target) means a drag that leaves the button
 * before release still releases the right element, and retargeting the same
 * Spring instance on a rapid double-tap carries its current velocity instead
 * of snapping — the "interruptible" principle applied to the simplest case.
 */
const springs = new WeakMap<HTMLElement, Spring>();

function springFor(el: HTMLElement): Spring {
  let s = springs.get(el);
  if (!s) {
    s = new Spring(1, (v) => el.style.setProperty('--press-scale', v.toFixed(4)));
    springs.set(el, s);
  }
  return s;
}

function findPressable(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>('.press');
  if (!el || el.hasAttribute('disabled') || (el as HTMLButtonElement).disabled) return null;
  return el;
}

export function attachPressSpring(): () => void {
  const activeByPointer = new Map<number, HTMLElement>();

  function down(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = findPressable(e.target);
    if (!el) return;
    activeByPointer.set(e.pointerId, el);
    springFor(el).set(0.97, SPRING.press);
  }

  function release(e: PointerEvent) {
    const el = activeByPointer.get(e.pointerId);
    if (!el) return;
    activeByPointer.delete(e.pointerId);
    springFor(el).set(1, SPRING.default);
  }

  document.addEventListener('pointerdown', down, { passive: true });
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });

  return () => {
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointerup', release);
    document.removeEventListener('pointercancel', release);
  };
}
