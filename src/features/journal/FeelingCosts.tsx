/**
 * "What each feeling costs": Screen Time's most-used list, for feelings.
 * Worst first; each row has a coloured icon square, a slim bar and the average R.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import type { Bucket } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { Card, Divider, IconSquare, Num, Txt, useSpringValue } from '@/ui';

import { count, fmtRx, pct, rColor } from './format';
import { feelingLook } from './look';

const TOP = 4;

export function FeelingCosts({ buckets }: { buckets: Bucket[] }) {
  const [open, setOpen] = useState(false);
  // Springs only once the user has asked, so the first paint doesn't animate open.
  const [touched, setTouched] = useState(false);
  const [full, setFull] = useState(0);
  const [cut, setCut] = useState(0);
  const max = Math.max(0.01, ...buckets.map((b) => Math.abs(b.avgR)));
  const more = buckets.length > TOP;
  const target = open ? full : cut;
  const spring = useSpringValue(target, 'smooth');
  const measured = more && full > 0 && cut > 0;
  const h = touched ? spring : target;
  const extra = measured && full > cut ? Math.min(1, Math.max(0, (h - cut) / (full - cut))) : open ? 1 : 0;

  return (
    <Card padding={0} style={{ gap: 0 }}>
      <View style={{ height: measured ? h : undefined, overflow: 'hidden' }}>
        <View onLayout={(e) => setFull(e.nativeEvent.layout.height)}>
          {buckets.map((b, i) => (
            <View
              key={b.label}
              onLayout={i === TOP ? (e) => setCut(e.nativeEvent.layout.y) : undefined}
              style={{ opacity: i >= TOP ? extra : 1 }}>
              {i > 0 ? <Divider inset={58} /> : null}
              <FeelingRow bucket={b} max={max} />
            </View>
          ))}
        </View>
      </View>
      {more ? (
        <>
          <Divider inset={S.lg} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              setTouched(true);
              setOpen((o) => !o);
            }}
            style={({ pressed }) => [styles.more, pressed && { backgroundColor: C.fill4 }]}>
            <Txt v="body" color={C.tint}>
              {open ? 'Show less' : 'Show all'}
            </Txt>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

function FeelingRow({ bucket: b, max }: { bucket: Bucket; max: number }) {
  const look = feelingLook(b.label);
  const color = rColor(b.avgR);
  const share = Math.min(1, Math.abs(b.avgR) / max);
  const grow = useSpringValue(share, 'smooth', 0);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${b.label}: ${count(b.n, 'trade')}, ${pct(b.winRate)} win rate, ${fmtRx(b.avgR)} on average`}>
      <View style={{ marginTop: 4 }}>
        <IconSquare icon={look.icon} color={look.color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt v="body" weight="600" numberOfLines={1}>
              {b.label}
            </Txt>
            <Txt v="footnote" color={C.label2} numberOfLines={1}>
              {`${count(b.n, 'trade')} · ${pct(b.winRate)} win rate`}
            </Txt>
          </View>
          <Num size={20} weight="700" color={color}>
            {fmtRx(b.avgR)}
          </Num>
        </View>
        <View style={styles.track}>
          {b.avgR !== 0 ? (
            <View style={[styles.fill, { width: `${Math.max(3, grow * 100)}%`, backgroundColor: color }]} />
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
  more: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
