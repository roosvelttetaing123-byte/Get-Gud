/**
 * Equity, prop-firm style: the running total of R (and the balance, once an account is set up)
 * as one gold line you can scrub, then six numbers a funded trader checks: win rate, profit
 * factor, expectancy, average win and loss, and the deepest drawdown.
 *
 * Press and drag along the line to read the total after any trade (Stocks-style); let go and it
 * returns to now. VoiceOver steps through trades with increment / decrement.
 */
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { C, R, S, SYS } from '@/constants/theme';
import { fmtMoney, fmtPct, type Performance } from '@/lib/account';
import { haptic } from '@/lib/haptics';
import { Card, Num, Txt, useSpringValue } from '@/ui';

import { count, fmtRx, MONTHS, pct, WEEKDAYS } from './format';

const PLOT_H = 132;
const PAD_Y = 8;
const LINE = C.tint;
const WEB_SCRUB = Platform.OS === 'web' ? ({ touchAction: 'pan-y', userSelect: 'none', cursor: 'pointer' } as object) : null;

const dateOf = (ts: number) => {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export function EquityCard({
  perf,
  account,
  since,
}: {
  perf: Performance;
  /** Account size and risk %, to show the balance next to R. */
  account?: { size: number; riskPct: number };
  /** "Since 6 Nov" when a phase is running; otherwise all trades. */
  since: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const pts = perf.curve;
  const last = pts[pts.length - 1]?.r ?? 0;
  const total = useSpringValue(last, 'smooth');
  const r = sel !== null ? pts[sel].r : Math.round(total * 100) / 100;
  const u = pts[sel ?? pts.length - 1]?.u ?? 0;
  const title = sel === null ? since : sel === 0 ? 'Start' : `Trade ${sel} · ${dateOf(pts[sel].ts)}`;
  const money = account ? fmtMoney(account.size, 100 + u * account.riskPct) : null;

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
        <Txt v="footnote" weight="600" color={sel === null ? C.label2 : C.label} numberOfLines={1}>
          {title}
        </Txt>
        <View style={styles.hero}>
          <Num size={34} color={r > 0 ? SYS.green : C.label} numberOfLines={1}>
            {money ?? fmtRx(r)}
          </Num>
          <Txt v="subhead" weight="600" rounded tabular color={C.label2}>
            {money ? `${fmtRx(r)} · ${fmtPct(u * account!.riskPct)}` : count(perf.closed, 'trade')}
          </Txt>
        </View>
      </View>

      {pts.length > 2 ? <Curve pts={pts} sel={sel} onSelect={setSel} /> : null}

      <View style={styles.tiles}>
        <Tile label="Win rate" value={pct(perf.winRate)} />
        <Tile label="Profit factor" value={Number.isFinite(perf.profitFactor) ? perf.profitFactor.toFixed(2) : 'All wins'} />
        <Tile label="Expectancy" value={fmtRx(perf.expectancy)} />
        <Tile label="Avg win" value={fmtRx(perf.avgWin)} />
        <Tile label="Avg loss" value={fmtRx(perf.avgLoss)} />
        <Tile label="Drawdown" value={fmtRx(perf.maxDrawdown)} />
      </View>
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Txt v="caption1" weight="600" color={C.label2} numberOfLines={1}>
        {label}
      </Txt>
      <Num size={20} weight="700" numberOfLines={1}>
        {value}
      </Num>
    </View>
  );
}

function Curve({ pts, sel, onSelect }: { pts: { ts: number; r: number; u: number }[]; sel: number | null; onSelect: (i: number | null) => void }) {
  const [width, setWidth] = useState(0);
  const touch = useRef({ origin: 0, i: -1 });
  const n = pts.length;
  const lo = Math.min(0, ...pts.map((p) => p.r));
  const hi = Math.max(0, ...pts.map((p) => p.r));
  const span = hi - lo || 1;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * (width - 8) + 4 : width / 2);
  const y = (v: number) => PAD_Y + ((hi - v) / span) * (PLOT_H - PAD_Y * 2);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.r).toFixed(1)}`).join('');
  const area = `${line}L${x(n - 1).toFixed(1)},${PLOT_H}L${x(0).toFixed(1)},${PLOT_H}Z`;
  const zeroY = y(0);

  const pickAt = (pageX: number) => {
    const i = Math.max(0, Math.min(n - 1, Math.round(((pageX - touch.current.origin - 4) / Math.max(1, width - 8)) * (n - 1))));
    if (i === touch.current.i) return;
    touch.current.i = i;
    haptic.tap();
    onSelect(i);
  };
  const end = sel ?? n - 1;

  return (
    <View style={{ height: PLOT_H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={PLOT_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={LINE} stopOpacity={0.28} />
              <Stop offset="1" stopColor={LINE} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={C.label4} strokeWidth={1} strokeDasharray="2 4" />
          <Path d={area} fill="url(#eqFill)" />
          <Path d={line} stroke={LINE} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {sel !== null ? <Line x1={x(sel)} x2={x(sel)} y1={0} y2={PLOT_H} stroke={C.label2} strokeWidth={1.5} /> : null}
          <Circle cx={x(end)} cy={y(pts[end].r)} r={5} fill={LINE} stroke={C.card} strokeWidth={2} />
        </Svg>
      ) : null}
      <View
        style={[StyleSheet.absoluteFill, WEB_SCRUB]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Equity curve"
        accessibilityHint="Drag along the line to read the total after each trade"
        accessibilityValue={{ text: sel === null ? `Now ${fmtRx(pts[n - 1].r)}` : `Trade ${sel}: ${fmtRx(pts[sel].r)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          onSelect(Math.max(0, Math.min(n - 1, (sel ?? n - 1) + step)));
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          touch.current.origin = e.nativeEvent.pageX - e.nativeEvent.locationX;
          touch.current.i = -1;
          pickAt(e.nativeEvent.pageX);
        }}
        onResponderMove={(e) => pickAt(e.nativeEvent.pageX)}
        onResponderRelease={() => {
          touch.current.i = -1;
          onSelect(null);
        }}
        onResponderTerminate={() => {
          touch.current.i = -1;
          onSelect(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'baseline', gap: S.sm, flexWrap: 'wrap' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', rowGap: S.md, columnGap: S.sm },
  tile: { width: '31%', flexGrow: 1, gap: 2, paddingVertical: S.sm, paddingHorizontal: S.md, borderRadius: R.inner, backgroundColor: C.fill4 },
});
