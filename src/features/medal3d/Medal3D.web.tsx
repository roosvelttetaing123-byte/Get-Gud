/**
 * Live 3D medal (web).
 *
 * The pre-rendered still shows at once. A moment later three.js loads on demand (its own chunk, never
 * in the startup bundle), builds the medal and cross-fades to it at the exact same pose, and from then
 * on it can be dragged, flicked, tapped and turned over. Without WebGL the still stays, with its press tilt.
 * Reduce motion: the still stays until it's touched, and nothing moves on its own.
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { LOCKED_MEDAL } from '@/lib/engage';
import { useReduceMotion } from '@/ui/motion';

import { specFor } from './specs';
import { Still } from './Still';
import { MARGIN, type HostHandle, type HostOptions, type MedalModel, type Medal3DProps } from './types';

type Runtime = typeof import('./runtime');
let runtime: Promise<Runtime> | null = null;
const loadRuntime = () => (runtime ??= import('./runtime'));

/** Let the screen finish arriving before any 3D work starts. */
const START_DELAY = 380;
const FADE_MS = 260;

export function Medal3D({ id, image, size, locked, back, label, intro = 'none', scroll = false, tilt = false, onFace, ref }: Medal3DProps) {
  const reduce = useReduceMotion();
  const spec = specFor(id, locked);
  const still = locked ? LOCKED_MEDAL : image;
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attached, setAttached] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HostHandle | null>(null);
  const optsRef = useRef<HostOptions | null>(null);
  const faceRef = useRef(onFace);

  const { title, line, progress } = back;
  const model = useMemo<MedalModel | null>(() => (spec ? { spec, back: { title, line, progress } } : null), [spec, title, line, progress]);

  useImperativeHandle(ref, () => ({ flip: () => handleRef.current?.flip() }), []);

  useEffect(() => {
    faceRef.current = onFace;
  }, [onFace]);

  // the runtime always gets the latest options
  useEffect(() => {
    if (!model) return;
    const o: HostOptions = { model, size, scroll, reduceMotion: reduce, tilt, intro };
    optsRef.current = o;
    handleRef.current?.update(o);
  }, [model, size, scroll, reduce, tilt, intro]);

  useEffect(() => {
    if (!spec) return;
    let alive = true;
    let handle: HostHandle | null = null;
    const timer = setTimeout(() => {
      loadRuntime().then(
        (rt) => {
          const slot = slotRef.current;
          const touch = touchRef.current;
          const opts = optsRef.current;
          if (!alive || !slot || !touch || !opts) return;
          handle = rt.mountHost(slot, touch, opts, {
            onLive: (v) => {
              if (alive) setLive(v);
            },
            onFail: () => {
              if (alive) setFailed(true);
            },
            onFace: (b) => faceRef.current?.(b),
          });
          handleRef.current = handle;
          setAttached(true);
        },
        () => {
          if (alive) setFailed(true);
        },
      );
    }, START_DELAY);
    return () => {
      alive = false;
      clearTimeout(timer);
      handle?.dispose();
      handleRef.current = null;
    };
  }, [spec]);

  if (!spec || failed) return <Still image={still} size={size} label={label} />;

  const box = Math.round(size * MARGIN);
  const off = (size - box) / 2;
  // fade in to live 3D; snap back to the still (the canvas has already moved elsewhere)
  const fade = live && !reduce ? `opacity ${FADE_MS}ms ease-out` : 'none';
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: live ? 0 : 1, transition: fade, pointerEvents: attached ? 'none' : 'auto' }}>
        <Still image={still} size={size} />
      </div>
      <div
        ref={slotRef}
        aria-hidden
        style={{ position: 'absolute', left: off, top: off, width: box, height: box, pointerEvents: 'none', opacity: live ? 1 : 0, transition: fade }}
      />
      <div
        ref={touchRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: off,
          top: off,
          width: box,
          height: box,
          display: attached ? 'block' : 'none',
          touchAction: scroll ? 'pan-y' : 'none',
          cursor: 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
    </View>
  );
}
