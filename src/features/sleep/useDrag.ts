/**
 * Drag tracking for the sleep dial and the night bars (iOS and Android): the responder system.
 * The web build uses useDrag.web.ts (raw touch and pointer events, so page scroll stays native).
 *
 * Coordinates are relative to the surface's top-left. Give the surface's children
 * pointerEvents="none" so every touch lands on the surface itself.
 */
import { useRef, type ComponentRef, type RefObject } from 'react';
import type { GestureResponderEvent, View, ViewProps } from 'react-native';

export interface DragHandlers {
  /** Take this touch? Lets a ring take touches on the ring only. */
  accept: (x: number, y: number) => boolean;
  start: (x: number, y: number) => void;
  move: (x: number, y: number) => void;
  /** `cancel` when the page took the gesture over (it started scrolling). */
  end: (how: 'up' | 'cancel') => void;
}

/** `capture`: an accepted touch never scrolls the page. `pan-y`: a vertical swipe still scrolls it. */
export type DragMode = 'capture' | 'pan-y';

export function useDrag(h: DragHandlers, mode: DragMode): { ref: RefObject<ComponentRef<typeof View> | null>; props: ViewProps } {
  const ref = useRef<ComponentRef<typeof View>>(null);
  // Page position of the surface's top-left, taken at grant so moves stay relative to it.
  const origin = useRef({ x: 0, y: 0 });
  const at = (e: GestureResponderEvent) => [e.nativeEvent.pageX - origin.current.x, e.nativeEvent.pageY - origin.current.y] as const;

  const props: ViewProps = {
    onStartShouldSetResponder: (e) => h.accept(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onMoveShouldSetResponder: () => false,
    onResponderTerminationRequest: () => mode === 'pan-y',
    onResponderGrant: (e) => {
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      origin.current = { x: pageX - locationX, y: pageY - locationY };
      h.start(locationX, locationY);
    },
    onResponderMove: (e) => {
      const [x, y] = at(e);
      h.move(x, y);
    },
    onResponderRelease: () => h.end('up'),
    onResponderTerminate: () => h.end('cancel'),
  };
  return { ref, props };
}
