/**
 * What drives your R, Screen Time-style, in one card with three lenses instead of three long
 * sections: "What each feeling costs", "What tiredness costs" (the sleep edge) and "By the rules".
 * Every row has the same shape: a coloured icon square, the plain facts, the average R and a slim bar.
 */
import { router } from 'expo-router';
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  BedDouble,
  DoorOpen,
  OctagonX,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { C, S, SPRING, SYS } from '@/constants/theme';
import type { Bucket, JournalStats } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { restLine, type RestBand, type SleepEdge } from '@/lib/sleepEdge';
import { Card, Divider, IconSquare, Num, Row, Section, Segmented, Txt, useReduceMotion } from '@/ui';

import { count, fmtRx, pct, rColor, times } from './format';
import { feelingLook } from './look';

type Lens = 'feelings' | 'sleep' | 'rules';
const TOP = 4;
const TITLE: Record<Lens, string> = {
  feelings: 'What each feeling costs',
  sleep: 'What tiredness costs',
  rules: 'By the rules',
};

/** High debt is orange, never red: it's a fact, not a failure. */
const REST: Record<RestBand, { icon: LucideIcon; color: string }> = {
  rested: { icon: BatteryFull, color: SYS.green },
  some: { icon: BatteryMedium, color: SYS.yellow },
  short: { icon: BatteryLow, color: SYS.indigo },
  heavy: { icon: BatteryWarning, color: SYS.orange },
};

export function Patterns({ stats, edge }: { stats: JournalStats; edge: SleepEdge }) {
  const hasRules = stats.followed.n + stats.broke.n + stats.overrides.n + stats.skipped > 0;
  const lenses: { value: Lens; label: string }[] = [];
  if (stats.byEmotion.length) lenses.push({ value: 'feelings', label: 'Feelings' });
  if (edge.closed) lenses.push({ value: 'sleep', label: 'Sleep' });
  if (hasRules) lenses.push({ value: 'rules', label: 'Rules' });
  const [pick, setPick] = useState<Lens | null>(null);
  const lens = lenses.find((l) => l.value === pick)?.value ?? lenses[0]?.value;
  if (!lens) return null;

  return (
    <Section title={TITLE[lens]} footer={footer(lens, stats, edge)}>
      <Card padding={0} style={{ gap: 0 }}>
        {lenses.length > 1 ? (
          <View style={styles.lenses}>
            <Segmented options={lenses} value={lens} onChange={setPick} />
          </View>
        ) : null}
        {lens === 'feelings' ? (
          <FeelingRows buckets={stats.byEmotion} />
        ) : lens === 'sleep' ? (
          <SleepRows edge={edge} />
        ) : (
          <RuleRows stats={stats} />
        )}
      </Card>
    </Section>
  );
}

function footer(lens: Lens, st: JournalStats, edge: SleepEdge): string {
  if (lens === 'feelings') return 'Average R per trade, worst first.';
  if (lens === 'sleep') {
    const line = restLine(edge);
    if (!line) return 'Average R per trade by how you slept.';
    const t = line.tired.label.toLowerCase();
    const on = line.tired.id === 'short' ? 'After a short night' : `With ${t}`;
    return `Rested, you average ${fmtRx(line.rested.avgR)} a trade. ${on}, ${fmtRx(line.tired.avgR)}.`;
  }
  if (st.followed.n && st.broke.n) {
    return `By the rules you average ${fmtRx(st.followed.avgR)} a trade. Breaking one: ${fmtRx(st.broke.avgR)}.`;
  }
  return 'Average R per trade.';
}

/* ---------- lenses ---------- */

function FeelingRows({ buckets }: { buckets: Bucket[] }) {
  const [open, setOpen] = useState(false);
  const max = Math.max(0.01, ...buckets.map((b) => Math.abs(b.avgR)));
  const shown = open ? buckets : buckets.slice(0, TOP);
  return (
    <>
      {shown.map((b, i) => {
        const look = feelingLook(b.label);
        return (
          <React.Fragment key={b.label}>
            {i > 0 ? <Divider inset={58} /> : null}
            <CostRow icon={look.icon} color={look.color} title={b.label} n={b.n} winRate={b.winRate} avgR={b.avgR} max={max} />
          </React.Fragment>
        );
      })}
      {buckets.length > TOP ? (
        <>
          <Divider inset={S.lg} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              setOpen((o) => !o);
            }}
            style={({ pressed }) => [styles.more, pressed && { backgroundColor: C.fill4 }]}>
            <Txt v="body" color={C.tint}>
              {open ? 'Show less' : `Show all ${buckets.length}`}
            </Txt>
          </Pressable>
        </>
      ) : null}
    </>
  );
}

function SleepRows({ edge }: { edge: SleepEdge }) {
  // Trades but no sleep to match them with: one quiet nudge toward the Sleep tab.
  if (!edge.matched) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log sleep"
        onPress={() => {
          haptic.tap();
          router.navigate('/sleep');
        }}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.fill4 }]}>
        <IconSquare icon={BedDouble} color={SYS.indigo} />
        <Txt v="subhead" color={C.label2} style={{ flex: 1 }}>
          Log your sleep and this shows how it moves your results.
        </Txt>
      </Pressable>
    );
  }
  const max = Math.max(0.01, ...edge.byRest.map((b) => Math.abs(b.avgR)));
  return (
    <>
      {edge.byRest.map((b, i) => (
        <React.Fragment key={b.id}>
          {i > 0 ? <Divider inset={58} /> : null}
          <CostRow icon={REST[b.id].icon} color={REST[b.id].color} title={b.label} n={b.n} winRate={b.winRate} avgR={b.avgR} max={max} />
        </React.Fragment>
      ))}
    </>
  );
}

function RuleRows({ stats }: { stats: JournalStats }) {
  const { followed, broke, overrides, skipped } = stats;
  const max = Math.max(0.01, ...[followed, broke, overrides].filter((b) => b.n).map((b) => Math.abs(b.avgR)));
  const rows: React.ReactNode[] = [];
  if (followed.n) rows.push(<CostRow key="f" icon={ShieldCheck} color={SYS.green} title="Followed your rules" {...facts(followed)} max={max} />);
  if (broke.n) rows.push(<CostRow key="b" icon={ShieldAlert} color={SYS.orange} title="Broke a rule" {...facts(broke)} max={max} />);
  if (overrides.n) rows.push(<CostRow key="o" icon={OctagonX} color={SYS.red} title="Overrode a stop" {...facts(overrides)} max={max} />);
  rows.push(
    <View key="w" style={styles.row} accessible accessibilityLabel={`Walked away ${times(skipped)}`}>
      <IconSquare icon={DoorOpen} color={SYS.mint} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt v="body" weight="600">
          Walked away
        </Txt>
        <Txt v="footnote" color={C.label2}>
          {skipped ? 'Every one was a rule kept' : 'When the gate says stop, this counts'}
        </Txt>
      </View>
      <Num size={20} weight="700" color={skipped ? SYS.mint : C.label3}>
        {skipped === 1 ? '1 time' : `${skipped} times`}
      </Num>
    </View>,
  );
  return (
    <>
      {rows.map((r, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Divider inset={58} /> : null}
          {r}
        </React.Fragment>
      ))}
    </>
  );
}

const facts = (b: Bucket) => ({ n: b.n, winRate: b.winRate, avgR: b.avgR });

/* ---------- row ---------- */

function CostRow({
  icon,
  color,
  title,
  n,
  winRate,
  avgR,
  max,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  n: number;
  winRate: number;
  avgR: number;
  max: number;
}) {
  const rc = rColor(avgR);
  const line = `${count(n, 'trade')} · ${pct(winRate)} win rate`;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}: ${line}, ${fmtRx(avgR)} on average`}>
      <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
        <IconSquare icon={icon} color={color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Row gap={S.sm}>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt v="body" weight="600" numberOfLines={1}>
              {title}
            </Txt>
            <Txt v="footnote" color={C.label2} numberOfLines={1}>
              {line}
            </Txt>
          </View>
          <Num size={20} weight="700" color={rc}>
            {fmtRx(avgR)}
          </Num>
        </Row>
        <View style={styles.track}>
          <GrowBar share={avgR === 0 ? 0 : Math.min(1, Math.abs(avgR) / max)} color={avgR === 0 ? C.gray : rc} />
        </View>
      </View>
    </View>
  );
}

/** A bar that grows from the left with a spring (transform only). */
function GrowBar({ share, color }: { share: number; color: string }) {
  const reduce = useReduceMotion();
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(reduce ? 1 : withSpring(1, SPRING.smooth));
  }, [grow, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.get() }] }));
  return (
    <Animated.View
      style={[styles.fill, { width: share ? `${Math.max(3, share * 100)}%` : 6, backgroundColor: color, transformOrigin: 'left' }, style]}
    />
  );
}

const styles = StyleSheet.create({
  lenses: { paddingHorizontal: S.md, paddingTop: S.md, paddingBottom: S.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.fill4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  more: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
