/**
 * Live medal runtime (loaded on demand, in its own chunk with three.js).
 *
 * Every mounted Medal3D registers a host. The most recently mounted host still in the document owns
 * the single canvas; the others show their still image. Frames are drawn only while something moves
 * (a drag, a glide, a spring, the tilt), never while hidden, offscreen or at rest.
 */
import * as THREE from 'three';

import type { Built } from './build';
import { Spin } from './physics';
import { Stage } from './stage';
import type { HostEvents, HostHandle, HostOptions, MedalModel } from './types';

const DEG = Math.PI / 180;
const SLOP = 6; // px before a touch becomes a drag
const DOUBLE_TAP_MS = 320;

let stage: Stage | null = null;
let failed = false;
let disposeTimer: ReturnType<typeof setTimeout> | null = null;
const hosts: Host[] = [];
let owner: Host | null = null;
let raf = 0;
let lastT = 0;
let wake: ReturnType<typeof setTimeout> | null = null;

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

const sameModel = (a: MedalModel, b: MedalModel) =>
  a.spec === b.spec && a.back.title === b.back.title && a.back.line === b.back.line && a.back.progress === b.back.progress;

function kick() {
  if (wake) {
    clearTimeout(wake);
    wake = null;
  }
  if (!raf && typeof requestAnimationFrame !== 'undefined') raf = requestAnimationFrame(frame);
}

function frame(t: number) {
  raf = 0;
  const h = owner;
  if (!h || !h.built || !stage || document.hidden || !h.visible) {
    lastT = 0;
    return;
  }
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 1 / 60;
  lastT = t;
  const now = performance.now();
  const moving = h.spin.mode === 'drag' ? false : h.spin.step(dt, now);
  const tilting = h.stepTilt(dt);
  h.draw();
  h.settled();
  if (moving || tilting) {
    raf = requestAnimationFrame(frame);
  } else {
    lastT = 0;
    if (h.spin.mode === 'hold') wake = setTimeout(kick, Math.max(0, h.spin.holdUntil - now) + 4);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) kick();
  });
}

function ensureStage(): Stage | null {
  if (failed) return null;
  if (disposeTimer) {
    clearTimeout(disposeTimer);
    disposeTimer = null;
  }
  if (!stage) {
    try {
      stage = new Stage(lost);
    } catch {
      failed = true;
      return null;
    }
  }
  return stage;
}

/** WebGL went away: every medal keeps its still image for the rest of the session. */
function lost() {
  failed = true;
  const s = stage;
  stage = null;
  owner = null;
  for (const h of hosts) h.fail();
  s?.dispose();
}

/** The most recently mounted host that is still in the document owns the canvas. */
function reassign() {
  let next: Host | null = null;
  for (let i = hosts.length - 1; i >= 0; i--) {
    if (hosts[i].slot.isConnected) {
      next = hosts[i];
      break;
    }
  }
  if (next === owner) return;
  owner?.lose();
  owner = next;
  next?.gain();
}

class Host {
  opts: HostOptions;
  spin = new Spin();
  built: Built | null = null;
  visible = true;
  private live = false;
  private disposed = false;
  private introDone = false;
  private touched = false;
  private face = false;
  private io: IntersectionObserver | null = null;
  // input
  private pointerId: number | null = null;
  private dragging = false;
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;
  private samples: { x: number; t: number }[] = [];
  private lastTap = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  // tilt (radians), smoothed toward the target
  private tiltOn = false;
  private tYaw = 0;
  private tPitch = 0;
  private yawT = 0;
  private pitchT = 0;
  private base: { b: number; g: number } | null = null;

  constructor(
    readonly slot: HTMLElement,
    readonly touch: HTMLElement,
    opts: HostOptions,
    private ev: HostEvents,
  ) {
    this.opts = opts;
    this.spin.reduce = opts.reduceMotion;
    touch.addEventListener('pointerdown', this.onDown);
    touch.addEventListener('pointermove', this.onMove);
    touch.addEventListener('pointerup', this.onUp);
    touch.addEventListener('pointercancel', this.onCancel);
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        const e = entries[entries.length - 1];
        this.visible = e ? e.isIntersecting : true;
        if (this.visible && owner === this) kick();
      });
      this.io.observe(slot);
    }
    if (opts.tilt) this.setTilt(true);
  }

  /* ---------- ownership ---------- */

  async gain() {
    const st = stage;
    if (!st) return;
    this.slot.appendChild(st.canvas);
    let built: Built;
    try {
      built = await st.prepare(this.opts.model);
      if (owner !== this || this.disposed) return;
      await st.warm(built, this.opts.size);
    } catch {
      if (owner === this && !this.disposed) this.fail();
      return;
    }
    if (owner !== this || this.disposed || stage !== st) return;
    this.built = built;
    this.spin.reset();
    this.draw();
    // let the first frame reach the screen before the still fades out
    requestAnimationFrame(() => {
      if (owner !== this || this.disposed) return;
      if (this.opts.reduceMotion && !this.touched) return; // reduce motion: the still stays until a touch
      this.goLive();
    });
  }

  private goLive() {
    if (this.live) return;
    this.live = true;
    this.ev.onLive(true);
    if (!this.introDone && this.opts.intro !== 'none') {
      this.introDone = true;
      this.spin.intro(this.opts.intro);
    }
    kick();
  }

  lose() {
    this.built = null;
    this.spin.home = 0;
    this.spin.reset();
    this.pointerId = null;
    this.dragging = false;
    if (this.live) {
      this.live = false;
      this.ev.onLive(false);
    }
  }

  fail() {
    this.built = null;
    this.live = false;
    this.ev.onFail();
  }

  update(o: Partial<HostOptions>) {
    const prev = this.opts;
    this.opts = { ...prev, ...o };
    this.spin.reduce = this.opts.reduceMotion;
    if (o.tilt !== undefined && o.tilt !== this.tiltOn) this.setTilt(o.tilt);
    if (owner !== this) return;
    if (o.model && !sameModel(o.model, prev.model)) {
      const st = stage;
      st?.prepare(this.opts.model).then(
        (b) => {
          if (owner !== this || this.disposed) return;
          this.built = b;
          kick();
        },
        () => this.fail(),
      );
    } else if (o.size !== undefined && o.size !== prev.size) kick();
  }

  draw() {
    if (!stage || !this.built) return;
    const s = this.spin;
    qa.setFromAxisAngle(X, s.pitch + this.pitchT);
    qb.setFromAxisAngle(Y, s.yaw + this.yawT);
    qa.multiply(qb);
    stage.render(this.built, qa, this.opts.size);
  }

  /** Tell the page which face settled toward the viewer. */
  settled() {
    if (this.spin.mode !== 'rest') return;
    const back = this.spin.home !== 0;
    if (back !== this.face) {
      this.face = back;
      this.ev.onFace?.(back);
    }
  }

  flip() {
    if (owner !== this || !this.built) return;
    this.touched = true;
    if (!this.live) this.goLive();
    this.spin.flip();
    kick();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.setTilt(false);
    this.io?.disconnect();
    this.touch.removeEventListener('pointerdown', this.onDown);
    this.touch.removeEventListener('pointermove', this.onMove);
    this.touch.removeEventListener('pointerup', this.onUp);
    this.touch.removeEventListener('pointercancel', this.onCancel);
    const i = hosts.indexOf(this);
    if (i >= 0) hosts.splice(i, 1);
    if (owner === this) {
      owner = null;
      this.built = null;
    }
    reassign();
    if (!hosts.length && stage && !disposeTimer) {
      // the last medal left: free the GL context once nothing comes back for a moment
      disposeTimer = setTimeout(() => {
        disposeTimer = null;
        if (hosts.length || !stage) return;
        stage.dispose();
        stage = null;
      }, 1500);
    }
  }

  /* ---------- input ---------- */

  private radiusPx() {
    return Math.max(24, this.opts.size * 0.42);
  }

  private onDown = (e: PointerEvent) => {
    if (this.pointerId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (owner !== this || !this.built) return;
    this.pointerId = e.pointerId;
    this.dragging = false;
    this.downX = this.lastX = e.clientX;
    this.downY = this.lastY = e.clientY;
    this.samples = [{ x: e.clientX, t: e.timeStamp }];
    try {
      this.touch.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety (mouse drags that leave the medal)
    }
    this.touched = true;
    if (!this.live) this.goLive();
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    let dx = e.clientX - this.lastX;
    let dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (!this.dragging) {
      const tx = e.clientX - this.downX;
      const ty = e.clientY - this.downY;
      if (Math.hypot(tx, ty) < SLOP) return;
      this.dragging = true;
      this.spin.grab();
      // catch up with the finger, so the rim stays under it from the first contact
      dx = tx;
      dy = ty;
    }
    const r = this.radiusPx();
    this.spin.drag(dx / r, dy / r);
    this.samples.push({ x: e.clientX, t: e.timeStamp });
    while (this.samples.length > 2 && e.timeStamp - this.samples[0].t > 100) this.samples.shift();
    kick();
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (this.dragging) {
      this.dragging = false;
      const s = this.samples;
      const last = s[s.length - 1];
      let v = 0;
      if (s.length > 1 && e.timeStamp - last.t < 70) {
        const first = s[0];
        const dt = Math.max(8, last.t - first.t);
        v = ((last.x - first.x) / dt) * 1000; // px/s
      }
      this.spin.release(v / this.radiusPx(), performance.now());
      kick();
      return;
    }
    // a tap: nudge it; a second tap soon after flips it
    const t = e.timeStamp;
    if (t - this.lastTap < DOUBLE_TAP_MS && Math.hypot(e.clientX - this.lastTapX, e.clientY - this.lastTapY) < 40) {
      this.lastTap = 0;
      this.spin.flip();
    } else {
      this.lastTap = t;
      this.lastTapX = e.clientX;
      this.lastTapY = e.clientY;
      const rect = this.touch.getBoundingClientRect();
      const r = this.radiusPx();
      this.spin.poke((e.clientX - (rect.left + rect.width / 2)) / r, (e.clientY - (rect.top + rect.height / 2)) / r);
    }
    kick();
  };

  private onCancel = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (this.dragging) {
      // the page took the gesture (a vertical scroll): let go without a flick
      this.dragging = false;
      this.spin.release(0, performance.now());
      kick();
    }
  };

  /* ---------- tilt ---------- */

  private setTilt(on: boolean) {
    if (typeof window === 'undefined') return;
    if (on && !this.tiltOn) {
      this.base = null;
      window.addEventListener('deviceorientation', this.onOrient);
    } else if (!on && this.tiltOn) {
      window.removeEventListener('deviceorientation', this.onOrient);
      this.tYaw = 0;
      this.tPitch = 0;
    }
    this.tiltOn = on;
    kick();
  }

  private onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (!this.base) this.base = { b: e.beta, g: e.gamma };
    // the neutral pose drifts toward how the phone is held now, so it never sticks at a limit
    this.base.b += (e.beta - this.base.b) * 0.004;
    this.base.g += (e.gamma - this.base.g) * 0.004;
    const dg = e.gamma - this.base.g;
    const db = e.beta - this.base.b;
    this.tYaw = Math.max(-40, Math.min(40, dg * 1.2)) * DEG;
    this.tPitch = Math.max(-24, Math.min(24, -db * 0.9)) * DEG;
    if (!this.live && owner === this && this.built) {
      this.touched = true;
      this.goLive();
    }
    kick();
  };

  /** Smooth the tilt toward its target. True while it still moves. */
  stepTilt(dt: number): boolean {
    const k = 1 - Math.exp(-dt / 0.09);
    this.yawT += (this.tYaw - this.yawT) * k;
    this.pitchT += (this.tPitch - this.pitchT) * k;
    const moving = Math.abs(this.tYaw - this.yawT) > 2e-4 || Math.abs(this.tPitch - this.pitchT) > 2e-4;
    if (!moving) {
      this.yawT = this.tYaw;
      this.pitchT = this.tPitch;
    }
    return moving;
  }
}

/** Register a medal. `slot` receives the canvas while this medal is on top; `touch` takes its gestures. */
export function mountHost(slot: HTMLElement, touch: HTMLElement, opts: HostOptions, ev: HostEvents): HostHandle {
  const h = new Host(slot, touch, opts, ev);
  hosts.push(h);
  if (!ensureStage()) {
    setTimeout(() => h.fail(), 0);
  } else {
    reassign();
  }
  return {
    update: (o) => h.update(o),
    flip: () => h.flip(),
    dispose: () => h.dispose(),
  };
}

// Dev only: pose the live medal for visual QA (stripped from production builds).
if (__DEV__) {
  (globalThis as unknown as { __medal3d: object }).__medal3d = {
    pose(yaw: number, pitch = 0) {
      const h = owner;
      if (!h || !h.built) return false;
      h.spin.mode = 'rest';
      h.spin.yaw = yaw;
      h.spin.pitch = pitch;
      h.draw();
      return true;
    },
    state() {
      const h = owner;
      return h ? { mode: h.spin.mode, yaw: h.spin.yaw, pitch: h.spin.pitch, home: h.spin.home, built: !!h.built } : null;
    },
  };
}
