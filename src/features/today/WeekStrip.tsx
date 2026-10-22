import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { Small } from '@/ui';

import { weekdayLetter } from './useToday';

type Day = { key: string; date: Date; ratio: number };

const BAR = 56;

/**
 * Last n days of promises as vertical bars filled from the bottom.
 * Jade = every promise kept, haze = partly kept, empty track = none.
 */
export function WeekStrip({ days, todayKey }: { days: Day[]; todayKey: string }) {
  const full = days.filter((d) => d.ratio === 1).length;
  return (
    <View
      accessible
      accessibilityLabel={`Last ${days.length} days: every promise kept on ${full} of them`}
      style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
      {days.map((d) => {
        const today = d.key === todayKey;
        return (
          <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: S.sm }}>
            <View
              style={{
                alignSelf: 'stretch',
                height: BAR,
                borderRadius: 8,
                backgroundColor: C.raised,
                overflow: 'hidden',
                justifyContent: 'flex-end',
              }}>
              {d.ratio > 0 ? (
                <View
                  style={{
                    height: `${Math.round(d.ratio * 100)}%`,
                    backgroundColor: d.ratio === 1 ? C.jade : C.haze,
                  }}
                />
              ) : null}
            </View>
            <Small color={today ? C.mist : C.haze} style={{ fontWeight: today ? '700' : '400' }}>
              {weekdayLetter(d.date)}
            </Small>
          </View>
        );
      })}
    </View>
  );
}
