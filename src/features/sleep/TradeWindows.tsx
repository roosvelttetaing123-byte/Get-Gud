/**
 * Trade windows: when your body clock (and, once learned, your own results) say to trade today.
 * Hero is the open or next window; below it, how you've done in each phase of your day.
 */
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { fmtRx } from '@/features/journal/format';
import { addDays, clockLabel, type Schedule } from '@/lib/sleep';
import { EDGE_MIN, tradeWindows, type SleepEdge, type TradeWindow } from '@/lib/sleepEdge';
import { Card, Divider, Txt } from '@/ui';

import { EdgeRow } from './EdgeRow';
import { PHASE_LOOK } from './look';

function why(w: TradeWindow, learned: boolean): string {
  const s = w.stat;
  if (learned && s && s.n >= EDGE_MIN) return `${w.label}. You average ${fmtRx(s.avgR)} here.`;
  return `${w.label}. Your sharpest hours.`;
}

export function TradeWindows({ sched, edge, now }: { sched: Schedule; edge: SleepEdge; now: number }) {
  const { windows, learned } = tradeWindows(sched, edge, now);
  const hero = windows[0];
  // All of today's good phases have passed: point at tomorrow's first one (the body clock barely moves overnight).
  const tomorrow = hero ? undefined : tradeWindows(sched, edge, -Infinity).windows[0];
  const color = hero ? PHASE_LOOK[hero.phase].color : C.label;
  const max = Math.max(0, ...edge.byPhase.map((b) => Math.abs(b.avgR)));

  return (
    <View style={{ gap: S.sm }}>
      <Card padding={S.lg} style={{ gap: S.md }}>
        <View style={{ gap: 2, paddingHorizontal: 4 }}>
          <Txt v="footnote" color={C.label2}>
            {hero ? (hero.open ? 'Window open' : 'Next window') : 'Done for today'}
          </Txt>
          <Txt v="title2" color={color} tabular>
            {hero
              ? `${clockLabel(hero.start)}–${clockLabel(hero.end)}`
              : tomorrow
                ? `Tomorrow ${clockLabel(addDays(tomorrow.start, 1))}`
                : 'Rest up'}
          </Txt>
          <Txt v="subhead" color={C.label2}>
            {hero
              ? hero.open
                ? `${why(hero, learned)} Until ${clockLabel(hero.end)}.`
                : why(hero, learned)
              : 'Your best hours are behind you. Late trades are tired trades.'}
          </Txt>
        </View>
        {windows.length > 1 ? (
          <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: 4 }}>
            {`Then ${windows
              .slice(1)
              .map((w) => `${w.label.toLowerCase()} ${clockLabel(w.start)}–${clockLabel(w.end)}`)
              .join(', ')}.`}
          </Txt>
        ) : null}
      </Card>

      {edge.byPhase.length ? (
        <Card padding={0} style={{ gap: 0 }}>
          {edge.byPhase.map((b, i) => {
            const p = sched.phases.find((x) => x.id === b.id);
            return (
              <View key={b.id}>
                {i > 0 ? <Divider inset={58} /> : null}
                <EdgeRow
                  bucket={p ? { ...b, label: p.label } : b}
                  max={max}
                  icon={PHASE_LOOK[b.id].icon}
                  color={PHASE_LOOK[b.id].color}
                  value={p && b.id !== 'sleep' ? `${clockLabel(p.start)}–${clockLabel(p.end)}` : undefined}
                />
              </View>
            );
          })}
        </Card>
      ) : null}

      <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: S.lg }}>
        {learned
          ? 'Your best phases, from your own trades. Market sessions play a part too.'
          : `Your two energy peaks. After ${EDGE_MIN} trades in two phases, this learns from your results.`}
      </Txt>
    </View>
  );
}
