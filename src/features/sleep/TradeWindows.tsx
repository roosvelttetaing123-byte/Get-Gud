/**
 * Trade windows: when your body clock (and, once learned, your own results) say to trade today.
 * One card: the open or next window up top, then how you've done in each phase of your day,
 * one tap away so the answer comes first and the evidence second.
 */
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { count, fmtRx } from '@/features/journal/format';
import { addDays, clockLabel, type Schedule } from '@/lib/sleep';
import { EDGE_MIN, tradeWindows, type SleepEdge, type TradeWindow } from '@/lib/sleepEdge';
import { Card, Divider, ListRow, Txt, useSpringValue } from '@/ui';

import { EdgeRow } from './EdgeRow';
import { PHASE_LOOK } from './look';

/** Phases where the body clock runs low. A good result there is likely the market session, not your energy. */
const LOW_ENERGY = new Set(['groggy', 'dip', 'winddown']);

function why(w: TradeWindow, learned: boolean): string {
  const s = w.stat;
  if (learned && s && s.n >= EDGE_MIN) {
    const base = `${w.label}. You average ${fmtRx(s.avgR)} here.`;
    // Don't let this contradict the Energy card above: say why it still works, and how to trade it.
    return LOW_ENERGY.has(w.phase) ? `${base} Energy is low, so take A+ setups only.` : base;
  }
  return `${w.label}. Your sharpest hours.`;
}

export function TradeWindows({ sched, edge, now }: { sched: Schedule; edge: SleepEdge; now: number }) {
  const [open, setOpen] = useState(false);
  const turn = useSpringValue(open ? 1 : 0, 'snappy');
  const { windows, learned } = tradeWindows(sched, edge, now);
  const hero = windows[0];
  // All of today's good phases have passed: point at tomorrow's first one (the body clock barely moves overnight).
  const tomorrow = hero ? undefined : tradeWindows(sched, edge, -Infinity).windows[0];
  const color = hero ? PHASE_LOOK[hero.phase].color : C.label;
  const max = Math.max(0, ...edge.byPhase.map((b) => Math.abs(b.avgR)));
  const traded = edge.byPhase.reduce((a, b) => a + b.n, 0);

  return (
    <View style={{ gap: S.sm }}>
      <Card padding={0} style={{ gap: 0 }}>
        <View style={{ gap: 2, padding: S.lg }}>
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
          {windows.length > 1 ? (
            <Txt v="footnote" color={C.label2} style={{ marginTop: S.xs }}>
              {`Then ${windows
                .slice(1)
                .map((w) => `${w.label.toLowerCase()} ${clockLabel(w.start)}–${clockLabel(w.end)}`)
                .join(', ')}.`}
            </Txt>
          ) : null}
        </View>

        {edge.byPhase.length ? (
          <>
            <Divider inset={S.lg} />
            <ListRow
              title="Results by phase"
              subtitle={`${count(traded, 'trade')} in ${count(edge.byPhase.length, 'phase')}`}
              onPress={() => setOpen(!open)}
              accessory={
                <View style={{ transform: [{ rotate: `${turn * 180}deg` }] }}>
                  <ChevronDown size={18} color={C.label3} strokeWidth={2.4} />
                </View>
              }
            />
            {open
              ? edge.byPhase.map((b) => {
                  const p = sched.phases.find((x) => x.id === b.id);
                  return (
                    <View key={b.id}>
                      <Divider inset={58} />
                      <EdgeRow
                        bucket={p ? { ...b, label: p.label } : b}
                        max={max}
                        icon={PHASE_LOOK[b.id].icon}
                        color={PHASE_LOOK[b.id].color}
                        value={p && b.id !== 'sleep' ? `${clockLabel(p.start)}–${clockLabel(p.end)}` : undefined}
                      />
                    </View>
                  );
                })
              : null}
          </>
        ) : null}
      </Card>

      <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: S.lg }}>
        {learned
          ? 'Your best phases, from your own trades. Market sessions play a part too.'
          : `Your two energy peaks. After ${EDGE_MIN} trades in two phases, this learns from your results.`}
      </Txt>
    </View>
  );
}
