/**
 * Journal building blocks. Composed only from the kit and theme tokens.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, R as Radius, S, T, Tint, toneColor, type Tone } from '@/constants/theme';
import { emotionTone, fmtR, timeAgo, type Bucket } from '@/lib/derive';
import type { Trade } from '@/lib/store';
import { Body, Button, Display, Divider, Row, Small, Stat, Sub, Surface } from '@/ui';

import { clock, count, inSentence, outcome, pct, rColor, VERDICT } from './format';

/* ---------- small pieces ---------- */

export function ToneDot({ tone, size = 7 }: { tone: Tone; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: toneColor(tone) }} />;
}

/** Emotion names as small coloured text, each with its tone dot. */
export function EmotionTags({ emotions, empty = 'No emotion named' }: { emotions: string[]; empty?: string }) {
  if (!emotions.length) return <Small color={C.faint}>{empty}</Small>;
  return (
    <View style={styles.tags}>
      {emotions.map((e) => {
        const tone = emotionTone(e);
        return (
          <Row key={e} gap={5}>
            <ToneDot tone={tone} size={6} />
            <Small color={toneColor(tone)} style={{ fontWeight: '600' }}>
              {e}
            </Small>
          </Row>
        );
      })}
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const neutral = tone === 'neutral';
  return (
    <View style={[styles.badge, { backgroundColor: neutral ? C.raised : Tint[tone] }]}>
      <Text style={[styles.badgeText, { color: neutral ? C.haze : toneColor(tone) }]}>{label}</Text>
    </View>
  );
}

/** Horizontal bar centred on zero: coral grows left for negative R, jade grows right for positive. */
export function ZeroBar({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.min(Math.abs(value) / max, 1) : 0;
  const width = value === 0 ? 0 : Math.max(share * 100, 4);
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.half, { justifyContent: 'flex-end' }]}>
        {value < 0 ? <View style={[styles.fill, styles.fillLeft, { width: `${width}%`, backgroundColor: C.coral }]} /> : null}
      </View>
      <View style={styles.zero} />
      <View style={[styles.half, { justifyContent: 'flex-start' }]}>
        {value > 0 ? <View style={[styles.fill, styles.fillRight, { width: `${width}%`, backgroundColor: C.jade }]} /> : null}
      </View>
    </View>
  );
}

/** "while frustrated", "with FOMO", "out of revenge". */
export function emotionPhrase(label: string) {
  if (label === 'FOMO') return 'with FOMO';
  if (label === 'Revenge') return 'out of revenge';
  return `while ${inSentence(label)}`;
}

/* ---------- open trades ---------- */

export function OpenTrade({ trade, onLog }: { trade: Trade; onLog: () => void }) {
  return (
    <View style={{ gap: S.sm }}>
      <Row style={{ alignItems: 'baseline' }} gap={S.md}>
        <Display size={T.stat}>{clock(trade.ts)}</Display>
        <Sub>{timeAgo(trade.ts)}</Sub>
      </Row>
      <EmotionTags emotions={trade.emotions} />
      {trade.plan ? <Body>{trade.plan}</Body> : <Sub color={C.faint}>No plan written</Sub>}
      <Button label="Log result" onPress={onLog} style={{ marginTop: S.xs }} />
    </View>
  );
}

/* ---------- what your emotions cost ---------- */

export function EmotionCostRow({ bucket, max }: { bucket: Bucket; max: number }) {
  const tone = emotionTone(bucket.label);
  const meta = `${count(bucket.n, 'trade')}, ${pct(bucket.winRate)} win rate`;
  return (
    <View
      accessible
      accessibilityLabel={`${bucket.label}: ${meta}, average ${fmtR(bucket.avgR)}`}
      style={{ gap: S.sm, paddingVertical: 2 }}>
      <Row gap={S.md}>
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={S.sm}>
            <ToneDot tone={tone} />
            <Body style={{ fontWeight: '600' }}>{bucket.label}</Body>
          </Row>
          <Small>{meta}</Small>
        </View>
        <Display size={T.stat} color={rColor(bucket.avgR)}>
          {fmtR(bucket.avgR)}
        </Display>
      </Row>
      <ZeroBar value={bucket.avgR} max={max} />
    </View>
  );
}

/** The one sentence that names the most expensive emotion. */
export function CostHeadline({ worst }: { worst: Bucket }) {
  return (
    <Body>
      {`Trades taken ${emotionPhrase(worst.label)}: `}
      <Text style={{ fontFamily: F.body, fontWeight: '700', color: C.mist }}>{pct(worst.winRate)}</Text>
      {' win rate, '}
      <Text style={{ fontFamily: F.body, fontWeight: '700', color: rColor(worst.avgR) }}>{fmtR(worst.avgR)}</Text>
      {' on average.'}
    </Body>
  );
}

function Empty() {
  return (
    <View style={{ flex: 1 }}>
      <Small color={C.faint}>None yet</Small>
    </View>
  );
}

/** Followed rules vs broke rules, side by side. */
export function RulesComparison({ followed, broke }: { followed: Bucket; broke: Bucket }) {
  return (
    <Surface>
      <Body style={{ fontWeight: '600' }}>Followed rules vs broke rules</Body>
      <Row gap={S.lg} style={{ alignItems: 'flex-start' }}>
        <Row gap={S.sm} style={{ flex: 1 }}>
          <ToneDot tone="jade" />
          <Sub>{`Followed, ${count(followed.n, 'trade')}`}</Sub>
        </Row>
        <Row gap={S.sm} style={{ flex: 1 }}>
          <ToneDot tone="coral" />
          <Sub>{`Broke, ${count(broke.n, 'trade')}`}</Sub>
        </Row>
      </Row>
      <Row gap={S.lg} style={{ alignItems: 'flex-start' }}>
        {followed.n ? <Stat value={pct(followed.winRate)} label="Win rate" tone="jade" /> : <Empty />}
        {broke.n ? <Stat value={pct(broke.winRate)} label="Win rate" tone="coral" /> : <Empty />}
      </Row>
      <Row gap={S.lg} style={{ alignItems: 'flex-start' }}>
        {followed.n ? <Stat value={fmtR(followed.avgR)} label="Average per trade" tone="jade" /> : <View style={{ flex: 1 }} />}
        {broke.n ? <Stat value={fmtR(broke.avgR)} label="Average per trade" tone="coral" /> : <View style={{ flex: 1 }} />}
      </Row>
    </Surface>
  );
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** Overrides (coral) and walk-aways (jade), each only when it has happened. */
export function DisciplineLines({ overrides, skipped }: { overrides: Bucket; skipped: number }) {
  if (!overrides.n && !skipped) return null;
  return (
    <Surface>
      {overrides.n ? (
        <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
          <View style={styles.lineDot}>
            <ToneDot tone="coral" size={8} />
          </View>
          <Body style={{ flex: 1 }}>
            {`Overrode a stop ${times(overrides.n)}: ${pct(overrides.winRate)} win rate, `}
            <Text style={{ fontWeight: '700', color: rColor(overrides.avgR) }}>{fmtR(overrides.avgR)}</Text>
            {' on average.'}
          </Body>
        </Row>
      ) : null}
      {overrides.n && skipped ? <Divider /> : null}
      {skipped ? (
        <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
          <View style={styles.lineDot}>
            <ToneDot tone="jade" size={8} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Body color={C.jade} style={{ fontWeight: '600' }}>
              {`Walked away ${times(skipped)}`}
            </Body>
            <Small>Every skip is a rule kept.</Small>
          </View>
        </Row>
      ) : null}
    </Surface>
  );
}

/* ---------- history ---------- */

export function TradeRow({ trade, onPress }: { trade: Trade; onPress: () => void }) {
  const o = outcome(trade);
  const closed = trade.taken && !!trade.result;
  const hasR = closed && trade.r !== undefined;
  const label = [
    clock(trade.ts),
    o.label,
    hasR ? fmtR(trade.r ?? 0) : null,
    trade.emotions.join(', ') || null,
    trade.overridden ? 'Override' : null,
    trade.followedRules === false ? 'Broke rules' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      disabled={!trade.taken}
      onPress={onPress}
      accessibilityRole={trade.taken ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityHint={trade.taken ? (closed ? 'Edit the result' : 'Log the result') : undefined}
      style={({ pressed }) => [styles.tradeRow, pressed && { opacity: 0.6 }]}>
      <Display size={T.h2} weight="semi" color={C.haze} style={styles.clock}>
        {clock(trade.ts)}
      </Display>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.markers}>
          <Badge label={o.label} tone={o.tone} />
          {trade.overridden ? (
            <Small color={C.coral} style={{ fontWeight: '600' }}>
              Override
            </Small>
          ) : null}
          {trade.followedRules === false ? (
            <Small color={C.coral} style={{ fontWeight: '600' }}>
              Broke rules
            </Small>
          ) : null}
          {!trade.taken ? (
            <Small color={toneColor(VERDICT[trade.verdict].tone)}>{`Gate said ${trade.verdict}`}</Small>
          ) : null}
        </View>
        <EmotionTags emotions={trade.emotions} />
        {trade.plan ? (
          <Small color={C.faint} numberOfLines={1}>
            {trade.plan}
          </Small>
        ) : null}
      </View>
      {hasR ? (
        <Display size={T.h2} color={rColor(trade.r ?? 0)} style={{ marginTop: 1 }}>
          {fmtR(trade.r ?? 0)}
        </Display>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', columnGap: S.md, rowGap: S.xs },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: F.body, fontSize: T.small, fontWeight: '700' },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 8,
    borderRadius: 4,
    backgroundColor: C.raised,
  },
  half: { flex: 1, height: '100%', flexDirection: 'row' },
  fill: { height: '100%' },
  fillLeft: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  fillRight: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  zero: { width: 2, height: 14, borderRadius: 1, backgroundColor: C.faint },
  lineDot: { height: 24, justifyContent: 'center' },
  tradeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, minHeight: 44, paddingVertical: 2 },
  clock: { width: 52, marginTop: 1 },
  markers: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: S.sm, rowGap: S.xs },
});
