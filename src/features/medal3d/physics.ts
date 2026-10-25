/**
 * Spin physics for a medal on a vertical axle, in radians and seconds. Pure maths, no three.js.
 *
 * - Drag: yaw follows the finger 1:1 (the rim moves with it), pitch follows a little (±20°, rubber-banded).
 * - Flick: momentum with exponential friction.
 * - Then a short pause, and a spring eases it back to its home face (front, or back after a flip).
 * - A tap nudges it (a wobble that springs back); a double tap flips it over.
 * - Reduce motion: no momentum, no nudges, no bounce.
 */
const TAU = Math.PI * 2;
const PITCH_MAX = (20 * Math.PI) / 180;

interface Spring {
  k: number;
  c: number;
}
/** Apple's spring model: response (s) and damping ratio. */
const spring = (response: number, damping: number): Spring => {
  const w = TAU / response;
  return { k: w * w, c: 2 * damping * w };
};

const SETTLE = spring(0.55, 0.72); // after a nudge, or a stop close to the face
const RETURN = spring(0.75, 0.84); // after a pause, back to the home face
const FLIP = spring(0.62, 0.8);
const PITCH = spring(0.45, 0.82);
const CALM = spring(0.42, 1); // reduce motion: no overshoot
const INTRO_SPIN = spring(1.05, 0.8);
const INTRO_CELEBRATE = spring(1.5, 0.72);

const FRICTION = 1.7; // 1/s: a 10 rad/s flick glides about one turn
const COAST_MIN = 0.6; // rad/s: slower releases just pause, then return
const STOP_V = 0.32; // rad/s: the glide has ended
const MAX_V = 26; // rad/s
const PAUSE_MS = 650;
const NEAR = 0.22; // rad: close enough to the face to settle without a pause
const POKE = 5.2; // rad/s for a tap at the very edge

export type Mode = 'rest' | 'drag' | 'coast' | 'hold' | 'spring';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export class Spin {
  yaw = 0;
  vy = 0;
  pitch = 0;
  vp = 0;
  /** 0 shows the front, π the back. */
  home = 0;
  mode: Mode = 'rest';
  reduce = false;
  /** When a pause ends (performance.now() ms). */
  holdUntil = 0;
  private pitchRaw = 0;
  private target = 0;
  private sp: Spring = SETTLE;

  /** Nearest angle that shows the home face. */
  private nearestHome(x: number) {
    return this.home + TAU * Math.round((x - this.home) / TAU);
  }

  private springTo(target: number, s: Spring) {
    this.target = target;
    this.sp = this.reduce ? CALM : s;
    this.mode = 'spring';
  }

  get moving(): boolean {
    return this.mode !== 'rest' || Math.abs(this.pitch) > 1e-4;
  }

  /** The back is turned toward the viewer right now. */
  get showingBack(): boolean {
    return Math.cos(this.yaw) < 0;
  }

  /** Straight back to the home face, no motion. */
  reset() {
    this.yaw = this.home;
    this.vy = 0;
    this.pitch = 0;
    this.pitchRaw = 0;
    this.vp = 0;
    this.mode = 'rest';
  }

  grab() {
    this.mode = 'drag';
    this.vy = 0;
    this.vp = 0;
    this.pitchRaw = this.pitch;
  }

  drag(dYaw: number, dPitch: number) {
    this.yaw += dYaw;
    this.pitchRaw += dPitch;
    this.pitch = PITCH_MAX * Math.tanh(this.pitchRaw / PITCH_MAX);
  }

  /** Finger lifted with a yaw velocity (rad/s). */
  release(v: number, now: number) {
    const vy = this.reduce ? 0 : clamp(v, -MAX_V, MAX_V);
    this.vp = 0;
    if (Math.abs(vy) >= COAST_MIN) {
      this.vy = vy;
      this.mode = 'coast';
    } else {
      this.vy = 0;
      this.pause(now);
    }
  }

  private pause(now: number) {
    const near = Math.abs(this.yaw - this.nearestHome(this.yaw)) < NEAR;
    if (near) {
      this.springTo(this.nearestHome(this.yaw), SETTLE);
      return;
    }
    this.mode = 'hold';
    this.holdUntil = now + (this.reduce ? 300 : PAUSE_MS);
  }

  /** A tap at (sx, sy) in -1..1 from the centre pushes that side away; it wobbles back. */
  poke(sx: number, sy: number) {
    if (this.reduce) return;
    this.vy += POKE * clamp(sx, -1, 1);
    this.vp -= POKE * 0.6 * clamp(sy, -1, 1);
    this.springTo(this.nearestHome(this.yaw), SETTLE);
  }

  /** Turn it over: the other face becomes home. */
  flip() {
    this.home = this.home === 0 ? Math.PI : 0;
    this.springTo(this.nearestHome(this.yaw + Math.PI), FLIP);
  }

  intro(kind: 'wobble' | 'spin' | 'celebrate') {
    if (this.reduce) return;
    if (kind === 'wobble') {
      this.vy = 3.4;
      this.springTo(this.home, SETTLE);
      return;
    }
    const turns = kind === 'spin' ? 1 : 2;
    this.yaw = this.home - TAU * turns;
    this.vy = 0;
    this.springTo(this.home, kind === 'spin' ? INTRO_SPIN : INTRO_CELEBRATE);
  }

  /** Advance by dt seconds. Returns true while anything still moves. */
  step(dt: number, now: number): boolean {
    let left = Math.min(dt, 0.05);
    while (left > 1e-6) {
      const h = Math.min(left, 1 / 120);
      left -= h;
      this.sub(h, now);
    }
    if (this.mode === 'spring' && Math.abs(this.yaw - this.target) < 1e-3 && Math.abs(this.vy) < 1e-2 && this.pitchSettled()) {
      // settled: fold the angle back into one turn so it never grows without bound
      this.yaw = this.home;
      this.vy = 0;
      this.pitch = 0;
      this.vp = 0;
      this.mode = 'rest';
    }
    return this.mode === 'coast' || this.mode === 'spring' || this.mode === 'drag' || !this.pitchSettled();
  }

  private pitchSettled() {
    return Math.abs(this.pitch) < 1e-3 && Math.abs(this.vp) < 1e-2;
  }

  private sub(h: number, now: number) {
    switch (this.mode) {
      case 'coast': {
        this.yaw += this.vy * h;
        this.vy *= Math.exp(-FRICTION * h);
        if (Math.abs(this.vy) < STOP_V) {
          this.vy = 0;
          this.pause(now);
        }
        break;
      }
      case 'hold':
        if (now >= this.holdUntil) this.springTo(this.nearestHome(this.yaw), RETURN);
        break;
      case 'spring': {
        const a = -this.sp.k * (this.yaw - this.target) - this.sp.c * this.vy;
        this.vy += a * h;
        this.yaw += this.vy * h;
        break;
      }
      default:
        break;
    }
    if (this.mode !== 'drag') {
      const p = this.reduce ? CALM : PITCH;
      const a = -p.k * this.pitch - p.c * this.vp;
      this.vp += a * h;
      this.pitch += this.vp * h;
      if (this.pitchSettled()) {
        this.pitch = 0;
        this.vp = 0;
      }
    }
  }
}
