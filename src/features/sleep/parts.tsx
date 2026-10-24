import { Moon, MoonStar } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';

import { C, S, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { clockLabel, fmtDebt, habits, type Schedule, type SleepSummary } from '@/lib/sleep';
import { actions } from '@/lib/store';
import { Card, Group, IconWell, ListRow, NativeSwitch, Row, Txt } from '@/ui';

import { DEBT_LOOK, HABIT_LOOK, PHASE_LOOK, SLEEP_TINT } from './look';

/** Today's timed habits as switch rows, ordered by time. */
export function Habits({ sched, done, dayKey, now }: { sched: Schedule; done: string[]; dayKey: string; now: number }) {
  const list = habits(sched);
  return (
    <Group footer="Times move with your body clock.">
      {list.map((h) => {
        const look = HABIT_LOOK[h.id];
        const on = done.includes(h.id);
        const late = !on && h.kind === 'by' && now > h.at;
        return (
          <ListRow
            key={h.id}
            icon={look.icon}
            iconColor={look.color}
            title={h.title}
            subtitle={late ? `${h.when}, passed` : h.when}
            accessory={
              <NativeSwitch
                value={on}
                tint={SLEEP_TINT}
                accessibilityLabel={h.title}
                onValueChange={() => {
                  haptic.tap();
                  actions.toggleSleepHabit(dayKey, h.id);
                }}
              />
            }
          />
        );
      })}
    </Group>
  );
}

/** Compact card on Today: debt plus the next thing your body clock wants. */
export function SleepGlance({ sum, now }: { sum: SleepSummary; now: number }) {
  const { debt, sched, phase } = sum;
  const look = DEBT_LOOK[debt.zone];
  const mel = sched.melatonin;
  const evening = phase && (phase.id === 'winddown' || phase.id === 'melatonin' || phase.id === 'sleep');
  const line = evening
    ? `Melatonin window ${clockLabel(mel.start)}–${clockLabel(mel.end)}`
    : phase
      ? `${phase.label} until ${clockLabel(phase.end)}`
      : `Melatonin window ${clockLabel(mel.start)}`;
  const P = phase ? PHASE_LOOK[phase.id] : undefined;

  return (
    <Card onPress={() => router.navigate('/sleep')} accessibilityLabel="Sleep" padding={S.lg}>
      <Row gap={S.md}>
        <IconWell icon={evening ? MoonStar : (P?.icon ?? Moon)} color={evening ? '#B57BFF' : (P?.color ?? SLEEP_TINT)} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt v="headline">Sleep</Txt>
          <Txt v="subhead" color={C.label2} numberOfLines={1}>
            {line}
          </Txt>
        </View>
        {debt.known ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="title3" rounded tabular color={look.color}>
              {fmtDebt(debt.hours)} h
            </Txt>
            <Txt v="caption1" color={C.label2}>
              debt
            </Txt>
          </View>
        ) : (
          <Txt v="subhead" color={C.label3}>
            No data
          </Txt>
        )}
      </Row>
      {now > sched.wakeAt + 30 * 60_000 && now < sched.wakeAt + 4 * 3_600_000 && debt.lastNight === undefined ? (
        <View style={{ marginTop: S.md, padding: S.md, borderRadius: 14, backgroundColor: tint(SLEEP_TINT, 0.14) }}>
          <Txt v="subhead" color={C.label}>
            Log last night to update your schedule.
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

