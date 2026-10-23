/**
 * Building blocks for the gate's two dark steps (feel, rules).
 * Everything here composes the kit; nothing restyles it.
 */
import { Check, Info, OctagonX, ShieldCheck, Timer, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, F, Pastel, PASTELS, R, S, T, Tint, toneColor, type Tone } from '@/constants/theme';
import { EMOTIONS, emotionTone, type TradingToday } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import type { Settings } from '@/lib/store';
import { ArtCard, Body, Card, Display, Divider, Icon, IconBadge, Pill, ProgressRing, Row, Small, Sub } from '@/ui/legacy';

import { FACT_ICON, emotionLook, ruleIcon } from './look';
import { GROUP_SHORT, sessionSummary, type Fact, type MeaningTone } from './logic';

const ON_ART = 'rgba(242,245,251,0.82)';

/* ---------- header ---------- */

/**
 * Screen header for the two steps: the context line shares its row with the
 * step indicator, so the title keeps the full width and never wraps early.
 */
export function StepHeader({ context, title, step }: { context: string; title: string; step: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Sub style={{ flex: 1 }} numberOfLines={1}>
          {context}
        </Sub>
        <StepIndicator step={step} />
      </Row>
      <Display size={T.hero}>{title}</Display>
    </View>
  );
}

/** Two short bars and "1 of 2". */
export function StepIndicator({ step, of = 2 }: { step: number; of?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${of}`}
      accessibilityValue={{ min: 1, max: of, now: step }}
      style={styles.steps}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: of }, (_, i) => (
          <View
            key={i}
            style={[
              styles.stepBar,
              {
                width: i === step - 1 ? 18 : 10,
                backgroundColor: i < step ? C.accent : 'rgba(255,255,255,0.16)',
              },
            ]}
          />
        ))}
      </View>
      <Small color={C.mist} style={{ fontFamily: F.bold }}>
        {`${step} of ${of}`}
      </Small>
    </View>
  );
}

/* ---------- step 1: today's session ---------- */

const SESSION_ICON: Record<MeaningTone, LucideIcon> = { jade: ShieldCheck, tangerine: TriangleAlert, coral: OctagonX };

/** Ember hero card: today's trading state at a glance. */
export function SessionCard({ trading, settings }: { trading: TradingToday; settings: Settings }) {
  const s = sessionSummary(trading, settings);
  const { maxTrades, maxLossStreak } = settings;
  const used = trading.taken.length;
  const streak = trading.lossStreak;

  const tradesColor = used >= maxTrades ? C.coral : used === maxTrades - 1 ? C.tangerine : C.mist;
  const streakColor =
    streak >= maxLossStreak ? C.coral : maxLossStreak > 1 && streak === maxLossStreak - 1 ? C.tangerine : C.mist;
  const since = trading.minsSinceLoss;

  return (
    <ArtCard
      art="ember"
      footer={
        <>
          <FooterStat value={`${used}/${maxTrades}`} label="Trades used" color={tradesColor} />
          <FooterRule />
          <FooterStat value={String(streak)} label="Loss streak" color={streakColor} />
          <FooterRule />
          <FooterStat
            value={since === null ? 'None' : since < 60 ? `${since}m ago` : `${Math.floor(since / 60)}h ago`}
            label="Last loss"
            color={s.cooldownLeft !== null ? C.coral : C.mist}
          />
        </>
      }>
      <Row style={{ justifyContent: 'space-between' }}>
        <Small color={ON_ART}>Today’s session</Small>
        {/* A dark backing keeps the pill readable on the bright corner of the artwork. */}
        <View style={styles.pillBack}>
          <Pill icon={s.cooldownLeft !== null && !trading.limitHit ? Timer : SESSION_ICON[s.tone]} label={s.pill} tone={s.tone} />
        </View>
      </Row>
      <Display size={26}>{s.headline}</Display>
      {trading.limitHit ? (
        <View style={styles.limit} accessibilityRole="alert">
          <Icon icon={OctagonX} size={20} color={C.coral} stroke={2.4} />
          <Body color={C.coral} style={{ flex: 1, fontFamily: F.bold }}>
            {trading.limitHit.replace(/\s*Done for today\.?$/, '')}
          </Body>
        </View>
      ) : null}
      <Sub color={ON_ART}>{s.line}</Sub>
    </ArtCard>
  );
}

function FooterStat({ value, label, color = C.mist }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Display size={18} color={color} numberOfLines={1}>
        {value}
      </Display>
      <Small color="rgba(242,245,251,0.7)" numberOfLines={1}>
        {label}
      </Small>
    </View>
  );
}

const FooterRule = () => <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />;

/* ---------- step 1: emotion groups ---------- */

/** Label above a group of emotion tiles. The dot carries the group's meaning colour. */
export function GroupHead({ title, aside, tone }: { title: string; aside: string; tone: MeaningTone }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Row gap={10}>
        <View style={[styles.dot, { backgroundColor: C[tone] }]} />
        <Display size={17} weight="bold">
          {title}
        </Display>
      </Row>
      <Small>{aside}</Small>
    </Row>
  );
}

/** What each selected emotion means, under the grid. */
export function PickedCard({ selected }: { selected: string[] }) {
  const picked = EMOTIONS.filter((e) => selected.includes(e.label));
  if (!picked.length)
    return (
      <Card>
        <Row gap={S.md}>
          <IconBadge icon={Info} color={C.accent} bg={Tint.accent} size={36} />
          <Sub style={{ flex: 1 }}>Pick everything that’s true right now. More than one is fine.</Sub>
        </Row>
      </Card>
    );
  return (
    <Card style={{ gap: 0, paddingVertical: S.xs }}>
      {picked.map((e, i) => {
        const look = emotionLook(e.label);
        const tone = emotionTone(e.label) as MeaningTone;
        return (
          <View key={e.label}>
            {i > 0 ? <Divider /> : null}
            <Row gap={S.md} style={{ paddingVertical: S.md }}>
              <IconBadge icon={look.icon} color={C.onLight} bg={Pastel[look.pastel][0]} size={38} />
              <View style={{ flex: 1, gap: 1 }}>
                <Body style={{ fontFamily: F.bold }}>{e.label}</Body>
                <Sub>{e.hint}</Sub>
              </View>
              <Small color={C[tone]} style={{ fontFamily: F.bold }}>
                {GROUP_SHORT[tone]}
              </Small>
            </Row>
          </View>
        );
      })}
    </Card>
  );
}

/* ---------- step 2: checklist ---------- */

/** Ring plus a sentence: how much of the checklist is honestly ticked. */
export function ChecklistProgress({ ticked, total }: { ticked: number; total: number }) {
  const all = total > 0 && ticked === total;
  return (
    <Card style={{ paddingVertical: S.lg }}>
      <Row gap={S.lg}>
        <ProgressRing
          value={total ? ticked / total : 0}
          size={68}
          stroke={7}
          colors={all ? [C.jade, '#9BE7C6'] : [C.accent, '#BFAEFF']}>
          <Display size={18} color={all ? C.jade : C.mist}>
            {`${ticked}/${total}`}
          </Display>
        </ProgressRing>
        <View style={{ flex: 1, gap: 2 }}>
          <Display size={20} weight="bold">
            {all ? `All ${total} ticked.` : `${ticked} of ${total} ticked`}
          </Display>
          <Sub>{all ? 'Clean checklist. Run the check.' : 'Leave a box empty and the gate says stop.'}</Sub>
        </View>
      </Row>
    </Card>
  );
}

/** One rule as a large tappable card with a big check circle. */
export function RuleCard({
  rule,
  index,
  checked,
  onPress,
}: {
  rule: string;
  index: number;
  checked: boolean;
  onPress: () => void;
}) {
  const pastel = Pastel[PASTELS[index % PASTELS.length]];
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={rule}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.rule,
        checked && styles.ruleOn,
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 },
      ]}>
      <IconBadge icon={ruleIcon(rule)} color={checked ? C.jade : pastel[1]} bg={checked ? Tint.jade : C.raised} size={42} />
      <Body style={{ flex: 1 }}>{rule}</Body>
      <View style={[styles.check, checked && styles.checkOn]}>
        {checked ? <Icon icon={Check} size={18} color={C.onLight} stroke={3.2} /> : null}
      </View>
    </Pressable>
  );
}

/** Today's facts as the gate will see them, each with an icon. */
export function FactsCard({ facts }: { facts: Fact[] }) {
  return (
    <Card style={{ gap: S.md }}>
      {facts.map((f) => {
        const tone: Tone = f.tone;
        const color = tone === 'neutral' ? C.haze : toneColor(tone);
        const bg = tone === 'neutral' ? C.raised : Tint[tone];
        return (
          <Row key={f.text} gap={S.md} style={{ alignItems: 'center' }}>
            <IconBadge icon={FACT_ICON[f.kind]} color={color} bg={bg} size={34} />
            <Sub color={tone === 'neutral' ? C.mist : color} style={{ flex: 1 }}>
              {f.text}
            </Sub>
          </Row>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
  },
  stepBar: { height: 4, borderRadius: 2 },
  pillBack: { backgroundColor: 'rgba(10,16,32,0.55)', borderRadius: R.pill },
  limit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: S.md,
    paddingHorizontal: 14,
    borderRadius: R.control,
    backgroundColor: 'rgba(10,16,32,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,120,0.55)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 80,
    paddingVertical: S.lg,
    paddingLeft: S.lg,
    paddingRight: 18,
    borderRadius: R.tile,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
  },
  ruleOn: { borderColor: 'rgba(79,214,156,0.5)' },
  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.jade, borderColor: C.jade },
});

