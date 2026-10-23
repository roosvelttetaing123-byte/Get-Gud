import { LinearGradient } from 'expo-linear-gradient';
import { Check, RotateCcw, ShieldCheck, Timer } from 'lucide-react-native';
import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, R, S } from '@/constants/theme';
import type { UrgeOutcome } from '@/lib/store';
import { Body, Button, Display, Grid, Hero, Icon, IconBadge, Pill, Row, Screen, Section, Small, Surface, Tile } from '@/ui';

import { clock, spokenDuration } from './model';
import { ChangeInline, IntensityControl, kindMeta, kindTint } from './visuals';

export function ReviewView({
  kind,
  ridden,
  before,
  seconds,
  saved,
  onSave,
  onDone,
}: {
  kind: string;
  /** Urges ridden out so far, including this one once saved. */
  ridden: number;
  before: number;
  seconds: number;
  saved?: UrgeOutcome;
  onSave: (outcome: UrgeOutcome, after?: number) => void;
  onDone: () => void;
}) {
  const [after, setAfter] = useState<number | undefined>();

  return (
    <Screen>
      <Hero context={`You sat with it for ${clock(seconds)}`} title="How is it now?" />

      {saved === undefined ? (
        <>
          <IntensityControl title="Rate it again" value={after} onChange={setAfter} before={before} />

          <Section title="How did it go?">
            <Grid>
              <Tile
                title="I rode it out"
                subtitle="Didn't act on it"
                icon={ShieldCheck}
                pastel="mint"
                onPress={() => onSave('resisted', after)}
              />
              <Tile
                title="I gave in"
                subtitle="Log it. It's data."
                icon={RotateCcw}
                pastel="rose"
                onPress={() => onSave('gave_in', after)}
              />
            </Grid>
          </Section>
        </>
      ) : (
        <>
          {saved === 'resisted' ? (
            <LinearGradient
              colors={['rgba(79,214,156,0.32)', 'rgba(79,214,156,0.07)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.win}>
              <Glow />
              <View style={styles.body}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <IconBadge icon={ShieldCheck} size={56} color={C.onLight} bg={C.jade} />
                  <View>
                    <Pill label={`${ridden} ridden out`} tone="jade" />
                  </View>
                </Row>
                <Display size={32} color={C.jade}>
                  Rode it out.
                </Display>
                <Body>{"That's a rep. Every one makes the next easier."}</Body>
              </View>
              <Facts kind={kind} before={before} after={after} seconds={seconds} band="rgba(10,16,32,0.4)" />
            </LinearGradient>
          ) : (
            <Surface style={styles.neutral}>
              <View style={styles.body}>
                <IconBadge icon={RotateCcw} size={56} color={C.mist} bg={C.raised} />
                <Display size={32}>Logged.</Display>
                <Body color={C.haze}>No judgement. Notice what made it hard, and start here sooner next time.</Body>
              </View>
              <Facts kind={kind} before={before} after={after} seconds={seconds} band="rgba(10,16,32,0.35)" />
            </Surface>
          )}
          <Button label="Done" icon={Check} onPress={onDone} />
        </>
      )}
    </Screen>
  );
}

/** Soft jade light in the top corner of the win card. */
function Glow() {
  const id = useId().replace(/:/g, '');
  const d = 320;
  return (
    <View pointerEvents="none" style={styles.glow}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={`w${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.jade} stopOpacity={0.38} />
            <Stop offset="1" stopColor={C.jade} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#w${id})`} />
      </Svg>
    </View>
  );
}

/** Dark band of three small facts: the kind, the change in strength, the time. */
function Facts({
  kind,
  before,
  after,
  seconds,
  band,
}: {
  kind: string;
  before: number;
  after?: number;
  seconds: number;
  band: string;
}) {
  return (
    <View style={[styles.facts, { backgroundColor: band }]}>
      <View style={styles.fact}>
        <Icon icon={kindMeta(kind).icon} size={20} color={kindTint(kind)} />
        <Small numberOfLines={1}>{kind}</Small>
      </View>
      <View style={styles.sep} />
      <View
        style={styles.fact}
        accessible
        accessibilityLabel={after === undefined ? `Started at ${before}` : `Strength ${before} to ${after}`}>
        <ChangeInline before={before} after={after} size={20} />
        <Small>Strength</Small>
      </View>
      <View style={styles.sep} />
      <View style={styles.fact} accessible accessibilityLabel={`Sat with it for ${spokenDuration(seconds)}`}>
        <Row gap={6}>
          <Icon icon={Timer} size={16} color={C.haze} />
          <Display size={20} style={styles.tab}>
            {clock(seconds)}
          </Display>
        </Row>
        <Small>Sat with it</Small>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  win: {
    borderRadius: R.hero,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79,214,156,0.4)',
  },
  glow: { position: 'absolute', top: -150, right: -110 },
  neutral: { padding: 0, gap: 0, borderRadius: R.hero, overflow: 'hidden' },
  body: { padding: S.xl, gap: S.md },
  facts: { flexDirection: 'row', paddingVertical: S.lg, paddingHorizontal: S.md },
  fact: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, minHeight: 48 },
  sep: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  tab: { fontVariant: ['tabular-nums'] },
});
