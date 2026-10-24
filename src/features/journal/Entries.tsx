/**
 * Apple Journal-style entries, grouped by day. Tap a taken trade to log or edit its result.
 */
import { OctagonX, ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import type { Trade } from '@/lib/store';
import { Badge, Card, IconWell, Num, Row, Txt } from '@/ui';

import { FeelingTags, Tag } from './bits';
import { clock, count, dayLabel, fmtRx, rColor, type DayGroup } from './format';
import { outcomeLook, VERDICT } from './look';

export function EntryDay({ group, now, onOpen }: { group: DayGroup; now: number; onOpen: (id: string) => void }) {
  return (
    <View style={{ gap: S.sm }}>
      <Row style={styles.dayHead}>
        <Txt v="headline" style={{ flex: 1 }}>
          {dayLabel(group.ts, now)}
        </Txt>
        {group.closed ? (
          <Txt v="subhead" weight="600" color={rColor(group.netR)} rounded tabular>
            {fmtRx(group.netR)}
          </Txt>
        ) : (
          <Txt v="subhead" color={C.label3}>
            {count(group.trades.length, 'entry', 'entries')}
          </Txt>
        )}
      </Row>
      {group.trades.map((t) => (
        <EntryCard key={t.id} trade={t} onPress={t.taken ? () => onOpen(t.id) : undefined} />
      ))}
    </View>
  );
}

function EntryCard({ trade: t, onPress }: { trade: Trade; onPress?: () => void }) {
  const o = outcomeLook(t);
  const v = VERDICT[t.verdict];
  const isOpen = t.taken && !t.result;
  const hasR = t.taken && !!t.result;
  const label = [
    clock(t.ts),
    o.label,
    hasR ? fmtRx(t.r ?? 0) : null,
    `gate said ${v.word.toLowerCase()}`,
    t.emotions.join(', ') || null,
    t.overridden ? 'took it through a stop' : null,
    t.followedRules === false ? 'broke rules' : null,
    t.plan || null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card onPress={onPress} accessibilityLabel={label} padding={14} style={{ gap: 10 }}>
      <Row gap={S.md}>
        <IconWell icon={o.icon} color={o.color} size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Row gap={S.sm}>
            <Txt v="headline" rounded tabular>
              {clock(t.ts)}
            </Txt>
            <Badge label={v.word} color={v.color} />
          </Row>
          {t.plan ? (
            <Txt v="footnote" color={C.label2} numberOfLines={1}>
              {t.plan}
            </Txt>
          ) : null}
        </View>
        {hasR ? (
          <Num size={22} weight="700" color={rColor(t.r ?? 0)}>
            {fmtRx(t.r ?? 0)}
          </Num>
        ) : isOpen ? (
          <View style={styles.logPill}>
            <Txt v="subhead" weight="700" color={C.onTint}>
              Log result
            </Txt>
          </View>
        ) : (
          <Txt v="subhead" weight="600" color={C.mint}>
            Walked away
          </Txt>
        )}
      </Row>
      {t.emotions.length || t.overridden || t.followedRules === false ? (
        <View style={styles.tags}>
          <FeelingTags feelings={t.emotions} />
          {t.overridden ? <Tag label="Override" color={C.red} icon={OctagonX} quiet /> : null}
          {t.followedRules === false ? <Tag label="Broke rules" color={C.red} icon={ShieldAlert} quiet /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  dayHead: { paddingHorizontal: 4, marginTop: 4 },
  logPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 52 },
});
