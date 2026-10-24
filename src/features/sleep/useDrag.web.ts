/**
 * Drag tracking for the sleep dial and the night bars (web / home-screen app).
 *
 * Touch runs on raw touch events and mouse on pointer events, both bound straight to the DOM
 * node, so a drag never re-renders anything above the surface.
 *   capture: a touch the surface accepts cancels its touchstart, so iOS Safari doesn't scroll
 *            the page under the finger. Touches it refuses (the dial's face) scroll as usual.
 *   pan-y:   for horizontal scrubbing inside the scroll view. A vertical swipe still scrolls
 *            the page, and the drag ends as soon as the page takes over.
 * Same exports as useDrag.ts.
 */
import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import type { View, ViewProps } from 'react-native';

import type { DragHandlers, DragMode } from './useDrag';

export type { DragHandlers, DragMode };

type Active = { touch: boolean; id: number; left: number; top: number };

export function useDrag(h: DragHandlers, mode: DragMode): { ref: RefObject<ComponentRef<typeof View> | null>; props: ViewProps } {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const handlers = useRef(h);
  useEffect(() => {
    handlers.current = h;
  });

  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;
    let active: Active | null = null;

    const begin = (touch: boolean, id: number, cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      if (!handlers.current.accept(cx - r.left, cy - r.top)) return false;
      active = { touch, id, left: r.left, top: r.top };
      handlers.current.start(cx - r.left, cy - r.top);
      return true;
    };
    const finish = (how: 'up' | 'cancel') => {
      if (!active) return;
      active = null;
      handlers.current.end(how);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (active) return;
      const t = e.changedTouches[0];
      if (begin(true, t.identifier, t.clientX, t.clientY) && mode === 'capture') e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      const a = active;
      if (!a?.touch) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === a.id);
      if (!t) return;
      // A move the page won't let us cancel means it has started scrolling: let it have the gesture.
      if (mode === 'pan-y' && !e.cancelable) return finish('cancel');
      if (mode === 'capture' && e.cancelable) e.preventDefault();
      handlers.current.move(t.clientX - a.left, t.clientY - a.top);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const a = active;
      if (!a?.touch || !Array.from(e.changedTouches).some((x) => x.identifier === a.id)) return;
      finish(e.type === 'touchcancel' ? 'cancel' : 'up');
    };

    // Mouse and pen. Touch pointers are left to the touch handlers above.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || active || e.button !== 0) return;
      if (begin(false, e.pointerId, e.clientX, e.clientY)) {
        el.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const a = active;
      if (!a || a.touch || e.pointerId !== a.id) return;
      handlers.current.move(e.clientX - a.left, e.clientY - a.top);
    };
    const onPointerUp = (e: PointerEvent) => {
      const a = active;
      if (!a || a.touch || e.pointerId !== a.id) return;
      finish(e.type === 'pointercancel' ? 'cancel' : 'up');
    };

    const opts = { passive: false } as const;
    el.addEventListener('touchstart', onTouchStart, opts);
    el.addEventListener('touchmove', onTouchMove, opts);
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      if (active) handlers.current.end('cancel');
    };
  }, [mode]);

  return { ref, props: {} };
}
