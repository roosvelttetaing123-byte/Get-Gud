/**
 * The last 14 nights as bars against your need, like Health's sleep chart.
 * Press and drag across them: the header swaps to that night ("Sat 24 Oct", "8 h 50 m ·
 * 00:44–09:46") and its bar lights up. Let go and it's back to the summary. A tap pins a
 * night until you tap it again. Vertical swipes still scroll the page.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { C, S, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { fmtDur, nights } from '@/lib/sleep';
import type { SleepLog } from '@/lib/store';
import { Card, Row, Txt } from '@/ui';

import { averageHours, nightFacts, nightName } from './format';
import { SLEEP_TINT } from './look';
import { useDrag } from './useDrag';

const H = 96;
const GAP = 5;
const LETTERS = 18;
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Hold this long, or move sideways, before a touch scrubs, so a scroll never flashes a night. */
const HOLD = 110;
const TAP_MS = 350;

const WEB_SCRUB =
  Platform.OS === 'web'
    ? ({ touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' } as object)
    : null;

export function NightBars({ logs, need, now }: { logs: SleepLog[]; need: number; now: number }) {
  const ns = nights(logs, now);
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const g = useRef<{ x0: number; t0: number; moved: boolean; was: number; cur: number; timer?: ReturnType<typeof setTimeout> }>({
    x0: 0,
    t0: 0,
    moved: false,
    was: -1,
    cur: -1,
  });

  useEffect(() => {
    const s = g.current;
    return () => clearTimeout(s.timer);
  }, []);

  const bw = w > 0 ? (w - GAP * (ns.length - 1)) / ns.length : 0;
  const indexAt = (x: number) => Math.max(0, Math.min(ns.length - 1, Math.floor((x + GAP / 2) / (bw + GAP))));
  const show = (i: number) => {
    const s = g.current;
    if (s.cur !== i) {
      if (s.cur !== -1) haptic.tap();
      s.cur = i;
    }
    setSel(i);
    setPinned(false);
  };
  const choose = (i: number | null, pin: boolean) => {
    setSel(i);
    setPinned(pin);
  };

  const { ref, props } = useDrag(
    {
      accept: () => bw > 0,
      start: (x) => {
        const s = g.current;
        clearTimeout(s.timer);
        Object.assign(s, { x0: x, t0: Date.now(), moved: false, was: pinned && sel !== null ? sel : -1, cur: -1 });
        s.timer = setTimeout(() => show(indexAt(x)), HOLD);
      },
      move: (x) => {
        const s = g.current;
        if (!s.moved && Math.abs(x - s.x0) < 4) return;
        s.moved = true;
        clearTimeout(s.timer);
        show(indexAt(x));
      },
      end: (how) => {
        const s = g.current;
        clearTimeout(s.timer);
        s.cur = -1;
        if (how === 'cancel') {
          // The page scrolled: put back whatever was pinned before the touch.
          choose(s.was >= 0 ? s.was : null, s.was >= 0);
        } else if (!s.moved && Date.now() - s.t0 < TAP_MS) {
          const i = indexAt(s.x0);
          if (s.was === i) choose(null, false);
          else {
            haptic.tap();
            choose(i, true);
          }
        } else choose(null, false);
      },
    },
    'pan-y',
  );

  const n = sel !== null ? ns[sel] : undefined;
  const avg = averageHours(ns);
  const top = Math.max(10, need + 1.5, ...ns.map((x) => x.hours));
  const y = (v: number) => H - (Math.min(v, top) / top) * H;
  const summary = avg !== undefined ? `Avg ${fmtDur(avg)}` : 'No data';
  const step = (d: number) => choose(Math.max(0, Math.min(ns.length - 1, (sel ?? ns.length) + d)), true);
  const spoken = n ? `${nightName(n.key, now)}, ${nightFacts(n)}` : summary;

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }} gap={S.md}>
        <Txt v="subhead" weight="600" numberOfLines={1}>
          {n ? nightName(n.key, now) : 'Last 14 nights'}
        </Txt>
        <Txt v="subhead" color={n ? C.label : C.label2} tabular numberOfLines={1}>
          {n ? nightFacts(n) : summary}
        </Txt>
      </Row>

      <View
        ref={ref}
        {...props}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Last 14 nights"
        accessibilityValue={{ text: spoken }}
        aria-valuetext={spoken}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={[{ height: H + LETTERS }, WEB_SCRUB]}>
        {w > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={w} height={H}>
              {n && sel !== null ? (
                <Line
                  x1={sel * (bw + GAP) + bw / 2}
                  x2={sel * (bw + GAP) + bw / 2}
                  y1={0}
                  y2={Math.max(0, (n.hours ? y(n.hours) : H - 3) - 5)}
                  stroke={C.label2}
                  strokeWidth={1}
                />
              ) : null}
              {ns.map((night, i) => {
                const x = i * (bw + GAP);
                const dim = sel !== null && sel !== i ? 0.3 : 1;
                if (!night.hours) {
                  return <Rect key={night.key} x={x} y={H - 3} width={bw} height={3} rx={1.5} fill={sel === i ? C.label2 : C.fill3} opacity={dim} />;
                }
                const met = night.hours >= need - 0.25;
                return (
                  <Rect
                    key={night.key}
                    x={x}
                    y={y(night.hours)}
                    width={bw}
                    height={H - y(night.hours)}
                    rx={Math.min(5, bw / 2)}
                    fill={met ? SLEEP_TINT : tint(SLEEP_TINT, 0.45)}
                    opacity={dim}
                  />
                );
              })}
              <Line x1={0} x2={w} y1={y(need)} y2={y(need)} stroke={C.label2} strokeWidth={1} strokeDasharray="3 4" />
            </Svg>
            <Row gap={GAP} style={{ marginTop: 5 }}>
              {ns.map((night, i) => (
                <Txt
                  key={night.key}
                  v="caption2"
                  weight={sel === i ? '700' : '400'}
                  color={sel === i ? C.label : C.label3}
                  align="center"
                  style={{ flex: 1 }}>
                  {WEEKDAY[new Date(`${night.key}T12:00:00`).getDay()]}
                </Txt>
              ))}
            </Row>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
