/**
 * After the surf: re-rate the urge on the same slider, see the drop ("8 to 4"),
 * then log how it went. Saved: a calm result card and Done.
 */
import { ArrowRight, Check, RotateCcw, ShieldCheck, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S, tint } from '@/constants/theme';
import type { UrgeOutcome } from '@/lib/store';
import { Button, Card, IconWell, Medal, Num, Row, Screen, Txt, useSpringValue } from '@/ui';

import { IntensitySlider } from './IntensitySlider';
import { kindMeta } from './kinds';
import { SURFER_AT, changeLine, clock, intensityColor, intensityWord, spokenDuration } from './model';

const SURFER_MEDAL = require('@/assets/3d/medal-urge-surfer.webp');

export function ReviewView({
  kind,
  ridden,
  before,
  seconds,
  saved,
  after: savedAfter,
  onSave,
  onDone,
}: {
  kind: string;
  /** Urges ridden out so far, including this one once saved. */
  ridden: number;
  before: number;
  seconds: number;
  saved?: UrgeOutcome;
  after?: number;
  onSave: (outcome: UrgeOutcome, after: number) => void;
  onDone: () => void;
}) {
  const [after, setAfter] = useState(before);

  if (saved) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }} gap={S.xl}>
        {saved === 'resisted' ? (
          <RodeItOut kind={kind} before={before} after={savedAfter} seconds={seconds} medal={ridden >= SURFER_AT} />
        ) : (
          <GaveIn kind={kind} before={before} after={savedAfter} seconds={seconds} />
        )}
        <Button title="Done" icon={Check} color={C.cyan} onPress={onDone} />
      </Screen>
    );
  }

  return (
    <Screen title="How strong now?" caption={`You sat with it for ${clock(seconds)}`}>
      <Card padding={S.xl} style={{ alignItems: 'center', gap: S.xl }}>
        <IntensitySlider value={after} onChange={setAfter} ghost={before} label="How strong is it now?" />
        <View style={{ alignItems: 'center', gap: S.lg }}>
          <Compare before={before} after={after} />
          <Txt v="subhead" color={C.label2} align="center">
            {changeLine(before, after)}
          </Txt>
        </View>
      </Card>

      <View style={{ gap: S.md }}>
        <Button title="I rode it out" icon={ShieldCheck} color={C.green} onPress={() => onSave('resisted', after)} />
        <Button title="I gave in" kind="gray" onPress={() => onSave('gave_in', after)} />
      </View>
    </Screen>
  );
}

/** "8 to 4" as two big numbers with an arrow, each with its word. */
function Compare({ before, after }: { before: number; after: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Strength ${before} before, ${after} now`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.lg }}>
      <Level n={before} caption="Before" />
      <View style={{ height: 72, justifyContent: 'center' }}>
        <ArrowRight size={30} color={C.label3} strokeWidth={2.4} />
      </View>
      <Level n={after} caption="Now" />
    </View>
  );
}

function Level({ n, caption }: { n: number; caption: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 96 }}>
      <Num size={64} color={intensityColor(n)}>
        {n}
      </Num>
      <Txt v="subhead" weight="600">
        {intensityWord(n)}
      </Txt>
      <Txt v="caption1" color={C.label3}>
        {caption}
      </Txt>
    </View>
  );
}

/* ---------- results ---------- */

function RodeItOut({
  kind,
  before,
  after,
  seconds,
  medal,
}: {
  kind: string;
  before: number;
  after?: number;
  seconds: number;
  medal: boolean;
}) {
  return (
    <Card padding={0} style={[styles.result, { backgroundColor: tint(C.green, 0.13), borderColor: tint(C.green, 0.32) }]}>
      <View style={styles.hero}>
        {medal ? <Medal image={SURFER_MEDAL} size={150} label="Urge surfer medal" /> : <BouncyCheck />}
        <View style={{ gap: S.xs, alignItems: 'center' }}>
          <Txt v="title1" color={C.green} align="center">
            Rode it out.
          </Txt>
          <Txt v="body" color={C.label2} align="center">
            {medal ? "You're an urge surfer now." : "That's a rep. The next one gets easier."}
          </Txt>
        </View>
      </View>
      <Facts kind={kind} before={before} after={after} seconds={seconds} />
    </Card>
  );
}

function GaveIn({ kind, before, after, seconds }: { kind: string; before: number; after?: number; seconds: number }) {
  return (
    <Card padding={0} style={[styles.result, { borderColor: 'transparent' }]}>
      <View style={styles.hero}>
        <IconWell icon={RotateCcw} color={C.gray} size={72} />
        <View style={{ gap: S.xs, alignItems: 'center' }}>
          <Txt v="title1" align="center">
            Logged.
          </Txt>
          <Txt v="body" color={C.label2} align="center">
            {'No judgement.\nStart here sooner next time.'}
          </Txt>
        </View>
      </View>
      <Facts kind={kind} before={before} after={after} seconds={seconds} />
    </Card>
  );
}

/** A green check that springs in with a bounce. */
function BouncyCheck() {
  const s = useSpringValue(1, 'bouncy', 0);
  const ring = useSpringValue(1, 'smooth', 0);
  return (
    <View style={styles.checkWrap}>
      <View style={[styles.checkHalo, { opacity: 0.9 * (1 - ring), transform: [{ scale: 0.7 + ring * 0.6 }] }]} />
      <View style={[styles.checkDisc, { transform: [{ scale: Math.max(0, s) }] }]}>
        <Check size={46} color="#FFFFFF" strokeWidth={3.2} />
      </View>
    </View>
  );
}

/** Three small facts: the kind, the change in strength, the time. */
function Facts({ kind, before, after, seconds }: { kind: string; before: number; after?: number; seconds: number }) {
  const m = kindMeta(kind);
  const M = m.icon;
  return (
    <View style={styles.facts}>
      <View style={styles.fact}>
        <M size={20} color={m.color} strokeWidth={2.2} />
        <Txt v="caption1" color={C.label2} numberOfLines={1}>
          {kind}
        </Txt>
      </View>
      <View style={styles.sep} />
      <View style={styles.fact} accessible accessibilityLabel={`Strength ${before} to ${after ?? before}`}>
        <Row gap={4}>
          <Num size={20} weight="700" color={intensityColor(before)}>
            {before}
          </Num>
          <ArrowRight size={14} color={C.label3} strokeWidth={2.6} />
          <Num size={20} weight="700" color={intensityColor(after ?? before)}>
            {after ?? before}
          </Num>
        </Row>
        <Txt v="caption1" color={C.label2}>
          Strength
        </Txt>
      </View>
      <View style={styles.sep} />
      <View style={styles.fact} accessible accessibilityLabel={`Sat with it for ${spokenDuration(seconds)}`}>
        <Row gap={4}>
          <Timer size={15} color={C.label2} strokeWidth={2.4} />
          <Num size={20} weight="700">
            {clock(seconds)}
          </Num>
        </Row>
        <Txt v="caption1" color={C.label2}>
          Sat with it
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  result: { gap: 0, borderWidth: 1 },
  hero: { alignItems: 'center', gap: S.lg, paddingTop: S.xxxl, paddingBottom: S.xxl, paddingHorizontal: S.xl },
  checkWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  checkHalo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: tint(C.green, 0.35) },
  checkDisc: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  facts: {
    flexDirection: 'row',
    paddingVertical: S.lg,
    paddingHorizontal: S.sm,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  fact: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0, paddingHorizontal: 4 },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: C.separator },
});
