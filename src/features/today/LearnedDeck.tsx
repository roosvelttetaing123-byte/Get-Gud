/**
 * "What I've learned" as a deck of cards. Drag the top card sideways and it tilts with your
 * finger; let go past the edge, or flick it, and it flies off while the next card rises to meet
 * you. Anything less and it springs back. Tap a card to go where it points; the arrows do the
 * same job without dragging. The deck loops, so there's no dead end.
 *
 * Positions live in shared values (which card is on top, the drag, each card's own flight), so
 * a swipe never waits on a React render and nothing flickers between cards.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { C, S, SPRING } from '@/constants/theme';
import type { CoachArea, CoachRoute, Insight } from '@/lib/coach';
import { haptic } from '@/lib/haptics';
import { IconButton, IconSquare, Pressy, Txt, useReduceMotion } from '@/ui';

import { AREA_COLOR, COACH_ICON } from './coachLook';

const AREA_LABEL: Record<CoachArea, string> = {
  sleep: 'Sleep',
  trading: 'Trading',
  mood: 'Mood',
  urges: 'Urges',
  habits: 'Habits',
};
const ROUTE_LABEL: Record<CoachRoute, string> = {
  '/gate': 'Gate',
  '/urge': 'Urge',
  '/sleep': 'Sleep',
  '/journal': 'Journal',
  '/settings': 'Settings',
};

const STACK_Y = 12; // how far each card behind peeks out
const STACK_SCALE = 0.05;
const TILT = 13; // degrees at one card-width of drag
const RADIUS = 22;

// pan-y: the sheet still scrolls vertically; sideways drags belong to the deck.
const TOUCH = Platform.OS === 'web' ? ({ touchAction: 'pan-y', cursor: 'grab', userSelect: 'none' } as object) : null;

type Fly = { fly: (dir: 1 | -1, velocity: number, from: number) => void; land: () => void };

export function LearnedDeck({ items, onOpen }: { items: Insight[]; onOpen: (i: Insight) => void }) {
  const n = items.length;
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [w, setW] = useState(340);
  const [h, setH] = useState(0);
  const top = useSharedValue(0);
  const drag = useSharedValue(0);
  const cards = useRef<Record<number, Fly>>({});
  const g = useRef({ x: 0, lx: 0, lt: 0, v: 0, dragged: false });
  const start = useRef({ x: 0, y: 0 });
  /** A sideways drag of more than a few points, measured from where the touch began. */
  const sideways = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - start.current.x;
    const dy = e.nativeEvent.pageY - start.current.y;
    return Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2;
  };

  const register = (i: number, api: Fly | null) => {
    if (api) cards.current[i] = api;
    else delete cards.current[i];
  };

  const advance = (dir: 1 | -1, velocity: number) => {
    const i = top.get();
    const next = (i + 1) % n;
    // The card that leaves flies on its own; the deck moves on underneath it in the same frame.
    if (!reduce) cards.current[i]?.fly(dir, velocity, drag.get());
    top.set(next);
    drag.set(0);
    setIndex(next);
    haptic.tap();
  };

  const back = () => {
    const i = (top.get() - 1 + n) % n;
    cards.current[i]?.land();
    top.set(i);
    if (reduce) drag.set(0);
    else {
      // The previous card comes back in from the left, over the one you were on.
      drag.set(-w * 1.2);
      drag.set(withSpring(0, SPRING.snappy));
    }
    setIndex(i);
    haptic.tap();
  };

  const grant = (e: GestureResponderEvent) => {
    const { pageX, timestamp } = e.nativeEvent;
    cancelAnimation(drag);
    g.current = { x: pageX - drag.get(), lx: pageX, lt: timestamp, v: 0, dragged: true };
  };
  const move = (e: GestureResponderEvent) => {
    const s = g.current;
    const { pageX, timestamp } = e.nativeEvent;
    s.v = (pageX - s.lx) / Math.max(1, timestamp - s.lt);
    s.lx = pageX;
    s.lt = timestamp;
    drag.set(pageX - s.x);
  };
  const release = (e: GestureResponderEvent) => {
    const dx = drag.get();
    // A finger that rested before lifting has no fling left in it.
    const v = e.nativeEvent.timestamp - g.current.lt > 80 ? 0 : g.current.v; // px per ms
    const flick = Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 16;
    if (n > 1 && (Math.abs(dx) > w * 0.32 || flick)) advance(dx > 0 ? 1 : -1, v * 1000);
    else drag.set(withSpring(0, { ...SPRING.snappy, velocity: v * 1000 }));
  };

  if (!n) return null;
  const deckH = Math.max(h, 200) + STACK_Y * Math.min(2, n - 1);

  return (
    <View style={{ gap: S.md }}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        // Note where each touch starts (never claiming it), then take over once it turns sideways,
        // even when it began on the card's own button.
        onStartShouldSetResponderCapture={(e) => {
          start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
          return false;
        }}
        onMoveShouldSetResponderCapture={sideways}
        onResponderTerminationRequest={() => false}
        onResponderGrant={grant}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={release}
        style={[{ height: deckH }, TOUCH]}>
        {items.map((it, i) => (
          <DeckCard
            key={it.id}
            item={it}
            i={i}
            n={n}
            w={w}
            h={h}
            top={top}
            drag={drag}
            isTop={i === index % n}
            reduce={reduce}
            register={register}
            onMeasure={(x) => setH((y) => Math.max(y, x))}
            onPressIn={() => {
              g.current.dragged = false;
            }}
            onPress={() => {
              // A mouse drag still ends in a click; only a real tap opens the card.
              if (!g.current.dragged) onOpen(it);
            }}
          />
        ))}
      </View>

      {n > 1 ? (
        <View style={styles.controls}>
          <IconButton icon={ChevronLeft} label="Previous" onPress={back} />
          <Txt v="subhead" weight="600" color={C.label2} tabular>
            {`${index + 1} of ${n}`}
          </Txt>
          <IconButton icon={ChevronRight} label="Next" onPress={() => advance(-1, 0)} />
        </View>
      ) : null}
    </View>
  );
}

function DeckCard({
  item,
  i,
  n,
  w,
  h,
  top,
  drag,
  isTop,
  reduce,
  register,
  onMeasure,
  onPressIn,
  onPress,
}: {
  item: Insight;
  i: number;
  n: number;
  w: number;
  h: number;
  top: SharedValue<number>;
  drag: SharedValue<number>;
  isTop: boolean;
  reduce: boolean;
  register: (i: number, api: Fly | null) => void;
  onMeasure: (h: number) => void;
  onPressIn: () => void;
  onPress: () => void;
}) {
  const fx = useSharedValue(0);
  const flying = useSharedValue(0);
  const enter = useSharedValue(1);

  useEffect(() => {
    register(i, {
      fly: (dir, velocity, from) => {
        flying.set(1);
        fx.set(from);
        fx.set(
          withSpring(dir * w * 1.6, { ...SPRING.snappy, velocity }, (done) => {
            'worklet';
            if (!done) return;
            flying.set(0);
            // Back at the bottom of the deck: fade in there rather than pop.
            enter.set(0);
            enter.set(withSpring(1, SPRING.smooth));
          }),
        );
      },
      land: () => {
        cancelAnimation(fx);
        flying.set(0);
        enter.set(1);
      },
    });
    return () => register(i, null);
  }, [i, w, register, fx, flying, enter]);

  const card = useAnimatedStyle(() => {
    const d = (((i - top.get()) % n) + n) % n;
    if (flying.get()) {
      const x = fx.get();
      return {
        zIndex: 100,
        opacity: 1,
        backgroundColor: C.card2,
        transform: [{ translateY: 0 }, { translateX: x }, { rotate: `${reduce ? 0 : (x / w) * TILT}deg` }, { scale: 1 }],
      };
    }
    if (d === 0) {
      const x = drag.get();
      return {
        zIndex: 50,
        opacity: enter.get(),
        backgroundColor: C.card2,
        transform: [{ translateY: 0 }, { translateX: x }, { rotate: `${reduce ? 0 : (x / w) * TILT}deg` }, { scale: 1 }],
      };
    }
    // Cards underneath rise toward the top as the top card is dragged away.
    const p = Math.min(1, Math.abs(drag.get()) / (w * 0.32));
    const dd = Math.max(0, d - p);
    const shown = dd <= 2 ? 1 : Math.max(0, 3 - dd);
    return {
      zIndex: 50 - d,
      opacity: shown * enter.get(),
      backgroundColor: interpolateColor(dd, [0, 3], [C.card2, C.gray6]),
      transform: [{ translateY: dd * STACK_Y }, { translateX: 0 }, { rotate: '0deg' }, { scale: 1 - dd * STACK_SCALE }],
    };
  });

  // The words fade in only as a card reaches the top; the ones behind are just edges.
  const words = useAnimatedStyle(() => {
    const d = (((i - top.get()) % n) + n) % n;
    if (flying.get() || d === 0) return { opacity: 1 };
    const p = Math.min(1, Math.abs(drag.get()) / (w * 0.32));
    return { opacity: d === 1 ? p : 0 };
  });

  const color = AREA_COLOR[item.area];
  return (
    <Animated.View
      style={[styles.card, card]}
      onLayout={(e) => onMeasure(e.nativeEvent.layout.height)}
      accessibilityElementsHidden={!isTop}
      importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}>
      <Pressy
        accessibilityRole={item.route ? 'button' : undefined}
        accessibilityLabel={`${item.title}. ${item.body}${item.route ? `. Opens ${ROUTE_LABEL[item.route]}` : ''}`}
        disabled={!isTop || !item.route}
        scaleTo={0.98}
        onPressIn={onPressIn}
        onPress={onPress}
        style={{ flex: 1 }}>
        <Animated.View style={[styles.inner, { minHeight: h || undefined }, words]}>
          <View style={styles.kicker}>
            <IconSquare icon={COACH_ICON[item.icon]} color={color} size={28} />
            <Txt v="subhead" weight="600" color={color}>
              {AREA_LABEL[item.area]}
            </Txt>
          </View>
          <View style={{ gap: 6, flex: 1 }}>
            <Txt v="title3" weight="700">
              {item.title}
            </Txt>
            <Txt v="callout" color={C.label2}>
              {item.body}
            </Txt>
          </View>
          <View style={styles.foot}>
            <Txt v="caption1" color={C.label3} style={{ flex: 1 }} numberOfLines={1}>
              {item.evidence}
            </Txt>
            {item.route ? (
              <View style={styles.go}>
                <Txt v="footnote" weight="600" color={C.tint}>
                  {ROUTE_LABEL[item.route]}
                </Txt>
                <ChevronRight size={15} color={C.tint} strokeWidth={2.6} />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderRadius: RADIUS,
    backgroundColor: C.card2,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  inner: { padding: S.xl, gap: S.md, flex: 1 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  go: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.xl },
});

