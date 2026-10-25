/**
 * Live 3D medals: the typed boundary between the React components (main bundle) and the
 * lazily loaded three.js runtime (its own async chunk).
 */
import type { ImageSource } from 'expo-image';
import type { Ref } from 'react';

/** What is engraved on the back. */
export interface MedalBack {
  /** The medal title, e.g. "Perfect day". */
  title: string;
  /** Second line: the date earned ("21 Oct 2026"), or progress words for a locked medal. */
  line: string;
  /** 0..1 for a locked medal: drawn as a polished arc on the back. */
  progress?: number;
}

/** A medal to build: the render3d asset name plus its engraving. */
export interface MedalModel {
  /** render3d asset name: 'medal-streak-3', 'medal-locked', 'ring-trophy', ... */
  spec: string;
  back: MedalBack;
}

/**
 * How the medal arrives once live 3D is ready.
 * - wobble: a small nudge that shows it can move (the Medals hero)
 * - spin: one turn that settles (the full-screen viewer)
 * - celebrate: two quick turns and a bouncy settle (a new medal)
 */
export type Intro = 'none' | 'wobble' | 'spin' | 'celebrate';

export interface HostOptions {
  model: MedalModel;
  /** The still image's box in CSS px. The canvas is MARGIN times larger so a turning medal never clips. */
  size: number;
  /** Inside a vertical scroller: only horizontal drags are captured (touch-action: pan-y). */
  scroll: boolean;
  reduceMotion: boolean;
  /** Follow the phone's tilt (DeviceOrientation). Ask for permission before turning it on. */
  tilt: boolean;
  intro: Intro;
}

export interface HostEvents {
  /** Live 3D is showing (true) or the still image should show (false). */
  onLive: (live: boolean) => void;
  /** WebGL is unavailable or was lost: keep the still image for good. */
  onFail: () => void;
  /** Which face is turned to the viewer once it settles. */
  onFace?: (back: boolean) => void;
}

export interface HostHandle {
  update: (o: Partial<HostOptions>) => void;
  flip: () => void;
  dispose: () => void;
}

/** Imperative controls for a mounted medal. */
export interface Medal3DHandle {
  /** Turn it over (the same as a double tap). */
  flip: () => void;
}

export interface Medal3DProps {
  /** Award id: 'streak-3', 'walked-away', 'ring-trophy', ... Unknown ids stay a still image. */
  id: string;
  /** The pre-rendered still, shown at once and whenever live 3D isn't available. */
  image: ImageSource;
  /** Size of the still image (pt). */
  size: number;
  /** A locked medal: "?" on the front, progress on the back. */
  locked?: boolean;
  back: MedalBack;
  /** Accessibility label. */
  label: string;
  intro?: Intro;
  /** Set inside a vertical ScrollView so vertical swipes still scroll. */
  scroll?: boolean;
  /** Follow the phone's tilt. */
  tilt?: boolean;
  onFace?: (back: boolean) => void;
  ref?: Ref<Medal3DHandle>;
}

/** The canvas is this much larger than the still, centred on it, so perspective never clips a turning medal. */
export const MARGIN = 1.4;
