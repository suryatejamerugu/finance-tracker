/**
 * A real damped-harmonic-oscillator spring, parametrized the way Apple's own
 * APIs are (response + dampingFraction) rather than duration + easing curve —
 * see the cheat sheet this app's "Apple glass" redesign was built from:
 * default UI motion is damping 1.0 (critically damped, no overshoot),
 * drawers/sheets are damping ~0.8 (a gentle bounce on settle). A fixed-
 * duration CSS curve can't do two things this needs: carry a gesture's
 * release velocity into the animation, or retarget mid-flight from whatever
 * position/speed it's already at instead of restarting from zero.
 */
export interface SpringConfig {
  response: number;
  dampingFraction: number;
}

export const SPRING = {
  /** Apple cheat sheet: "Default UI" — damping 1.0, response 0.3-0.4. */
  default: { response: 0.35, dampingFraction: 1 },
  /** A touch snappier — press feedback, small UI state flips. */
  snappy: { response: 0.22, dampingFraction: 1 },
  /** Button press-down itself: near-instant, matches "scale(0.97) in 100ms". */
  press: { response: 0.15, dampingFraction: 1 },
  /** Apple cheat sheet: "Drawer / sheet" — damping 0.8, response 0.3. */
  sheet: { response: 0.3, dampingFraction: 0.82 },
} satisfies Record<string, SpringConfig>;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Apple's UIScrollView rubber-band formula — resistance grows the further
 * you pull, but never hard-stops. `constant` 0.55 matches the cheat sheet.
 */
export function rubberBand(distance: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  const sign = distance < 0 ? -1 : 1;
  const x = Math.abs(distance);
  return sign * (1 - 1 / ((x * constant) / dimension + 1)) * dimension;
}

const SETTLE_VELOCITY = 0.01;
const SETTLE_DISTANCE = 0.01;

/**
 * One animatable number. Call `set()` any time — mid-flight or at rest — and
 * it retargets from the current value/velocity instead of restarting, which
 * is what makes it feel "interruptible" (principle the skill calls out as
 * the single most important one: a change of mind should turn the motion
 * around from where it already is, never jump or restart).
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private config: SpringConfig = SPRING.default;
  private raf: number | null = null;
  private last: number | null = null;
  private onUpdate: (value: number) => void;
  private onSettle?: () => void;

  constructor(initial: number, onUpdate: (value: number) => void) {
    this.value = initial;
    this.target = initial;
    this.onUpdate = onUpdate;
  }

  /** Retarget toward `target`. `velocity` seeds the spring (e.g. a drag's release speed). */
  set(target: number, config: SpringConfig = SPRING.default, opts?: { velocity?: number; onSettle?: () => void }) {
    this.target = target;
    this.config = config;
    if (opts?.velocity != null) this.velocity = opts.velocity;
    this.onSettle = opts?.onSettle;

    if (prefersReducedMotion()) {
      this.stop();
      this.value = target;
      this.velocity = 0;
      this.onUpdate(this.value);
      this.onSettle?.();
      this.onSettle = undefined;
      return;
    }
    this.startLoop();
  }

  /** Teleport without animating — e.g. measuring a starting position before the first frame. */
  jump(value: number) {
    this.stop();
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.onUpdate(value);
  }

  stop() {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.last = null;
  }

  private startLoop() {
    if (this.raf != null) return;
    this.last = null;
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    if (this.last == null) this.last = now;
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;

    const { response, dampingFraction } = this.config;
    const stiffness = ((2 * Math.PI) / response) ** 2;
    const damping = (4 * Math.PI * dampingFraction) / response;

    // Two sub-steps of semi-implicit Euler per frame — cheap and stable
    // enough for UI-scale springs without needing a stiffer integrator.
    const steps = 2;
    const subDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const accel = -stiffness * (this.value - this.target) - damping * this.velocity;
      this.velocity += accel * subDt;
      this.value += this.velocity * subDt;
    }

    const settled = Math.abs(this.velocity) < SETTLE_VELOCITY && Math.abs(this.value - this.target) < SETTLE_DISTANCE;
    if (settled) {
      this.value = this.target;
      this.velocity = 0;
      this.onUpdate(this.value);
      this.raf = null;
      this.last = null;
      const cb = this.onSettle;
      this.onSettle = undefined;
      cb?.();
      return;
    }
    this.onUpdate(this.value);
    this.raf = requestAnimationFrame(this.loop);
  };
}
