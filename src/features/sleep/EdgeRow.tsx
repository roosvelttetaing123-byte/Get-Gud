/**
 * One result row for a sleep bucket (rest band or energy phase): coloured icon square,
 * label, trades and win rate, average R and a slim bar. Same shape as "What each feeling costs".
 */
import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { C, S, SYS } from '@/constants/theme';
import { count, fmtRx, pct, rColor } from '@/features/journal/format';
import type { EdgeBucket, RestBand } from '@/lib/sleepEdge';
import { IconSquare, Num, Txt, useSpringValue } from '@/ui';

/** High debt is orange, never red: it's a fact, not a failure. */
export const REST_LOOK: Record<RestBand, { icon: LucideIcon; color: string }> = {
  rested: { icon: BatteryFull, color: SYS.green },
  some: { icon: BatteryMedium, color: SYS.yellow },
  short: { icon: BatteryLow, color: SYS.indigo },
  heavy: { icon: BatteryWarning, color: SYS.orange },
};

export function EdgeRow({
  bucket: b,
  max,
  icon,
  color,
  value,
}: {
  bucket: EdgeBucket;
  max: number;
  icon: LucideIcon;
  color: string;
  /** Right-hand text instead of the subtitle's trades line, e.g. a time range. */
  value?: string;
}) {
  const rc = rColor(b.avgR);
  const share = Math.min(1, Math.abs(b.avgR) / Math.max(0.01, max));
  const grow = useSpringValue(share, 'smooth', 0);
  const facts = `${count(b.n, 'trade')} · ${pct(b.winRate)} win rate`;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${b.label}${value ? `, ${value}` : ''}: ${facts}, ${fmtRx(b.avgR)} on average`}>
      <View style={{ marginTop: 4 }}>
        <IconSquare icon={icon} color={color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt v="body" weight="600" numberOfLines={1}>
              {b.label}
            </Txt>
            <Txt v="footnote" color={C.label2} numberOfLines={1}>
              {value ? `${value} · ${facts}` : facts}
            </Txt>
          </View>
          <Num size={20} weight="700" color={rc}>
            {fmtRx(b.avgR)}
          </Num>
        </View>
        <View style={styles.track}>
          {b.avgR !== 0 ? (
            <View style={[styles.fill, { width: `${Math.max(3, grow * 100)}%`, backgroundColor: rc }]} />
          ) : (
            <View style={[styles.fill, { width: 6, backgroundColor: C.gray }]} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.fill4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
