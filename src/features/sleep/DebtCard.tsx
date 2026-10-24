/**
 * Hero: sleep debt as one big number, a zone meter, and the last 14 nights as bars
 * against your need line (like Health's sleep chart, simplified).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { C, S, tint } from '@/constants/theme';
import { fmtDebt, fmtDur, nights, type Debt } from '@/lib/sleep';
import type { SleepLog } from '@/lib/store';
import { Badge, Card, Num, Row, Txt, useSpringValue } from '@/ui';

import { DEBT_LOOK, SLEEP_TINT } from './look';

const METER_MAX = 15;
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DebtCard({ debt, need, logs, now }: { debt: Debt; need: number; logs: SleepLog[]; now: number }) {
  const look = DEBT_LOOK[debt.zone];
  const shown = useSpringValue(debt.hours, 'smooth', 0);
  const fill = useSpringValue(Math.min(1, debt.hours / METER_MAX), 'smooth', 0);
  const [w, setW] = useState(0);
  const empty = debt.known === 0;

  const meta = [`Need ${fmtDur(need)}`, debt.lastNight !== undefined ? `Last night ${fmtDur(debt.lastNight)}` : undefined]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Card padding={S.xl} style={{ gap: S.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="headline" color={C.label2}>
          Sleep debt
        </Txt>
        {empty ? null : <Badge label={look.label} color={look.color} />}
      </Row>

      <Row align="flex-end" gap={6}>
        <Num size={64} weight="700" color={empty ? C.label3 : look.color}>
          {empty ? '--' : fmtDebt(shown)}
        </Num>
        <Txt v="title3" color={C.label2} style={{ marginBottom: 10 }}>
          hours
        </Txt>
      </Row>

      <View style={{ gap: 6 }}>
        <View style={styles.meter} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          <View style={[styles.zone, { flex: 5, backgroundColor: tint(DEBT_LOOK.low.color, 0.28) }]} />
          <View style={[styles.zone, { flex: 5, backgroundColor: tint(DEBT_LOOK.moderate.color, 0.28) }]} />
          <View style={[styles.zone, { flex: 5, backgroundColor: tint(DEBT_LOOK.high.color, 0.28) }]} />
          {w > 0 && !empty ? (
            <View style={[styles.knob, { left: Math.max(0, Math.min(w - 14, fill * w - 7)), backgroundColor: look.color }]} />
          ) : null}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          {['0', '5', '10', '15+'].map((l) => (
            <Txt key={l} v="caption2" color={C.label3} tabular>
              {l}
            </Txt>
          ))}
        </Row>
      </View>

      <Txt v="subhead" color={C.label2}>
        {empty ? 'Log a night to see your debt. Under 5 hours is the goal.' : meta}
      </Txt>

      <Nights logs={logs} need={need} now={now} />
    </Card>
  );
}

function Nights({ logs, need, now }: { logs: SleepLog[]; need: number; now: number }) {
  const ns = nights(logs, now);
  const [w, setW] = useState(0);
  const h = 84;
  const top = Math.max(10, need + 1.5, ...ns.map((n) => n.hours));
  const y = (v: number) => h - (Math.min(v, top) / top) * h;
  const gap = 5;
  const bw = w > 0 ? (w - gap * (ns.length - 1)) / ns.length : 0;

  return (
    <View style={{ gap: 6 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
        {w > 0 ? (
          <Svg width={w} height={h}>
            {ns.map((n, i) => {
              const x = i * (bw + gap);
              if (!n.hours) return <Rect key={n.key} x={x} y={h - 3} width={bw} height={3} rx={1.5} fill={C.fill3} />;
              const met = n.hours >= need - 0.25;
              return (
                <Rect
                  key={n.key}
                  x={x}
                  y={y(n.hours)}
                  width={bw}
                  height={h - y(n.hours)}
                  rx={Math.min(5, bw / 2)}
                  fill={met ? SLEEP_TINT : tint(SLEEP_TINT, 0.45)}
                />
              );
            })}
            <Line x1={0} x2={w} y1={y(need)} y2={y(need)} stroke={C.label2} strokeWidth={1} strokeDasharray="3 4" />
          </Svg>
        ) : null}
      </View>
      <Row gap={gap}>
        {ns.map((n) => {
          const d = new Date(`${n.key}T12:00:00`);
          return (
            <Txt key={n.key} v="caption2" color={C.label3} align="center" style={{ flex: 1 }}>
              {WEEKDAY[d.getDay()]}
            </Txt>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { height: 10, borderRadius: 5, flexDirection: 'row', gap: 2, overflow: 'visible' },
  zone: { height: 10, borderRadius: 5 },
  knob: {
    position: 'absolute',
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.card,
  },
});
