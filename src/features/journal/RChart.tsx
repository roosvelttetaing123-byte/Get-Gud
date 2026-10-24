/**
 * Screen Time-style bar chart of net R per day: green up, red down, around a zero line.
 * Week shows Mon–Sun with day letters; Month shows the last 30 days with thinner bars.
 * Tap a bar for that day's value in a floating label.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { C, FONT, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Card, Num, Row, Segmented, Txt, useSpringValue } from '@/ui';

import { count, fmtRx, pct, rColor } from './format';
import type { DayBar, Range, Series } from './insight';

const RANGES: { value: Range; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const PLOT_H = 132; // bars live here
const BAND = 34; // room above the bars for the floating label
const AXIS_W = 36; // right-hand scale labels
const TICK_H = 26;

export function RChart({
  series,
  range,
  onRange,
}: {
  series: Series;
  range: Range;
  onRange: (r: Range) => void;
}) {
  const net = useSpringValue(series.netR, 'smooth');
  const shown = Math.round(net * 100) / 100;
  const sub = series.closed
    ? `${pct(series.winRate)} win rate · ${count(series.closed, 'trade')}`
    : 'No closed trades yet';

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <Row align="flex-start" gap={S.md}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="footnote" weight="600" color={C.label2}>
            {series.title}
          </Txt>
          <Num size={34} color={series.closed ? rColor(series.netR) : C.label2} numberOfLines={1}>
            {fmtRx(shown)}
          </Num>
          <Txt v="footnote" color={C.label2} numberOfLines={1}>
            {sub}
          </Txt>
        </View>
        <View style={{ width: 132 }}>
          <Segmented options={RANGES} value={range} onChange={onRange} />
        </View>
      </Row>
      {/* Remount per range so bars grow in again and the selection resets. */}
      <Bars key={range} bars={series.bars} thin={range === 'month'} />
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

function Bars({ bars, thin }: { bars: DayBar[]; thin: boolean }) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [labelW, setLabelW] = useState(0);
  const grow = useSpringValue(1, 'smooth', 0);

  const plotW = Math.max(0, width - AXIS_W);
  const n = bars.length;
  const slot = n ? plotW / n : 0;
  const barW = thin ? Math.max(3, Math.min(8, slot * 0.62)) : Math.min(28, slot * 0.56);

  const maxPos = niceMax(Math.max(0, ...bars.map((b) => b.netR)));
  const maxNeg = niceMax(Math.max(0, ...bars.map((b) => -b.netR)));
  const top = maxPos || (maxNeg ? 0 : 1);
  const span = top + maxNeg;
  const y0 = BAND;
  const zeroY = y0 + (span ? (top / span) * PLOT_H : PLOT_H);
  const scale = span ? PLOT_H / span : 0;
  const H = BAND + PLOT_H + 2;

  const selected = sel !== null ? bars[sel] : null;
  const cx = (i: number) => slot * (i + 0.5);
  const barTop = (b: DayBar) =>
    b.netR > 0 ? zeroY - Math.max(4, b.netR * scale) : b.netR < 0 ? zeroY : zeroY - 2;

  const gridLabel = (v: number) => (v === 0 ? '0' : fmtRx(v));
  const grids: { y: number; label: string; solid?: boolean }[] = [];
  if (top) grids.push({ y: y0, label: gridLabel(top) });
  grids.push({ y: zeroY, label: '0', solid: true });
  if (maxNeg) grids.push({ y: y0 + PLOT_H, label: gridLabel(-maxNeg) });

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
              if (b.future) return null;
              const dim = sel !== null && sel !== i ? 0.32 : 1;
              const x = cx(i) - barW / 2;
              if (b.isToday && !thin) {
                // a soft column marks today
                return (
                  <React.Fragment key={b.key}>
                    <Rect
                      x={cx(i) - slot / 2 + 3}
                      y={y0 - 6}
                      width={slot - 6}
                      height={PLOT_H + 10}
                      rx={10}
                      fill="rgba(255,255,255,0.055)"
                    />
                    {renderBar(b, x, barW, zeroY, scale, grow, dim)}
                  </React.Fragment>
                );
              }
              return <React.Fragment key={b.key}>{renderBar(b, x, barW, zeroY, scale, grow, dim)}</React.Fragment>;
            })}
            {selected ? (
              <Line
                x1={cx(sel!)}
                x2={cx(sel!)}
                y1={26}
                y2={barTop(selected)}
                stroke={C.label3}
                strokeWidth={1}
              />
            ) : null}
          </Svg>
        ) : null}

        {/* right-hand scale */}
        {grids.map((g) => (
          <Text key={`l${g.label}${g.y}`} style={[styles.axis, { top: g.y - 7, left: plotW + 6 }]}>
            {g.label}
          </Text>
        ))}

        {/* floating label for the tapped bar */}
        {selected ? (
          <View
            pointerEvents="none"
            onLayout={(e) => setLabelW(e.nativeEvent.layout.width)}
            style={[
              styles.callout,
              {
                opacity: labelW ? 1 : 0,
                left: Math.max(0, Math.min(plotW - labelW, cx(sel!) - labelW / 2)),
              },
            ]}>
            {selected.closed ? (
              <Text style={[styles.calloutNum, { color: rColor(selected.netR) }]}>{fmtRx(selected.netR)}</Text>
            ) : null}
            <Text style={styles.calloutText}>
              {selected.closed ? `${selected.title} · ${count(selected.closed, 'trade')}` : `${selected.title} · No trades`}
            </Text>
          </View>
        ) : null}

        {/* tap targets, one per day */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', width: plotW }]}>
          {bars.map((b, i) => (
            <Pressable
              key={b.key}
              disabled={b.future}
              accessibilityRole="button"
              accessibilityLabel={
                b.closed ? `${b.spoken}: ${fmtRx(b.netR)} from ${count(b.closed, 'trade')}` : `${b.spoken}: no trades`
              }
              onPress={() => {
                haptic.tap();
                setLabelW(0);
                setSel((s) => (s === i ? null : i));
              }}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </View>

      {/* day letters (week) or weekly dates (month) */}
      <View style={{ width: plotW, height: TICK_H }}>
        {bars.map((b, i) => {
          if (!b.tick) return null;
          const on = sel === i;
          if (thin) {
            return (
              <Text
                key={b.key}
                numberOfLines={1}
                style={[
                  styles.tick,
                  styles.date,
                  {
                    left: cx(i) - 20,
                    color: b.isToday || on ? C.label : C.label2,
                    fontWeight: b.isToday || on ? '700' : '500',
                  },
                ]}>
                {b.tick}
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
                on && !b.isToday && { backgroundColor: C.fill2 },
              ]}>
              <Text
                style={[
                  styles.tick,
                  {
                    color: b.isToday ? C.bg : b.future ? C.label3 : C.label2,
                    fontWeight: b.isToday || on ? '700' : '500',
                  },
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
  callout: {
    position: 'absolute',
    top: 0,
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: C.card2,
  },
  calloutNum: { fontFamily: FONT.rounded, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  calloutText: { fontFamily: FONT.system, fontSize: 12, fontWeight: '500', color: C.label2 },
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
