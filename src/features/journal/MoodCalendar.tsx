/**
 * "Your days": a month of mornings. One rounded square per day in that morning's State of Mind
 * colour (purple, blue, orange); days without a check-in stay neutral and today has a ring.
 * Swipe the grid (it follows your finger, then settles with a spring) or use the arrows to
 * change month. Tap a day to open it.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { C, FONT, S, SPRING, VALENCE } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { State } from '@/lib/store';
import { Card, Pressy, Txt, useReduceMotion } from '@/ui';

import { dayTitle, firstKey, monthGrid, monthLine, monthOffset, valenceOf, type CalDay } from './calendar';

const GAP = 6;
/** Room inside the swipe viewport so today's ring isn't clipped at its edges. */
const INSET = 5;
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** Horizontal swipes are ours; vertical ones still scroll the page. */
const WEB_PAN = Platform.OS === 'web' ? ({ touchAction: 'pan-y', userSelect: 'none' } as object) : null;
const VALENCE_COLORS = VALENCE.map((v) => v.color) as unknown as [string, string, ...string[]];
/** Light mood colours (pleasant side) take dark numbers, like iOS does on yellow and orange. */
const darkInk = (v: number) => v >= 5;

export function MoodCalendar({ state, now, onOpenDay }: { state: State; now: number; onOpenDay: (key: string) => void }) {
  const reduce = useReduceMotion();
  const [page, setPage] = useState(0); // 0 = this month, -1 = last month
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const pan = useRef({ x0: 0, y0: 0, base: 0, lastX: 0, lastT: 0, vx: 0, endedAt: 0 });
  // On the web a press comes from the browser's click, so drop one that lands just after a swipe.
  const openDay = (key: string) => {
    if (Date.now() - pan.current.endedAt < 400) return;
    haptic.tap();
    onOpenDay(key);
  };

  const first = firstKey(state);
  const min = Math.min(0, first ? monthOffset(first, now) : 0);
  const grid = monthGrid(page, now);
  const cell = w ? (w - INSET * 2 - GAP * 6) / 7 : 0;
  const gridH = cell * 6 + GAP * 5 + INSET * 2;

  /** Snap to a month (clamped), with a tick when it changes. */
  const settle = (to: number) => {
    const next = Math.max(min, Math.min(0, to));
    if (next !== page) {
      haptic.tap();
      setPage(next);
    }
    const target = -next * w;
    x.set(reduce ? target : withSpring(target, SPRING.snappy));
  };

  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const panes = [page - 1, page, page + 1].filter((p) => p >= min && p <= 0);

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <View style={styles.head}>
        <Txt v="headline" weight="700" style={{ flex: 1 }}>
          {grid.title}
        </Txt>
        <Arrow icon={ChevronLeft} label="Previous month" disabled={page <= min} onPress={() => settle(page - 1)} />
        <Arrow icon={ChevronRight} label="Next month" disabled={page >= 0} onPress={() => settle(page + 1)} />
      </View>

      <View style={styles.letters}>
        {LETTERS.map((l, i) => (
          <Text key={i} style={[styles.letter, { width: cell || undefined }]}>
            {l}
          </Text>
        ))}
      </View>

      <View
        style={[{ height: gridH || 280, overflow: 'hidden', marginHorizontal: -INSET, marginVertical: -INSET }, WEB_PAN]}
        onLayout={(e) => {
          const nw = e.nativeEvent.layout.width;
          setW(nw);
          x.set(-page * nw);
        }}
        onStartShouldSetResponderCapture={(e) => {
          pan.current.x0 = e.nativeEvent.pageX;
          pan.current.y0 = e.nativeEvent.pageY;
          return false;
        }}
        onMoveShouldSetResponderCapture={(e) => {
          const dx = e.nativeEvent.pageX - pan.current.x0;
          const dy = e.nativeEvent.pageY - pan.current.y0;
          return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2;
        }}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          cancelAnimation(x);
          const p = pan.current;
          p.x0 = e.nativeEvent.pageX;
          p.base = x.get();
          p.lastX = p.x0;
          p.lastT = Date.now();
          p.vx = 0;
        }}
        onResponderMove={(e) => {
          const p = pan.current;
          const at = Date.now();
          p.vx = 0.6 * p.vx + 0.4 * ((e.nativeEvent.pageX - p.lastX) / Math.max(1, at - p.lastT));
          p.lastX = e.nativeEvent.pageX;
          p.lastT = at;
          let dx = e.nativeEvent.pageX - p.x0;
          // Nothing beyond this month or before your first day: rubber-band instead.
          if ((page >= 0 && dx < 0) || (page <= min && dx > 0)) dx *= 0.3;
          x.set(p.base + dx);
        }}
        onResponderRelease={() => {
          const p = pan.current;
          p.endedAt = Date.now();
          const dx = p.lastX - p.x0;
          const dir = dx < -w * 0.22 || p.vx < -0.35 ? 1 : dx > w * 0.22 || p.vx > 0.35 ? -1 : 0;
          settle(page + dir);
        }}
        onResponderTerminate={() => {
          pan.current.endedAt = Date.now();
          settle(page);
        }}>
        <Animated.View style={[StyleSheet.absoluteFill, strip]}>
          {w > 0
            ? panes.map((p) => (
                <MonthPane key={p} offset={p} now={now} left={p * w} width={w} cell={cell} state={state} onOpenDay={openDay} />
              ))
            : null}
        </Animated.View>
      </View>

      <View style={{ gap: S.sm }}>
        <Txt v="footnote" color={C.label2}>
          {monthLine(state, grid)}
        </Txt>
        <View style={styles.legend} accessible accessibilityLabel="Colour shows your morning mood, from unpleasant to pleasant">
          <Txt v="caption2" color={C.label3}>
            Unpleasant
          </Txt>
          <LinearGradient colors={VALENCE_COLORS} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.scale} />
          <Txt v="caption2" color={C.label3}>
            Pleasant
          </Txt>
        </View>
      </View>
    </Card>
  );
}

function Arrow({ icon: I, label, disabled, onPress }: { icon: LucideIcon; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      scaleTo={0.88}
      onPress={onPress}
      style={[styles.arrow, { opacity: disabled ? 0.3 : 1 }]}>
      <I size={18} color={C.label} strokeWidth={2.6} />
    </Pressy>
  );
}

function MonthPane({
  offset,
  now,
  left,
  width,
  cell,
  state,
  onOpenDay,
}: {
  offset: number;
  now: number;
  left: number;
  width: number;
  cell: number;
  state: State;
  onOpenDay: (key: string) => void;
}) {
  const grid = monthGrid(offset, now);
  return (
    <View style={{ position: 'absolute', top: 0, left, width, gap: GAP, padding: INSET }}>
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <View key={r} style={{ flexDirection: 'row', gap: GAP }}>
          {grid.days.slice(r * 7, r * 7 + 7).map((d) => (
            <DayCell key={d.key} day={d} size={cell} valence={d.inMonth ? valenceOf(state.days[d.key]) : undefined} onOpen={onOpenDay} />
          ))}
        </View>
      ))}
    </View>
  );
}

function DayCell({ day, size, valence, onOpen }: { day: CalDay; size: number; valence?: number; onOpen: (key: string) => void }) {
  if (!day.inMonth) return <View style={{ width: size, height: size }} />;
  const radius = Math.round(size * 0.3);
  const fill = valence ? VALENCE[valence - 1].color : day.future ? 'transparent' : C.fill4;
  const ink = valence ? (darkInk(valence) ? 'rgba(0,0,0,0.72)' : C.label) : day.future ? C.label4 : C.label3;
  const square = (
    <View style={[styles.square, { width: size, height: size, borderRadius: radius, backgroundColor: fill }]}>
      <Text style={[styles.num, { color: ink, fontSize: Math.round(size * 0.34) }]}>{day.day}</Text>
    </View>
  );
  return (
    <View style={{ width: size, height: size }}>
      {day.today ? <View pointerEvents="none" style={[styles.ring, { borderRadius: radius + 4 }]} /> : null}
      {day.future ? (
        square
      ) : (
        <Pressy
          accessibilityRole="button"
          accessibilityLabel={`${dayTitle(day.key)}${day.today ? ', today' : ''}: ${valence ? VALENCE[valence - 1].label : 'no check-in'}`}
          scaleTo={0.86}
          onPress={() => onOpen(day.key)}>
          {square}
        </Pressy>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  arrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.fill3, alignItems: 'center', justifyContent: 'center' },
  letters: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: -S.xs },
  letter: { fontFamily: FONT.system, fontSize: 12, fontWeight: '600', color: C.label3, textAlign: 'center' },
  square: { alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: FONT.rounded, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ring: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 2, borderColor: C.label },
  legend: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  scale: { flex: 1, height: 6, borderRadius: 3 },
});
