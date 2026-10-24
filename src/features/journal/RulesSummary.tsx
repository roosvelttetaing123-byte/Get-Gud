/**
 * "By the rules": Followed vs Broke tiles, then overrides and walk-aways as list rows.
 */
import { DoorOpen, OctagonX, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import type { Bucket } from '@/lib/derive';
import { Card, Group, ListRow, Num, Row, Txt } from '@/ui';

import { count, fmtRx, pct, rColor, times } from './format';

export function RulesSummary({
  followed,
  broke,
  overrides,
  skipped,
}: {
  followed: Bucket;
  broke: Bucket;
  overrides: Bucket;
  skipped: number;
}) {
  const tiles = followed.n > 0 || broke.n > 0;
  return (
    <View style={{ gap: S.md }}>
      {tiles ? (
        <Row gap={S.md} align="stretch">
          <RuleTile title="Followed" icon={ShieldCheck} color={C.green} bucket={followed} />
          <RuleTile title="Broke" icon={ShieldAlert} color={C.red} bucket={broke} />
        </Row>
      ) : null}
      <Group>
        <ListRow
          icon={OctagonX}
          iconColor={C.red}
          title="Overrode a stop"
          subtitle={
            overrides.n
              ? `${times(overrides.n)[0].toUpperCase()}${times(overrides.n).slice(1)} · ${pct(overrides.winRate)} win rate`
              : 'Never. Keep it that way.'
          }
          accessory={
            overrides.n ? (
              <Num size={17} weight="600" color={rColor(overrides.avgR)}>
                {fmtRx(overrides.avgR)}
              </Num>
            ) : undefined
          }
        />
        <ListRow
          icon={DoorOpen}
          iconColor={C.mint}
          title="Walked away"
          subtitle={skipped ? 'Every one was a rule kept' : 'When the gate says stop, this counts'}
          accessory={
            <Num size={17} weight="600" color={skipped ? C.mint : C.label3}>
              {skipped === 1 ? '1 time' : `${skipped} times`}
            </Num>
          }
        />
      </Group>
    </View>
  );
}

function RuleTile({ title, icon: I, color, bucket }: { title: string; icon: LucideIcon; color: string; bucket: Bucket }) {
  const has = bucket.n > 0;
  return (
    <Card
      style={{ flex: 1, gap: S.sm, minWidth: 0 }}
      accessibilityLabel={
        has ? `${title}: ${count(bucket.n, 'trade')}, ${pct(bucket.winRate)} win rate, ${fmtRx(bucket.avgR)} average` : `${title}: none yet`
      }>
      <Row gap={6}>
        <I size={18} color={color} strokeWidth={2.4} />
        <Txt v="subhead" weight="600" color={color} style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Txt>
      </Row>
      <View>
        <Num size={34} color={has ? C.label : C.label3}>
          {has ? pct(bucket.winRate) : '–'}
        </Num>
        <Txt v="footnote" color={C.label2} numberOfLines={1}>
          {has ? `win rate · ${count(bucket.n, 'trade')}` : 'No trades yet'}
        </Txt>
      </View>
      <Row gap={4} align="baseline">
        <Num size={17} weight="600" color={has ? rColor(bucket.avgR) : C.label3}>
          {has ? fmtRx(bucket.avgR) : '–'}
        </Num>
        <Txt v="footnote" color={C.label2}>
          avg
        </Txt>
      </Row>
    </Card>
  );
}
