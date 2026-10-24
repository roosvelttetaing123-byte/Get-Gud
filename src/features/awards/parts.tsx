/**
 * Medals screen pieces, modelled on Apple Fitness Awards: a hero medal on black with a soft glow,
 * a streak strip, a 3-column grid and a detail sheet.
 */
import { Image } from 'expo-image';
import { Flame, Snowflake } from 'lucide-react-native';
import React, { useId } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, RING, S } from '@/constants/theme';
import { LOCKED_MEDAL } from '@/lib/engage';
import { Card, Medal, Num, ProgressRing, Row, Sheet, Txt, useSpringValue } from '@/ui';

import { earnedLine, glowOf, lockedLine, pct, type MedalView, type StreakInfo } from './model';

/* ---------- glow ---------- */

/** A soft radial light behind a 3D object, so it sits in space instead of on a flat black. */
export function Glow({ size, color, strength = 0.42 }: { size: number; color: string; strength?: number }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} style={styles.abs} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="0.45" stopColor={color} stopOpacity={strength * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/* ---------- hero ---------- */

const HERO = 200;

/** The latest medal, big; or, before the first one, the next medal locked with its progress. */
export function HeroMedal({ view, now, onPress }: { view: MedalView; now: Date; onPress: () => void }) {
  const pop = useSpringValue(1, 'bouncy', 0.7);
  const { award, earned } = view;
  const p = view.progress ?? 0;
  const stage = HERO + 120;
  return (
    <View style={styles.hero}>
      <Txt v="subhead" weight="600" color={earned ? C.tint : C.label2}>
        {earned ? 'Latest medal' : 'Next up'}
      </Txt>
      <View style={[styles.stage, { width: stage, height: HERO + 24, transform: [{ scale: pop }] }]}>
        <View style={{ position: 'absolute', left: 0, top: (HERO + 24 - stage) / 2, width: stage, height: stage }}>
          <Glow size={stage} color={earned ? glowOf(award.id) : C.indigo} strength={earned ? 0.42 : 0.2} />
        </View>
        {earned ? (
          <Medal image={award.image} size={HERO} label={award.title} onPress={onPress} />
        ) : (
          <ProgressRing value={p} size={HERO + 16} stroke={7} from={C.orange} to={C.yellow} track={C.fill3}>
            <Medal image={LOCKED_MEDAL} size={HERO - 36} label={`${award.title}, ${pct(p)} there`} onPress={onPress} />
          </ProgressRing>
        )}
      </View>
      <View style={{ gap: 4, alignItems: 'center' }}>
        <Txt v="title1" align="center">
          {award.title}
        </Txt>
        <Txt v="subhead" weight="600" color={earned ? C.label2 : C.tint} align="center">
          {earned ? earnedLine(view, now) : lockedLine(view)}
        </Txt>
      </View>
      <Txt v="subhead" color={C.label2} align="center" style={{ maxWidth: 300 }}>
        {award.detail}
      </Txt>
    </View>
  );
}

/* ---------- streak strip ---------- */

export function StreakStrip({ info }: { info: StreakInfo }) {
  const { days, freezes, next } = info;
  return (
    <Card padding={0} style={{ gap: 0 }}>
      <Row gap={0} align="stretch">
        <View style={styles.cell}>
          <Row gap={4}>
            <Flame size={24} color={C.tint} fill={days > 0 ? C.tint : 'transparent'} strokeWidth={2} />
            <Num size={34} color={C.tint}>
              {days}
            </Num>
          </Row>
          <Txt v="footnote" color={C.label2}>
            Day streak
          </Txt>
        </View>
        <View style={styles.vline} />
        <View style={styles.cell}>
          <Row gap={5}>
            <Snowflake size={22} color={C.cyan} strokeWidth={2.2} />
            <Num size={34} color={C.cyan}>
              {freezes}
            </Num>
          </Row>
          <Txt v="footnote" color={C.label2}>
            {freezes === 1 ? 'Freeze left' : 'Freezes left'}
          </Txt>
        </View>
        <View style={styles.vline} />
        {next ? (
          <View style={styles.cell} accessible accessibilityLabel={`${next.left} days to the ${next.target}-day medal`}>
            <Row gap={6}>
              <ProgressRing value={next.progress} size={34} stroke={4} from={RING.promises.from} to={RING.promises.to} track={C.fill3}>
                <Image source={next.view.award.image} style={{ width: 22, height: 22 }} contentFit="contain" />
              </ProgressRing>
              <Num size={34} color={C.orange}>
                {next.left}
              </Num>
            </Row>
            <Txt v="footnote" color={C.label2} numberOfLines={1}>
              {next.left === 1 ? 'Day to go' : 'Days to go'}
            </Txt>
          </View>
        ) : (
          <View style={styles.cell}>
            <Txt v="headline" color={C.tint}>
              All earned
            </Txt>
          </View>
        )}
      </Row>
    </Card>
  );
}

/* ---------- grid ---------- */

const GAP = 10;

export function useCellSize() {
  const { width } = useWindowDimensions();
  const col = Math.min(width, 600) - 2 * S.margin;
  const cell = Math.floor((col - 2 * GAP) / 3);
  return { cell, medal: Math.round(cell * 0.84) };
}

export function MedalSection({
  title,
  views,
  now,
  onOpen,
}: {
  title: string;
  views: MedalView[];
  now: Date;
  onOpen: (id: string) => void;
}) {
  const { cell, medal } = useCellSize();
  const got = views.filter((v) => v.earned).length;
  return (
    <View style={{ gap: S.lg }}>
      <View style={styles.head}>
        <Txt v="title3" weight="700">
          {title}
        </Txt>
        <Txt v="subhead" color={C.label2} tabular>
          {got} of {views.length}
        </Txt>
      </View>
      <View style={styles.grid}>
        {views.map((v) => (
          <MedalCell key={v.award.id} view={v} now={now} width={cell} size={medal} onPress={() => onOpen(v.award.id)} />
        ))}
      </View>
    </View>
  );
}

function MedalCell({
  view,
  now,
  width,
  size,
  onPress,
}: {
  view: MedalView;
  now: Date;
  width: number;
  size: number;
  onPress: () => void;
}) {
  const { award, earned, progress } = view;
  const label = earned ? `${award.title}, ${earnedLine(view, now)}` : `${award.title}, locked${progress !== undefined ? `, ${pct(progress)}` : ''}`;
  return (
    <View style={[styles.cellWrap, { width }]}>
      <View style={{ opacity: earned ? 1 : 0.92 }}>
        <Medal image={earned ? award.image : LOCKED_MEDAL} size={size} label={label} onPress={onPress} />
      </View>
      <Txt v="footnote" weight="600" align="center" numberOfLines={2} color={earned ? C.label : C.label2}>
        {award.title}
      </Txt>
      {earned ? (
        <Txt v="caption1" color={C.label2} align="center" style={{ marginTop: -4 }}>
          {view.at ? earnedLine(view, now).replace('Earned ', '') : 'Today'}
        </Txt>
      ) : progress !== undefined ? (
        <Row gap={5} style={{ marginTop: -2 }}>
          <ProgressRing value={progress} size={14} stroke={2.5} from={C.tint} track={C.fill2} />
          <Txt v="caption1" color={C.label2} tabular>
            {pct(progress)}
          </Txt>
        </Row>
      ) : null}
    </View>
  );
}

/* ---------- detail sheet ---------- */

export function MedalSheet({
  view,
  section,
  visible,
  now,
  onClose,
}: {
  view?: MedalView;
  section?: string;
  visible: boolean;
  now: Date;
  onClose: () => void;
}) {
  const size = 176;
  return (
    <Sheet visible={visible && !!view} onClose={onClose} title={section ?? 'Medal'} detent="medium">
      {view ? <SheetBody view={view} now={now} size={size} /> : <View />}
    </Sheet>
  );
}

function SheetBody({ view, now, size }: { view: MedalView; now: Date; size: number }) {
  const { award, earned } = view;
  const p = view.progress;
  const pop = useSpringValue(1, 'bouncy', 0.8);
  return (
    <View style={{ alignItems: 'center', gap: S.lg, paddingTop: S.xs }}>
      <View style={[styles.stage, { width: size + 80, height: size + 16, transform: [{ scale: pop }] }]}>
        <View style={{ position: 'absolute', left: 0, top: -32, width: size + 80, height: size + 80 }}>
          <Glow size={size + 80} color={earned ? glowOf(award.id) : C.indigo} strength={earned ? 0.4 : 0.16} />
        </View>
        {earned ? (
          <Medal image={award.image} size={size} label={award.title} />
        ) : p !== undefined ? (
          <ProgressRing value={p} size={size + 12} stroke={6} from={C.orange} to={C.yellow} track={C.fill3}>
            <Medal image={LOCKED_MEDAL} size={size - 30} label={award.title} />
          </ProgressRing>
        ) : (
          <Medal image={LOCKED_MEDAL} size={size} label={award.title} />
        )}
      </View>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Txt v="title1" align="center">
          {award.title}
        </Txt>
        <Txt v="subhead" weight="600" color={earned ? C.label2 : C.tint} align="center">
          {earned ? earnedLine(view, now) : lockedLine(view)}
        </Txt>
      </View>
      <Txt v="body" color={C.label2} align="center" style={{ maxWidth: 320 }}>
        {award.detail}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  hero: { alignItems: 'center', gap: S.md, paddingTop: S.sm },
  stage: { alignItems: 'center', justifyContent: 'center' },
  cell: { flex: 1, paddingVertical: S.lg, paddingHorizontal: S.md + 2, gap: 2, justifyContent: 'center', minWidth: 0 },
  vline: { width: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: S.lg },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: S.xl },
  cellWrap: { alignItems: 'center', gap: 8 },
});
