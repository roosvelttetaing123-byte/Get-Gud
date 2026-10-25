/**
 * Energy: the body-clock dial as the hero, then today's phases as a list (the same facts
 * without dragging). The current phase is highlighted with its tip; tap any other for its tip.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { C, S, tint } from '@/constants/theme';
import { clockLabel, type Phase, type Schedule } from '@/lib/sleep';
import type { TradeWindow } from '@/lib/sleepEdge';
import { Card, Divider, IconSquare, Pressy, Row, Txt } from '@/ui';

import { BodyClock } from './BodyClock';
import { PHASE_LOOK } from './look';

export function EnergyCard({
  sched,
  now,
  phase,
  windows,
}: {
  sched: Schedule;
  now: number;
  phase?: Phase;
  /** All of today's trade windows, past ones too: the dial marks them. */
  windows: TradeWindow[];
}) {
  const [open, setOpen] = useState<string | undefined>();
  const day = sched.phases.filter((p) => p.id !== 'sleep');
  // A tapped phase shows on the dial too: the hand swings to its middle, to the nearest 5 minutes.
  // The current phase is already under the hand, so tapping it leaves the hand on now.
  const tapped = day.find((p) => p.id === open && p.id !== phase?.id);
  const focus = tapped ? Math.round((tapped.start + tapped.end) / 2 / 300_000) * 300_000 : undefined;

  return (
    // 12pt padding (R.inner's partner) gives the dial and the time column room on a 360pt phone.
    <Card padding={S.md} style={{ gap: S.md, paddingTop: S.lg }}>
      <BodyClock sched={sched} now={now} windows={windows} focus={focus} />
      <Txt v="footnote" color={C.label3} align="center">
        Drag the dial. Gold marks trade windows.
      </Txt>

      <View>
        {day.map((p, i) => {
          const look = PHASE_LOOK[p.id];
          const on = phase?.id === p.id;
          const past = p.end <= now && !on;
          return (
            <View key={p.id}>
              {i ? <Divider inset={42} /> : null}
              <Pressy
                accessibilityRole="button"
                accessibilityLabel={`${p.label}, ${clockLabel(p.start)} to ${clockLabel(p.end)}${on ? ', now' : ''}`}
                onPress={() => setOpen(open === p.id ? undefined : p.id)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 4,
                  borderRadius: 12,
                  backgroundColor: on ? tint(look.color, 0.12) : undefined,
                  opacity: past ? 0.5 : 1,
                }}>
                <Row gap={10}>
                  <IconSquare icon={look.icon} color={look.color} size={28} />
                  <Txt v="body" weight={on ? '600' : '400'} style={{ flex: 1 }} numberOfLines={1}>
                    {p.label}
                  </Txt>
                  <Txt v="subhead" color={C.label2} tabular>
                    {clockLabel(p.start)}–{clockLabel(p.end)}
                  </Txt>
                </Row>
                {open === p.id || on ? (
                  <Txt v="footnote" color={C.label2} style={{ marginLeft: 38, marginTop: 2 }}>
                    {on ? `${p.tip} Until ${clockLabel(p.end)}.` : p.tip}
                  </Txt>
                ) : null}
              </Pressy>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
