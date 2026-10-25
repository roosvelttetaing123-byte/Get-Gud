/**
 * Entries: your trades and walk-aways, newest first, grouped by day like Wallet. Filter chips on
 * top, the last 10 by default, everything one tap away. Tap a taken trade to log or edit its result.
 */
import { Clock, DoorOpen, ShieldAlert, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, FONT, R, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { Trade } from '@/lib/store';
import { Button, Card, Chip, Divider, IconWell, Num, Row, Section, Txt } from '@/ui';

import { clock, count, dayLabel, fmtRx, groupByDay, rColor, type DayGroup } from './format';
import { feelingLook, outcomeLook, VERDICT } from './look';

const RECENT = 10;

type Filter = 'all' | 'wins' | 'losses' | 'walked' | 'broke';

const FILTERS: { id: Filter; label: string; color: string; icon?: LucideIcon; test: (t: Trade) => boolean; empty: string }[] = [
  { id: 'all', label: 'All', color: C.tint, test: () => true, empty: 'No entries yet.' },
  { id: 'wins', label: 'Wins', color: C.green, icon: TrendingUp, test: (t) => t.taken && t.result === 'win', empty: 'No wins logged yet.' },
  { id: 'losses', label: 'Losses', color: C.red, icon: TrendingDown, test: (t) => t.taken && t.result === 'loss', empty: 'No losses logged.' },
  {
    id: 'walked',
    label: 'Walked away',
    color: C.mint,
    icon: DoorOpen,
    test: (t) => !t.taken,
    empty: 'No walk-aways yet. When the gate says stop, they show here.',
  },
  {
    id: 'broke',
    label: 'Broke rules',
    color: C.orange,
    icon: ShieldAlert,
    test: (t) => t.taken && (t.followedRules === false || t.overridden),
    empty: 'No broken rules. Keep it that way.',
  },
];

export function Entries({ trades, now, onOpen }: { trades: Trade[]; now: number; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [all, setAll] = useState(false);
  const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
  const list = trades.filter(f.test).sort((a, b) => b.ts - a.ts);
  const days = groupByDay(all ? list : list.slice(0, RECENT));

  return (
    <Section title="Entries">
      <View style={{ gap: S.lg }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -S.margin, flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: S.margin, gap: S.sm }}>
          {FILTERS.map((x) => (
            <Chip
              key={x.id}
              label={x.label}
              icon={x.icon}
              color={x.color}
              selected={filter === x.id}
              onPress={() => {
                setFilter(x.id);
                setAll(false);
              }}
            />
          ))}
        </ScrollView>

        {days.length ? (
          days.map((d) => <EntryDay key={d.key} group={d} now={now} onOpen={onOpen} />)
        ) : (
          <Card padding={S.lg}>
            <Txt v="subhead" color={C.label2} align="center">
              {f.empty}
            </Txt>
          </Card>
        )}

        {list.length > RECENT ? (
          <Button
            title={all ? 'Show less' : `Show all ${list.length}`}
            kind="gray"
            size="medium"
            color={C.tint}
            onPress={() => setAll((a) => !a)}
          />
        ) : null}
      </View>
    </Section>
  );
}

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
      <View style={styles.group}>
        {group.trades.map((t, i) => (
          <React.Fragment key={t.id}>
            {i > 0 ? <Divider inset={68} /> : null}
            <EntryRow trade={t} onPress={t.taken ? () => onOpen(t.id) : undefined} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

/** One entry as a list row: outcome icon, time and verdict, feelings and plan, then the result. */
export function EntryRow({ trade: t, onPress }: { trade: Trade; onPress?: () => void }) {
  const o = outcomeLook(t);
  const v = VERDICT[t.verdict];
  const isOpen = t.taken && !t.result;
  const hasR = t.taken && !!t.result;
  const flag = !t.taken ? null : t.overridden ? 'Through a stop' : t.followedRules === false ? 'Broke rules' : null;
  const label = [
    clock(t.ts),
    o.label,
    hasR ? fmtRx(t.r ?? 0) : null,
    `gate said ${v.word.toLowerCase()}`,
    t.emotions.join(', ') || null,
    flag?.toLowerCase() ?? null,
    t.plan || null,
  ]
    .filter(Boolean)
    .join(', ');

  const body = (
    <View style={styles.row}>
      <IconWell icon={o.icon} color={o.color} size={38} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <View style={styles.top}>
          <Txt v="headline" rounded tabular>
            {clock(t.ts)}
          </Txt>
          <Txt v="footnote" weight="600" color={v.color}>
            {v.word}
          </Txt>
        </View>
        {t.emotions.length || t.plan ? (
          <Text numberOfLines={1} style={styles.sub}>
            {t.emotions.map((e, i) => (
              <React.Fragment key={e}>
                {i > 0 ? ', ' : ''}
                <Text style={{ color: feelingLook(e).color, fontWeight: '600' }}>{e}</Text>
              </React.Fragment>
            ))}
            {t.emotions.length && t.plan ? ' · ' : ''}
            {t.plan ?? ''}
          </Text>
        ) : null}
      </View>
      <View style={styles.end}>
        {hasR ? (
          <Num size={20} weight="700" color={rColor(t.r ?? 0)}>
            {fmtRx(t.r ?? 0)}
          </Num>
        ) : isOpen ? (
          <View style={styles.logPill}>
            <Txt v="footnote" weight="700" color={C.onTint}>
              Log result
            </Txt>
          </View>
        ) : (
          <Txt v="subhead" weight="600" color={C.mint}>
            Walked away
          </Txt>
        )}
        {flag ? (
          <Txt v="caption1" weight="600" color={C.orange}>
            {flag}
          </Txt>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [pressed && { backgroundColor: C.fill4 }]}>
      {body}
    </Pressable>
  );
}

/** A trade still waiting for its result: the one thing to do in Journal right now. */
export function NeedsResult({ trades, now, onOpen }: { trades: Trade[]; now: number; onOpen: (id: string) => void }) {
  const open = trades.filter((t) => t.taken && !t.result).sort((a, b) => b.ts - a.ts);
  if (!open.length) return null;
  const t = open[0];
  const when = `${dayLabel(t.ts, now)} ${clock(t.ts)}`;
  return (
    <Card onPress={() => onOpen(t.id)} padding={S.lg} accessibilityLabel={`Log your result: ${t.plan ?? 'trade'}, ${when}`}>
      <Row gap={S.md}>
        <IconWell icon={Clock} color={C.orange} size={44} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt v="headline">{open.length === 1 ? 'Log your result' : `${open.length} trades need a result`}</Txt>
          <Txt v="subhead" color={C.label2} numberOfLines={1}>
            {t.plan ? `${t.plan} · ${when}` : when}
          </Txt>
        </View>
        <View style={styles.logPill}>
          <Txt v="subhead" weight="700" color={C.onTint}>
            Log
          </Txt>
        </View>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  dayHead: { paddingHorizontal: 4 },
  group: { backgroundColor: C.cardTranslucent, borderRadius: R.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 11, minHeight: 62 },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: S.sm },
  sub: { fontFamily: FONT.system, fontSize: 13, lineHeight: 18, color: C.label2 },
  end: { alignItems: 'flex-end', gap: 1, flexShrink: 0 },
  logPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
