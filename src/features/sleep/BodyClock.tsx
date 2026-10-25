/**
 * Body clock: today on a 24-hour dial (iOS Clock's sleep dial crossed with Rise).
 *
 *   ring   your day in phase colours, as wide and as bright as your energy at that hour
 *   night  the sleep arc, moon at bedtime and alarm at wake
 *   gold   your trade windows, just outside the ring
 *   hand   now
 *
 * Drag the hand, or anywhere on the ring, to scrub. The centre says the time, the phase,
 * your energy and what that hour is good for. Let go and the hand springs back to now.
 *
 * Only this component re-renders while you scrub, and only when the readout changes (every
 * 5 minutes of dial). The ring is a separate memoised layer and the hand turns on a shared
 * value, so the finger and the hand move 1:1 without React in between.
 */
import { AlarmClock, CandlestickChart, Moon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { C, FONT, SPRING, SYS } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { clockLabel, energyOn, type PhaseId, type Schedule } from '@/lib/sleep';
import type { TradeWindow } from '@/lib/sleepEdge';
import { Num, Txt, useReduceMotion } from '@/ui';

import { GOOD_FOR, angleFrom, angleOf, arc, nearest, phaseIdAt, pointerAngle, polar, readAt, timeAt, type Reading } from './dial';
import { PHASE_LOOK } from './look';
import { useDrag } from './useDrag';

/** Largest dial, so it stays a dial on wide phones and tablets. */
const MAX = 340;
/** Energy that fills the ring to full width and brightness. The model rarely goes above it. */
const FULL = 88;
/** A nearly flat day still shows as nearly flat: the width scale never spans less than this. */
const MIN_SPREAD = 30;
/** What a dim, low-energy stretch of ring fades toward: the card colour. */
const BASE = C.card;

function geometry(size: number) {
  const c = size / 2;
  const w = Math.round(size * 0.094); // widest ribbon, at full energy
  const mid = c - 10 - w / 2; // ribbon centre line, where the hand's knob rides
  const inner = mid - w / 2;
  return {
    size,
    c,
    w,
    mid,
    inner,
    trade: c - 3.5, // trade-window arcs, just outside the ring
    tick: inner - 5, // hour ticks run inward from here
    label: inner - 24, // 00, 06, 12, 18
    knob: Math.round(w * 0.92),
    handle: Math.round(w * 0.86), // moon and alarm
  };
}
type Geo = ReturnType<typeof geometry>;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Opaque mix, so overlapping slices never show seams the way stacked transparency would. */
function mix(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

type DialProps = {
  sched: Schedule;
  now: number;
  /** All of today's trade windows, past ones too. */
  windows: TradeWindow[];
  /** A moment to show instead of now, e.g. the phase you tapped in the list. The hand swings there. */
  focus?: number;
};

export function BodyClock(p: DialProps) {
  const [size, setSize] = useState(0);
  return (
    <View style={styles.box} onLayout={(e) => setSize(Math.round(Math.min(MAX, e.nativeEvent.layout.width)))}>
      {size > 0 ? <Dial size={size} {...p} /> : null}
    </View>
  );
}

function Dial({ size, sched, now, windows, focus }: DialProps & { size: number }) {
  const g = geometry(size);
  const reduce = useReduceMotion();
  // The dial's 24 hours start at this morning's wake (or now, if you're not up yet).
  const anchor = Math.min(sched.wakeAt, now);
  const angle = useSharedValue(angleOf(now));
  const lift = useSharedValue(1);
  const [scrub, setScrub] = useState<number | null>(null);
  const drag = useRef({ on: false, cur: 0, t: 0, id: '' });
  const shownFocus = useRef(focus);
  // Where the hand rests when nobody is touching it.
  const rest = focus ?? now;

  // Follow the clock while idle, and swing (on a spring) to a tapped phase and back.
  useEffect(() => {
    if (drag.current.on) return;
    const swing = shownFocus.current !== focus && !reduce;
    shownFocus.current = focus;
    const a = nearest(angleOf(rest), angle.get());
    angle.set(swing ? withSpring(a, SPRING.smooth) : a);
  }, [rest, focus, reduce, angle]);

  const r = readAt(sched, windows, scrub ?? rest, now, scrub === null && focus === undefined);

  const aim = (deg: number, first: boolean) => {
    const d = drag.current;
    const a = nearest(deg, d.cur);
    d.cur = a;
    // A touch away from the hand glides it over; after that the hand is glued to the finger.
    angle.set(first && !reduce && Math.abs(a - angle.get()) > 6 ? withSpring(a, SPRING.snappy) : a);
    const t = timeAt(a, anchor);
    if (t === d.t) return;
    d.t = t;
    const id = phaseIdAt(sched, t);
    if (id !== d.id) {
      if (!first) haptic.tap();
      d.id = id;
    }
    setScrub(t);
  };

  const { ref, props } = useDrag(
    {
      // The ring and its gold arcs take the touch; the face in the middle still scrolls the page.
      accept: (x, y) => {
        const dist = Math.hypot(x - g.c, y - g.c);
        return dist >= g.inner - 18 && dist <= g.c + 6;
      },
      start: (x, y) => {
        const d = drag.current;
        d.on = true;
        d.cur = angle.get();
        d.t = 0;
        d.id = phaseIdAt(sched, rest);
        lift.set(reduce ? 1.15 : withSpring(1.15, SPRING.snappy));
        aim(pointerAngle(x, y, g.c), true);
      },
      move: (x, y) => aim(pointerAngle(x, y, g.c), false),
      end: () => {
        const d = drag.current;
        d.on = false;
        const home = nearest(angleOf(rest), d.cur);
        angle.set(reduce ? home : withSpring(home, SPRING.smooth));
        lift.set(reduce ? 1 : withSpring(1, SPRING.bouncy));
        setScrub(null);
      },
    },
    'capture',
  );

  const label = `Body clock. ${r.rel}, ${clockLabel(r.t)}, ${r.name}. ${r.level}. Good for ${GOOD_FOR[r.id].toLowerCase()}.${r.window ? ' Trade window.' : ''}`;

  return (
    <View
      ref={ref}
      {...props}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[{ width: size, height: size }, WEB_SURFACE]}>
      <Face g={g} sched={sched} windows={windows} now={now} day={anchor} />
      <Hand g={g} angle={angle} lift={lift} color={hueOf(r.id)} />
      <Readout g={g} r={r} />
    </View>
  );
}

const WEB_SURFACE =
  Platform.OS === 'web'
    ? ({ touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', cursor: 'grab', WebkitTapHighlightColor: 'transparent' } as object)
    : null;

/* ---------- the static face: ring, night arc, trade windows, ticks ---------- */

interface Slice {
  d: string;
  fill: string;
  /** Already behind you today. Drawn dimmed, the way Rise greys out the morning you've had. */
  past: boolean;
}

/** One short slice per 10 minutes of curve, each as wide and bright as your energy there. */
function ribbon(g: Geo, sched: Schedule, day: number, now: number): Slice[] {
  const curve = sched.curve;
  const out: Slice[] = [];
  if (curve.length < 2) return out;
  const first = curve[0].t;
  const last = curve[curve.length - 1].t;
  // Width shows where today's peaks and dips are (relative to your own range, so they stand
  // out); brightness shows how much energy there is in absolute terms.
  const lo = Math.min(...curve.map((q) => q.e));
  const hi = Math.max(lo + MIN_SPREAD, ...curve.map((q) => q.e));
  const half = (e: number) => (g.w / 2) * (0.2 + 0.8 * clamp01((e - lo) / (hi - lo)));
  const GAP = 0.7; // degrees trimmed off each end of a phase, so phases read as segments
  for (const p of sched.phases) {
    if (p.id === 'sleep') continue;
    const s = Math.max(p.start, first);
    const e = Math.min(p.end, last);
    if (e <= s) continue;
    // Split at now too, so the dimmed past ends exactly under the hand.
    const ts = [s, ...curve.filter((q) => q.t > s && q.t < e).map((q) => q.t), e];
    if (now > s && now < e) ts.splice(ts.findIndex((t) => t > now), 0, now);
    const hue = PHASE_LOOK[p.id].color;
    for (let i = 0; i < ts.length - 1; i++) {
      const e0 = energyOn(sched, ts[i]) ?? 0;
      const e1 = energyOn(sched, ts[i + 1]) ?? 0;
      const lastSlice = i === ts.length - 2;
      const a0 = angleFrom(ts[i], day) + (i === 0 ? GAP : 0);
      // Each slice overlaps the next a touch: opaque fills, so no hairline seams.
      const a1 = angleFrom(ts[i + 1], day) + (lastSlice ? -GAP : 0.3);
      if (a1 <= a0) continue;
      const [h0, h1] = [half(e0), half(e1)];
      const pts = [polar(g.c, g.mid + h0, a0), polar(g.c, g.mid + h1, a1), polar(g.c, g.mid - h1, a1), polar(g.c, g.mid - h0, a0)];
      out.push({
        d: `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`,
        fill: mix(BASE, hue, 0.36 + 0.64 * clamp01((e0 + e1) / 2 / FULL)),
        past: ts[i + 1] <= now,
      });
    }
  }
  return out;
}

const NIGHT = mix(BASE, SYS.indigo, 0.42);
const NIGHT_HANDLE = mix(BASE, SYS.indigo, 0.78);
/** Phase colour on the dial. Sleep's grey disappears on a dark face, so it takes the night's indigo. */
const hueOf = (id: PhaseId) => (id === 'sleep' ? SYS.indigo : PHASE_LOOK[id].color);

function Face({ g, sched, windows, now, day }: { g: Geo; sched: Schedule; windows: TradeWindow[]; now: number; day: number }) {
  const slices = ribbon(g, sched, day, now);
  const sleep = sched.phases.find((p) => p.id === 'sleep');
  // The night ends at your alarm, but never runs into this morning's start on a 24-hour dial.
  const night = sleep
    ? { a0: angleFrom(sleep.start, day), a1: Math.min(angleFrom(sleep.end, day), angleFrom(sched.wakeAt, day) + 360 - 3) }
    : undefined;
  const inset = ((g.handle / 2 + 1) / g.mid) * (180 / Math.PI);
  const handles =
    night && night.a1 - night.a0 > inset * 3
      ? [
          { key: 'moon', icon: Moon, at: polar(g.c, g.mid, night.a0 + inset) },
          { key: 'alarm', icon: AlarmClock, at: polar(g.c, g.mid, night.a1 - inset) },
        ]
      : [];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={g.size} height={g.size}>
        {windows.map((w) => {
          const a0 = angleFrom(w.start, day) + 1;
          const a1 = angleFrom(w.end, day) - 1;
          if (a1 <= a0) return null;
          return (
            <Path
              key={`${w.phase}${w.start}`}
              d={arc(g.c, g.trade, a0, a1)}
              stroke={C.tint}
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
              opacity={w.end <= now ? 0.35 : 1}
            />
          );
        })}
        {/* One group opacity, so the past's overlapping slices dim as a whole without seams. */}
        <G opacity={0.4}>
          {slices.map((s, i) => (s.past ? <Path key={i} d={s.d} fill={s.fill} /> : null))}
        </G>
        {slices.map((s, i) => (s.past ? null : <Path key={i} d={s.d} fill={s.fill} />))}
        {night && night.a1 > night.a0 + inset * 2 ? (
          // Ends at the handle centres, so the round caps hide under the moon and the alarm.
          <Path d={arc(g.c, g.mid, night.a0 + inset, night.a1 - inset)} stroke={NIGHT} strokeWidth={g.w * 0.58} strokeLinecap="round" fill="none" />
        ) : null}
        {handles.map((h) => (
          <Circle key={h.key} cx={h.at[0]} cy={h.at[1]} r={g.handle / 2} fill={NIGHT_HANDLE} stroke={BASE} strokeWidth={1.5} />
        ))}
        {Array.from({ length: 24 }, (_, h) => {
          const major = h % 6 === 0;
          const third = h % 3 === 0;
          const [x0, y0] = polar(g.c, g.tick, h * 15);
          const [x1, y1] = polar(g.c, g.tick - (major ? 9 : third ? 6 : 4), h * 15);
          return (
            <Line
              key={h}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke={major ? C.label2 : third ? C.label3 : C.label4}
              strokeWidth={major ? 2 : 1.5}
              strokeLinecap="round"
            />
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = polar(g.c, g.label, h * 15);
          return (
            <SvgText key={h} x={x} y={y + 4} fill={C.label2} fontSize={12} fontWeight="600" fontFamily={FONT.rounded} textAnchor="middle">
              {String(h).padStart(2, '0')}
            </SvgText>
          );
        })}
      </Svg>
      {handles.map(({ key, icon: I, at }) => (
        <View
          key={key}
          style={[styles.handleIcon, { left: at[0] - g.handle / 2, top: at[1] - g.handle / 2, width: g.handle, height: g.handle }]}>
          <I size={Math.round(g.handle * 0.5)} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      ))}
    </View>
  );
}

/* ---------- the hand ---------- */

function Hand({ g, angle, lift, color }: { g: Geo; angle: SharedValue<number>; lift: SharedValue<number>; color: string }) {
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: lift.get() }] }));
  const k = g.knob;
  const needleTop = g.c - g.mid + k / 2;
  const needleEnd = g.c - (g.tick - 11);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, turn]}>
      <View style={[styles.needle, { left: g.c - 1.25, top: needleTop, height: Math.max(0, needleEnd - needleTop) }]} />
      <Animated.View style={[styles.knob, { left: g.c - k / 2, top: g.c - g.mid - k / 2, width: k, height: k, borderRadius: k / 2 }, pop]}>
        <View style={{ width: k * 0.44, height: k * 0.44, borderRadius: k * 0.22, backgroundColor: color }} />
      </Animated.View>
    </Animated.View>
  );
}

/* ---------- the centre ---------- */

function Readout({ g, r }: { g: Geo; r: Reading }) {
  const half = g.label - 12;
  return (
    <View pointerEvents="none" style={[styles.readout, { left: g.c - half, top: g.c - half, width: half * 2, height: half * 2 }]}>
      <Txt v="caption1" weight="600" color={r.rel === 'Now' ? C.label2 : C.label} numberOfLines={1}>
        {r.rel}
      </Txt>
      <Num size={Math.round(g.size * 0.118)} weight="700">
        {clockLabel(r.t)}
      </Num>
      <Txt v="headline" color={hueOf(r.id)} numberOfLines={1} align="center">
        {r.name}
      </Txt>
      <Txt v="footnote" color={C.label} tabular numberOfLines={1}>
        {r.level}
      </Txt>
      <Txt v="footnote" color={C.label2} numberOfLines={1} align="center">
        {GOOD_FOR[r.id]}
      </Txt>
      {/* Always takes its line, so the readout never jumps when a window starts or ends. */}
      <View style={[styles.windowLine, { opacity: r.window ? 1 : 0 }]}>
        <CandlestickChart size={12} color={C.tint} strokeWidth={2.4} />
        <Txt v="caption1" weight="600" color={C.tint}>
          Trade window
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: MAX, aspectRatio: 1, alignSelf: 'center' },
  handleIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  needle: { position: 'absolute', width: 2.5, borderRadius: 1.25, backgroundColor: 'rgba(255,255,255,0.85)' },
  knob: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  readout: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  windowLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
