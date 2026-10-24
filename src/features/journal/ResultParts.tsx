/**
 * Pieces of the trade result sheet: iOS nav bar, trade recap, the R picker and the
 * end-of-day stop card.
 */
import { Minus, OctagonX, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, S, VALENCE, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { Result, Trade } from '@/lib/store';
import { Badge, Button, Card, Chip, IconWell, Num, Pressy, Row, Segmented, Txt, useSpringValue } from '@/ui';

import { FeelingTags } from './bits';
import { canStep, clock, dayLabel, fmtRx, rColor, signR } from './format';
import { outcomeLook, VERDICT } from './look';

/* ---------- nav bar ---------- */

function BarButton({ label, onPress, bold, disabled }: { label: string; onPress: () => void; bold?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: 6 })}>
      <Txt v="body" weight={bold ? '700' : '400'} color={disabled ? C.label3 : C.tint}>
        {label}
      </Txt>
    </Pressable>
  );
}

type BarAction = { label: string; onPress: () => void; disabled?: boolean };

/** iOS sheet header: a leading action (Cancel), a bold title, a bold trailing action (Save). */
export function NavBar({ title, left, right }: { title: string; left?: BarAction; right?: BarAction }) {
  return (
    <View style={styles.nav}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {left ? <BarButton label={left.label} onPress={left.onPress} disabled={left.disabled} /> : null}
      </View>
      <Txt v="headline" weight="700" align="center" numberOfLines={1} style={{ flexShrink: 0 }}>
        {title}
      </Txt>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {right ? <BarButton label={right.label} bold onPress={right.onPress} disabled={right.disabled} /> : null}
      </View>
    </View>
  );
}

/* ---------- recap ---------- */

export function Recap({ trade: t, now }: { trade: Trade; now: number }) {
  const o = outcomeLook(t);
  const v = VERDICT[t.verdict];
  const mood = t.valence ? VALENCE[Math.min(7, Math.max(1, t.valence)) - 1] : undefined;
  return (
    <Card padding={S.lg} style={{ gap: 14 }}>
      <Row gap={S.md}>
        <IconWell icon={o.icon} color={o.color} size={44} />
        <View style={{ flex: 1, gap: 1 }}>
          <Num size={24} weight="700">
            {clock(t.ts)}
          </Num>
          <Txt v="footnote" color={C.label2}>
            {dayLabel(t.ts, now)}
          </Txt>
        </View>
        <Badge label={`Gate said ${v.word.toLowerCase()}`} color={v.color} />
      </Row>
      {t.emotions.length || mood ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <FeelingTags feelings={t.emotions} size="md" />
          {mood ? (
            <View style={[styles.mood, { backgroundColor: tint(mood.color, 0.16) }]}>
              <View style={[styles.moodDot, { backgroundColor: mood.color }]} />
              <Txt v="subhead" weight="600" color={mood.color}>
                {mood.label}
              </Txt>
            </View>
          ) : null}
        </View>
      ) : null}
      {t.overridden ? (
        <Row gap={6}>
          <OctagonX size={15} color={C.red} strokeWidth={2.4} />
          <Txt v="footnote" weight="600" color={C.red}>
            Taken through a stop
          </Txt>
        </Row>
      ) : null}
      <Txt v="body" color={t.plan ? C.label : C.label3}>
        {t.plan || 'No plan written'}
      </Txt>
    </Card>
  );
}

/* ---------- R picker ---------- */

const QUICK = [-1, 1, 2, 3];

const RESULTS: { value: Result; label: string }[] = [
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'be', label: 'Break even' },
];

function RoundButton({ dir, enabled, onPress }: { dir: 1 | -1; enabled: boolean; onPress: () => void }) {
  const I = dir > 0 ? Plus : Minus;
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={dir > 0 ? 'Add a quarter R' : 'Take off a quarter R'}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      scaleTo={0.88}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.round, { opacity: enabled ? 1 : 0.35 }]}>
      <I size={24} color={C.label} strokeWidth={2.4} />
    </Pressy>
  );
}

/** Result segments, then the live R number with − and +, then signed quick values. */
export function RPicker({
  r,
  result,
  onResult,
  onStep,
  onQuick,
}: {
  r: number;
  result: Result | undefined;
  onResult: (v: Result) => void;
  onStep: (dir: 1 | -1) => void;
  onQuick: (v: number) => void;
}) {
  const shown = useSpringValue(r, 'snappy');
  const value = Math.round(shown * 100) / 100;
  const [room, setRoom] = useState(0);
  // Shrink long values ("−12.25R") so they never touch the − and + buttons.
  const size = room ? Math.max(34, Math.min(56, Math.floor(room / (fmtRx(r).length * 0.6)))) : 56;
  const color = result ? rColor(r) : r === 0 ? C.label3 : rColor(r);
  const caption = !result
    ? 'Pick a result, or tap − or +'
    : result === 'be'
      ? 'Saved as break even'
      : result === 'win'
        ? 'Saved as a win'
        : 'Saved as a loss';
  return (
    <Card padding={S.lg} style={{ gap: S.lg, alignItems: 'stretch' }}>
      <Segmented options={RESULTS} value={result} onChange={onResult} />
      <Row gap={S.md} style={{ justifyContent: 'space-between', paddingTop: S.xs }}>
        <RoundButton dir={-1} enabled={canStep(r, -1, result)} onPress={() => onStep(-1)} />
        <View
          style={{ flex: 1, alignItems: 'center', gap: 2, minWidth: 0 }}
          onLayout={(e) => setRoom(e.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`${fmtRx(r)}. ${caption}`}>
          <View style={{ height: 64, justifyContent: 'center' }}>
            <Num size={size} weight="700" color={color} numberOfLines={1} style={{ letterSpacing: -1 }}>
              {fmtRx(value)}
            </Num>
          </View>
          <Txt v="footnote" color={C.label2}>
            {caption}
          </Txt>
        </View>
        <RoundButton dir={1} enabled={canStep(r, 1, result)} onPress={() => onStep(1)} />
      </Row>
      <View style={styles.quick}>
        {QUICK.map((q) => (
          <Chip
            key={q}
            label={fmtRx(q)}
            color={q < 0 ? C.red : C.green}
            selected={r === q && !!result && result !== 'be'}
            onPress={() => onQuick(q)}
          />
        ))}
      </View>
    </Card>
  );
}

/** Quick values are signed, so they also pick the result. */
export const quickPick = (q: number): { r: number; result: Result } => ({
  r: q,
  result: q < 0 ? 'loss' : 'win',
});

/** The value that gets saved. */
export const savedR = (r: number, result: Result) => (result === 'be' ? r : signR(r, result));

/* ---------- done for today ---------- */

export function LimitCard({ reason, onClose }: { reason: string; onClose: () => void }) {
  return (
    <View style={{ gap: S.lg }}>
      <Card padding={S.xl} style={{ gap: S.lg, backgroundColor: tint(C.red, 0.16) }}>
        <IconWell icon={OctagonX} color={C.red} size={56} />
        <View style={{ gap: S.sm }}>
          <Txt v="title1" color={C.red}>
            Done trading for today.
          </Txt>
          <Txt v="body">{reason}</Txt>
          <Txt v="subhead" color={C.label2}>
            Stopping now protects the account. The setups come back tomorrow.
          </Txt>
        </View>
        <Button title="Close the charts" onPress={onClose} color={C.red} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 44 },
  mood: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.fill3, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
});
