/**
 * Screen Time-style bar chart of net R per day: green up, red down, around a zero line.
 * 7 days shows a weekday letter under each bar; 30 days shows thinner bars with weekly dates.
 *
 * Press and drag across the bars to read each day in the header (Stocks-style); let go and it
 * returns to the total. A quick tap keeps that day in the header until you tap it again.
 */
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { C, FONT, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Card, Num, Segmented, Txt, useSpringValue } from '@/ui';

import { count, fmtRx, pct, rColor } from './format';
import { barLine, type DayBar, type Range, type Series } from './insight';

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const PLOT_H = 140; // bars live here
const HEAD = 10; // room above the tallest bar for the reading line
const AXIS_W = 36; // right-hand scale labels
const TICK_H = 26;
/** A tap is a short press that barely moves; anything else is a scrub. */
const TAP_MS = 350;
const TAP_SLOP = 6;
const WEB_SCRUB = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as object) : null;

export function RChart({
  series,
  range,
  onRange,
}: {
  series: Series;
  range: Range;
  onRange: (r: Range) => void;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const day = sel !== null ? series.bars[sel] : null;
  const net = useSpringValue(series.netR, 'smooth');
  const shown = day ? day.netR : Math.round(net * 100) / 100;
  const color = day ? (day.closed ? rColor(day.netR) : C.label3) : series.closed ? rColor(series.netR) : C.label2;
  const sub = day
    ? barLine(day)
    : series.closed
      ? `${pct(series.winRate)} win rate · ${count(series.closed, 'trade')}`
      : 'No closed trades';

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <Segmented
        options={RANGES}
        value={range}
        onChange={(r) => {
          setSel(null);
          onRange(r);
        }}
      />
      <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
        <Txt v="footnote" weight="600" color={day ? C.label : C.label2} numberOfLines={1}>
          {day ? day.title : series.title}
        </Txt>
        <Num size={34} color={color} numberOfLines={1}>
          {fmtRx(shown)}
        </Num>
        <Txt v="footnote" color={C.label2} numberOfLines={1}>
          {sub}
        </Txt>
      </View>
      {/* Remount per range so the bars grow in again. */}
      <Bars key={range} bars={series.bars} thin={range === '30d'} sel={sel} onSelect={setSel} />
    </Card>
  );
}

/** Round a scale maximum up to a friendly step. */
function niceMax(v: number) {
  if (v <= 0) return 0;
  const steps = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 100];
  return steps.find((s) => s >= v - 1e-9) ?? Math.ceil(v / 50) * 50;
}

/** A bar with rounded far-end corners and a flat base on the zero line. */
function barPath(x: number, w: number, zeroY: number, h: number, up: boolean) {
  const r = Math.min(w / 2, 6, h);
  if (up) {
    const top = zeroY - h;
    return `M${x},${zeroY}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${zeroY}Z`;
  }
  const bot = zeroY + h;
  return `M${x},${zeroY}V${bot - r}Q${x},${bot} ${x + r},${bot}H${x + w - r}Q${x + w},${bot} ${x + w},${bot - r}V${zeroY}Z`;
}

function spokenBar(b: DayBar) {
  return b.closed ? `${b.spoken}: ${fmtRx(b.netR)}, ${barLine(b)}` : `${b.spoken}: ${barLine(b)}`;
}

function Bars({
  bars,
  thin,
  sel,
  onSelect,
}: {
  bars: DayBar[];
  thin: boolean;
  sel: number | null;
  onSelect: (i: number | null) => void;
}) {
  const [width, setWidth] = useState(0);
  const grow = useSpringValue(1, 'smooth', 0);
  const touch = useRef({ origin: 0, x0: 0, t0: 0, moved: false, i: -1, was: null as number | null });

  const plotW = Math.max(0, width - AXIS_W);
  const n = bars.length;
  const slot = n ? plotW / n : 0;
  const barW = thin ? Math.max(3, Math.min(8, slot * 0.62)) : Math.min(28, slot * 0.56);

  const maxPos = niceMax(Math.max(0, ...bars.map((b) => b.netR)));
  const maxNeg = niceMax(Math.max(0, ...bars.map((b) => -b.netR)));
  const top = maxPos || (maxNeg ? 0 : 1);
  const span = top + maxNeg;
  const y0 = HEAD;
  const zeroY = y0 + (span ? (top / span) * PLOT_H : PLOT_H);
  const scale = span ? PLOT_H / span : 0;
  const H = HEAD + PLOT_H + 2;

  const cx = (i: number) => slot * (i + 0.5);
  const barTop = (b: DayBar) =>
    b.netR > 0 ? zeroY - Math.max(4, b.netR * scale) : b.netR < 0 ? zeroY : zeroY - 2;

  const gridLabel = (v: number) => (v === 0 ? '0' : fmtRx(v));
  const grids: { y: number; label: string; solid?: boolean }[] = [];
  if (top) grids.push({ y: y0, label: gridLabel(top) });
  grids.push({ y: zeroY, label: '0', solid: true });
  if (maxNeg) grids.push({ y: y0 + PLOT_H, label: gridLabel(-maxNeg) });

  // Scrub: the finger's x on the page, against where the plot starts.
  const indexAt = (pageX: number) => Math.max(0, Math.min(n - 1, Math.floor((pageX - touch.current.origin) / Math.max(1, slot))));
  const pickAt = (pageX: number) => {
    const i = indexAt(pageX);
    if (i === touch.current.i) return;
    touch.current.i = i;
    haptic.tap();
    onSelect(i);
  };

  const selected = sel !== null ? bars[sel] : null;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height: H }}>
        {width > 0 ? (
          <Svg width={width} height={H} style={StyleSheet.absoluteFill}>
            {grids.map((g) => (
              <Line
                key={g.label + g.y}
                x1={0}
                x2={plotW}
                y1={g.y}
                y2={g.y}
                stroke={g.solid ? C.label3 : C.label4}
                strokeWidth={1}
                strokeDasharray={g.solid ? undefined : '2 4'}
              />
            ))}
            {bars.map((b, i) => {
              const dim = sel !== null && sel !== i ? 0.3 : 1;
              const x = cx(i) - barW / 2;
              const column =
                (b.isToday && !thin) || sel === i ? (
                  <Rect
                    x={cx(i) - slot / 2 + (thin ? 0 : 3)}
                    y={y0 - 6}
                    width={thin ? slot : slot - 6}
                    height={PLOT_H + 10}
                    rx={thin ? 3 : 10}
                    fill={sel === i ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'}
                  />
                ) : null;
              return (
                <React.Fragment key={b.key}>
                  {column}
                  {renderBar(b, x, barW, zeroY, scale, grow, dim)}
                </React.Fragment>
              );
            })}
            {selected ? (
              <Line x1={cx(sel!)} x2={cx(sel!)} y1={0} y2={barTop(selected)} stroke={C.label2} strokeWidth={1.5} />
            ) : null}
          </Svg>
        ) : null}

        {/* right-hand scale */}
        {grids.map((g) => (
          <Text key={`l${g.label}${g.y}`} style={[styles.axis, { top: g.y - 7, left: plotW + 6 }]}>
            {g.label}
          </Text>
        ))}

        {/* One flat touch surface over the plot: press, drag, release. */}
        <View
          style={[StyleSheet.absoluteFill, { width: plotW }, WEB_SCRUB]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="R by day"
          accessibilityHint="Drag across the bars to read each day"
          accessibilityValue={{ text: selected ? spokenBar(selected) : 'Total' }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
            const next = sel === null ? (step > 0 ? 0 : n - 1) : Math.max(0, Math.min(n - 1, sel + step));
            onSelect(next);
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const t = touch.current;
            t.origin = e.nativeEvent.pageX - e.nativeEvent.locationX;
            t.x0 = e.nativeEvent.pageX;
            t.t0 = Date.now();
            t.moved = false;
            t.was = sel;
            t.i = sel ?? -1;
            pickAt(e.nativeEvent.pageX);
          }}
          onResponderMove={(e) => {
            if (Math.abs(e.nativeEvent.pageX - touch.current.x0) > TAP_SLOP) touch.current.moved = true;
            pickAt(e.nativeEvent.pageX);
          }}
          onResponderRelease={() => {
            const t = touch.current;
            const tap = !t.moved && Date.now() - t.t0 < TAP_MS;
            // A tap keeps the day (tap it again to let go); a drag or a hold returns to the total.
            const keep = tap && t.was !== t.i ? t.i : null;
            t.i = keep ?? -1;
            onSelect(keep);
          }}
          onResponderTerminate={() => {
            touch.current.i = -1;
            onSelect(null);
          }}
        />
      </View>

      {/* weekday letters (7 days) or weekly dates (30 days) */}
      <View style={{ width: plotW, height: TICK_H }} pointerEvents="none">
        {bars.map((b, i) => {
          const on = sel === i;
          if (thin) {
            // While reading a day, its date replaces the weekly ticks that would crowd it.
            const crowded = sel !== null && !on && Math.abs(sel - i) < 3;
            if ((!b.tick && !on) || crowded) return null;
            return (
              <Text
                key={b.key}
                numberOfLines={1}
                style={[
                  styles.tick,
                  styles.date,
                  {
                    left: cx(i) - 20,
                    color: on ? C.label : b.isToday ? C.label : C.label2,
                    fontWeight: b.isToday || on ? '700' : '500',
                  },
                ]}>
                {on ? b.key.slice(8).replace(/^0/, '') : b.tick}
              </Text>
            );
          }
          return (
            <View
              key={b.key}
              style={[
                styles.letter,
                { left: cx(i) - 11 },
                b.isToday && { backgroundColor: C.label },
                on && !b.isToday && { backgroundColor: C.fill },
              ]}>
              <Text
                style={[
                  styles.tick,
                  { color: b.isToday ? C.bg : on ? C.label : C.label2, fontWeight: b.isToday || on ? '700' : '500' },
                ]}>
                {b.tick}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function renderBar(b: DayBar, x: number, w: number, zeroY: number, scale: number, grow: number, opacity: number) {
  if (!b.closed) return null;
  if (b.netR === 0) {
    // break-even day: a small grey pill on the zero line
    return <Rect x={x} y={zeroY - 2} width={w} height={4} rx={2} fill={C.gray} opacity={opacity} />;
  }
  const h = Math.max(4, Math.abs(b.netR) * scale) * grow;
  if (h < 0.5) return null;
  return <Path d={barPath(x, w, zeroY, h, b.netR > 0)} fill={b.netR > 0 ? C.green : C.red} opacity={opacity} />;
}

const styles = StyleSheet.create({
  axis: {
    position: 'absolute',
    fontFamily: FONT.rounded,
    fontSize: 11,
    fontWeight: '500',
    color: C.label3,
    fontVariant: ['tabular-nums'],
  },
  letter: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { fontFamily: FONT.system, fontSize: 12, textAlign: 'center' },
  date: { position: 'absolute', top: 5, width: 40, fontVariant: ['tabular-nums'] },
});
