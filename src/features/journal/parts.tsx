/**
 * Journal building blocks. Composed from the kit and theme tokens.
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  ChevronRight,
  DoorOpen,
  NotebookPen,
  OctagonX,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, R as Radius, S, toneColor, type Tone } from '@/constants/theme';
import { emotionTone, fmtR, timeAgo, type Bucket } from '@/lib/derive';
import type { Trade } from '@/lib/store';
import { Body, Button, Card, Display, Divider, Icon, IconBadge, Pill, Row, Small, Sub } from '@/ui';

import { EquityCurve } from './EquityCurve';
import { alpha, clock, count, dayLabel, inSentence, outcome, pct, rColor, VERDICT, whenLabel, type DayGroup } from './format';
import { emotionIcon, outcomeIcon, toneBg, toneFg, VERDICT_ICON } from './icons';

const onArt = (a: number) => `rgba(242,245,251,${a})`;
const rTone = (r: number): Tone => (r > 0 ? 'jade' : r < 0 ? 'coral' : 'neutral');

/* ---------- small pieces ---------- */

/** IconBadge in a tone's colours. */
export function ToneBadge({ icon, tone, size = 40 }: { icon: LucideIcon; tone: Tone; size?: number }) {
  return <IconBadge icon={icon} color={toneFg(tone)} bg={toneBg(tone)} size={size} />;
}

/** Compact label for list rows. `flag` gives a tinted fill for warnings; otherwise a quiet fill with a dot. */
export function MiniPill({ label, tone, icon, flag }: { label: string; tone: Tone; icon?: LucideIcon; flag?: boolean }) {
  const fg = toneFg(tone);
  return (
    <View style={[styles.mini, { backgroundColor: flag ? alpha(fg, 0.14) : 'rgba(255,255,255,0.06)' }]}>
      {icon ? <Icon icon={icon} size={12} color={fg} stroke={2.4} /> : <View style={[styles.miniDot, { backgroundColor: fg }]} />}
      <Text style={[styles.miniText, { color: flag ? fg : C.mist }]}>{label}</Text>
    </View>
  );
}

/** Emotions as pills with their icon (md) or as compact dotted pills for list rows (sm). */
export function EmotionPills({
  emotions,
  size = 'md',
  empty = 'No emotion named',
}: {
  emotions: string[];
  size?: 'sm' | 'md';
  empty?: string;
}) {
  if (!emotions.length) return <Small color={C.faint}>{empty}</Small>;
  return (
    <View style={[styles.wrap, { gap: size === 'md' ? S.sm : 6 }]}>
      {emotions.map((e) =>
        size === 'md' ? (
          <Pill key={e} label={e} icon={emotionIcon(e)} tone={emotionTone(e)} />
        ) : (
          <MiniPill key={e} label={e} tone={emotionTone(e)} />
        ),
      )}
    </View>
  );
}

/** A short line of guidance with an icon in front. */
export function HintRow({ icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Row gap={S.sm} style={{ paddingHorizontal: 2 }}>
      <Icon icon={icon} size={16} color={C.haze} />
      <Small style={{ flex: 1 }}>{children}</Small>
    </Row>
  );
}

/* ---------- hero ---------- */

function HeroStat({ value, label, color = C.mist }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Display size={18} color={color} numberOfLines={1}>
        {value}
      </Display>
      <Small color={onArt(0.7)}>{label}</Small>
    </View>
  );
}

const HeroDivider = () => <View style={{ width: 1, backgroundColor: onArt(0.15) }} />;

export function HeroFooter({
  winRate,
  avgR,
  skipped,
  closed,
}: {
  winRate: number;
  avgR: number;
  skipped: number;
  closed: number;
}) {
  return (
    <>
      <HeroStat value={closed ? pct(winRate) : '–'} label="Win rate" />
      <HeroDivider />
      <HeroStat value={closed ? fmtR(avgR) : '–'} label="Average R" color={closed ? rColor(avgR) : C.mist} />
      <HeroDivider />
      <HeroStat value={String(skipped)} label="Walked away" color={skipped ? C.jade : C.mist} />
    </>
  );
}

/** Net R, a line under it and the equity curve bleeding to the card edges. */
export function HeroBody({
  since,
  best,
  title,
  titleColor,
  line,
  curve,
}: {
  since?: string;
  best?: number;
  title: string;
  titleColor: string;
  line: string;
  curve: number[];
}) {
  const closed = curve.length - 1;
  const net = curve[curve.length - 1] ?? 0;
  const color = closed ? (net >= 0 ? C.jade : C.coral) : onArt(0.45);
  return (
    <>
      <Row style={{ justifyContent: 'space-between', minHeight: 30 }}>
        <Small color={onArt(0.8)}>{since ?? 'Your record'}</Small>
        {best !== undefined ? <Pill icon={Award} label={`Best ${fmtR(best)}`} /> : null}
      </Row>
      <View style={{ gap: 2 }}>
        <Display size={closed ? 48 : 30} color={titleColor} style={{ letterSpacing: -1.4 }}>
          {title}
        </Display>
        <Sub color={onArt(0.8)}>{line}</Sub>
      </View>
      <EquityCurve
        values={closed ? curve : []}
        color={color}
        height={92}
        label={closed ? `Equity curve: ${fmtR(net)} after ${count(closed, 'closed trade')}` : 'Equity curve, no closed trades yet'}
        style={{ marginHorizontal: -S.xl, marginBottom: -S.xl, marginTop: S.xs }}
      />
    </>
  );
}

/* ---------- open trades ---------- */

export function OpenTradeCard({ trade, onLog }: { trade: Trade; onLog: () => void }) {
  const v = VERDICT[trade.verdict];
  return (
    <LinearGradient
      colors={[alpha(C.tangerine, 0.09), alpha(C.tangerine, 0)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.toneCard, { borderColor: alpha(C.tangerine, 0.4) }]}>
      <Row gap={S.md}>
        <ToneBadge icon={outcomeIcon(trade)} tone="tangerine" size={44} />
        <View style={{ flex: 1, gap: 1 }}>
          <Display size={22}>{clock(trade.ts)}</Display>
          <Small>{`Opened ${timeAgo(trade.ts)}`}</Small>
        </View>
        <Pill icon={VERDICT_ICON[trade.verdict]} label={`Gate said ${v.word.toLowerCase()}`} tone={v.tone} />
      </Row>
      <EmotionPills emotions={trade.emotions} />
      <View style={{ gap: 4 }}>
        <Small color={C.faint}>Plan</Small>
        {trade.plan ? <Body>{trade.plan}</Body> : <Sub color={C.faint}>No plan written</Sub>}
      </View>
      {trade.overridden ? <HintRow icon={OctagonX}>You took it through a stop.</HintRow> : null}
      <Button label="Log result" icon={NotebookPen} onPress={onLog} />
    </LinearGradient>
  );
}

/* ---------- what your emotions cost ---------- */

/** "while frustrated", "with FOMO", "out of revenge". */
export function emotionPhrase(label: string) {
  if (label === 'FOMO') return 'with FOMO';
  if (label === 'Revenge') return 'out of revenge';
  return `while ${inSentence(label)}`;
}

/** The one sentence that names the most expensive emotion, as a highlighted insight. */
export function CostInsight({ worst }: { worst: Bucket }) {
  return (
    <LinearGradient
      colors={[alpha(C.coral, 0.16), alpha(C.coral, 0.03)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.toneCard, { borderColor: alpha(C.coral, 0.32) }]}>
      <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
        <ToneBadge icon={emotionIcon(worst.label)} tone="coral" size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <Small color={C.coral} style={{ fontFamily: F.bold }}>
            Your most expensive feeling
          </Small>
          <Body>
            {`Trades taken ${emotionPhrase(worst.label)}: `}
            <Text style={{ fontFamily: F.extra, color: C.mist }}>{pct(worst.winRate)}</Text>
            {' win rate, '}
            <Text style={{ fontFamily: F.extra, color: rColor(worst.avgR) }}>{fmtR(worst.avgR)}</Text>
            {' on average.'}
          </Body>
        </View>
      </Row>
    </LinearGradient>
  );
}

/** Horizontal bar centred on zero: coral grows left for negative R, jade grows right for positive. */
export function ZeroBar({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.min(Math.abs(value) / max, 1) : 0;
  const width = value === 0 ? 0 : Math.max(share * 100, 6);
  return (
    <View style={styles.barBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.track}>
        <View style={[styles.half, { justifyContent: 'flex-end' }]}>
          {value < 0 ? (
            <LinearGradient
              colors={[C.coral, alpha(C.coral, 0.45)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${width}%` }]}
            />
          ) : null}
        </View>
        <View style={[styles.half, { justifyContent: 'flex-start' }]}>
          {value > 0 ? (
            <LinearGradient
              colors={[alpha(C.jade, 0.45), C.jade]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${width}%` }]}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.zero} />
    </View>
  );
}

export function EmotionCostRow({ bucket, max }: { bucket: Bucket; max: number }) {
  const tone = emotionTone(bucket.label);
  const meta = `${count(bucket.n, 'trade')} · ${pct(bucket.winRate)} win rate`;
  return (
    <View
      accessible
      accessibilityLabel={`${bucket.label}: ${count(bucket.n, 'trade')}, ${pct(bucket.winRate)} win rate, average ${fmtR(bucket.avgR)}`}
      style={{ gap: 10 }}>
      <Row gap={S.md}>
        <ToneBadge icon={emotionIcon(bucket.label)} tone={tone} size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Body style={{ fontFamily: F.bold }}>{bucket.label}</Body>
          <Small>{meta}</Small>
        </View>
        <Display size={20} color={rColor(bucket.avgR)}>
          {fmtR(bucket.avgR)}
        </Display>
      </Row>
      <ZeroBar value={bucket.avgR} max={max} />
    </View>
  );
}

/** Analytics card: one row per pre-trade emotion, worst first. */
export function EmotionCostCard({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(0, ...buckets.map((b) => Math.abs(b.avgR)));
  return (
    <Card style={{ gap: S.lg, paddingVertical: S.lg + 2 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Small color={C.faint}>Average R per trade, by feeling</Small>
        <Row gap={S.md}>
          <Legend color={C.coral} label="Costs" />
          <Legend color={C.jade} label="Pays" />
        </Row>
      </Row>
      {buckets.map((b, i) => (
        <React.Fragment key={b.label}>
          {i > 0 ? <Divider /> : null}
          <EmotionCostRow bucket={b} max={max} />
        </React.Fragment>
      ))}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={5}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Small color={C.haze}>{label}</Small>
    </Row>
  );
}

/* ---------- followed vs broke ---------- */

function RuleCard({ bucket, tone, icon, title }: { bucket: Bucket; tone: 'jade' | 'coral'; icon: LucideIcon; title: string }) {
  const color = toneColor(tone);
  return (
    <LinearGradient
      colors={[alpha(color, 0.16), alpha(color, 0.03)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.toneCard, styles.ruleCard, { borderColor: alpha(color, 0.32) }]}
      accessible
      accessibilityLabel={
        bucket.n
          ? `${title}: ${count(bucket.n, 'trade')}, ${pct(bucket.winRate)} win rate, ${fmtR(bucket.avgR)} average`
          : `${title}: none yet`
      }>
      <Row style={{ justifyContent: 'space-between' }}>
        <ToneBadge icon={icon} tone={tone} size={36} />
        <Small>{count(bucket.n, 'trade')}</Small>
      </Row>
      <Sub color={C.mist} style={{ fontFamily: F.bold, marginTop: S.xs }}>
        {title}
      </Sub>
      {bucket.n ? (
        <>
          <View>
            <Display size={34} color={color}>
              {pct(bucket.winRate)}
            </Display>
            <Small>win rate</Small>
          </View>
          <View style={styles.rateTrack}>
            {bucket.winRate > 0 ? (
              <View style={[styles.rateFill, { width: `${Math.max(bucket.winRate * 100, 4)}%`, backgroundColor: color }]} />
            ) : null}
          </View>
          <View>
            <Display size={19} color={rColor(bucket.avgR)}>
              {fmtR(bucket.avgR)}
            </Display>
            <Small>average per trade</Small>
          </View>
        </>
      ) : (
        <Small color={C.faint}>None yet</Small>
      )}
    </LinearGradient>
  );
}

export function RulesComparison({ followed, broke }: { followed: Bucket; broke: Bucket }) {
  return (
    <Row gap={S.md} style={{ alignItems: 'stretch' }}>
      <RuleCard bucket={followed} tone="jade" icon={ShieldCheck} title="Followed rules" />
      <RuleCard bucket={broke} tone="coral" icon={ShieldAlert} title="Broke rules" />
    </Row>
  );
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** Overrides (coral) and walk-aways (jade), each only when it has happened. */
export function DisciplineLines({ overrides, skipped }: { overrides: Bucket; skipped: number }) {
  if (!overrides.n && !skipped) return null;
  return (
    <Card>
      {overrides.n ? (
        <Row gap={S.md}>
          <ToneBadge icon={OctagonX} tone="coral" size={36} />
          <View style={{ flex: 1, gap: 1 }}>
            <Sub color={C.mist} style={{ fontFamily: F.bold }}>
              {`Overrode a stop ${times(overrides.n)}`}
            </Sub>
            <Small>
              {`${pct(overrides.winRate)} win rate, `}
              <Text style={{ fontFamily: F.bold, color: rColor(overrides.avgR) }}>{fmtR(overrides.avgR)}</Text>
              {' on average'}
            </Small>
          </View>
        </Row>
      ) : null}
      {overrides.n && skipped ? <Divider /> : null}
      {skipped ? (
        <Row gap={S.md}>
          <ToneBadge icon={DoorOpen} tone="jade" size={36} />
          <View style={{ flex: 1, gap: 1 }}>
            <Sub color={C.jade} style={{ fontFamily: F.bold }}>
              {`Walked away ${times(skipped)}`}
            </Sub>
            <Small>Every skip is a rule kept.</Small>
          </View>
        </Row>
      ) : null}
    </Card>
  );
}

/* ---------- history ---------- */

export function TradeRow({ trade, onPress }: { trade: Trade; onPress: () => void }) {
  const o = outcome(trade);
  const closed = trade.taken && !!trade.result;
  const hasR = closed && trade.r !== undefined;
  const isOpen = trade.taken && !trade.result;
  const label = [
    clock(trade.ts),
    o.label,
    hasR ? fmtR(trade.r ?? 0) : null,
    trade.emotions.join(', ') || null,
    trade.overridden ? 'Override' : null,
    trade.followedRules === false ? 'Broke rules' : null,
    !trade.taken ? `Gate said ${trade.verdict}` : null,
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
      <ToneBadge icon={outcomeIcon(trade)} tone={o.tone} size={42} />
      <View style={{ flex: 1, gap: 6 }}>
        <Row gap={S.sm} style={{ alignItems: 'baseline' }}>
          <Body style={{ fontFamily: F.bold }}>{clock(trade.ts)}</Body>
          <Small color={toneFg(o.tone)} style={{ fontFamily: F.semi }}>
            {o.label}
          </Small>
        </Row>
        <View style={[styles.wrap, { gap: 6 }]}>
          {trade.emotions.map((e) => (
            <MiniPill key={e} label={e} tone={emotionTone(e)} />
          ))}
          {trade.overridden ? <MiniPill label="Override" tone="coral" icon={OctagonX} flag /> : null}
          {trade.followedRules === false ? <MiniPill label="Broke rules" tone="coral" icon={ShieldAlert} flag /> : null}
          {!trade.taken ? (
            <MiniPill
              label={`Gate said ${trade.verdict}`}
              tone={VERDICT[trade.verdict].tone}
              icon={VERDICT_ICON[trade.verdict]}
              flag
            />
          ) : null}
        </View>
      </View>
      {hasR ? (
        <Display size={19} color={rColor(trade.r ?? 0)}>
          {fmtR(trade.r ?? 0)}
        </Display>
      ) : isOpen ? (
        <Row gap={2}>
          <Small color={C.tangerine} style={{ fontFamily: F.bold }}>
            Log result
          </Small>
          <Icon icon={ChevronRight} size={16} color={C.tangerine} />
        </Row>
      ) : null}
    </Pressable>
  );
}

export function DayCard({ group, onOpen }: { group: DayGroup; onOpen: (id: string) => void }) {
  const openCount = group.trades.filter((t) => t.taken && !t.result).length;
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={S.sm} style={{ alignItems: 'baseline', flex: 1 }}>
          <Display size={17} weight="bold">
            {dayLabel(group.ts)}
          </Display>
          <Small>{count(group.trades.length, 'entry', 'entries')}</Small>
        </Row>
        {group.closed ? (
          <Pill label={fmtR(group.netR)} tone={rTone(group.netR)} />
        ) : openCount ? (
          <Pill label={`${openCount} open`} tone="tangerine" />
        ) : null}
      </Row>
      <Divider />
      <View style={{ gap: S.md }}>
        {group.trades.map((t) => (
          <TradeRow key={t.id} trade={t} onPress={() => onOpen(t.id)} />
        ))}
      </View>
    </Card>
  );
}

/* ---------- trade recap (result modal) ---------- */

export function TradeRecap({ trade }: { trade: Trade }) {
  const o = outcome(trade);
  const v = VERDICT[trade.verdict];
  return (
    <Card style={{ gap: S.lg }}>
      <Row gap={S.md}>
        <ToneBadge icon={outcomeIcon(trade)} tone={o.tone} size={48} />
        <View style={{ flex: 1, gap: 1 }}>
          <Display size={24}>{clock(trade.ts)}</Display>
          <Small numberOfLines={1}>{whenLabel(trade.ts)}</Small>
        </View>
        <Pill icon={VERDICT_ICON[trade.verdict]} label={`Gate said ${v.word.toLowerCase()}`} tone={v.tone} />
      </Row>
      {trade.overridden ? (
        <View style={[styles.flagLine, { backgroundColor: alpha(C.coral, 0.12) }]}>
          <Icon icon={OctagonX} size={16} color={C.coral} />
          <Small color={C.coral} style={{ fontFamily: F.semi, flex: 1 }}>
            You took it through a stop.
          </Small>
        </View>
      ) : null}
      <Divider />
      <View style={{ gap: S.sm }}>
        <Small color={C.faint}>You felt</Small>
        <EmotionPills emotions={trade.emotions} />
      </View>
      <View style={{ gap: 4 }}>
        <Small color={C.faint}>Plan</Small>
        {trade.plan ? <Body>{trade.plan}</Body> : <Sub color={C.faint}>No plan written</Sub>}
      </View>
    </Card>
  );
}

/* ---------- empty journal ---------- */

export function StepRow({ n, icon, title, detail }: { n: number; icon: LucideIcon; title: string; detail: string }) {
  return (
    <View style={styles.stepRow} accessible accessibilityLabel={`Step ${n}: ${title}. ${detail}`}>
      <IconBadge icon={icon} size={40} />
      <View style={{ flex: 1, gap: 1 }}>
        <Sub color={C.mist} style={{ fontFamily: F.bold }}>
          {title}
        </Sub>
        <Small>{detail}</Small>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: Radius.pill,
  },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniText: { fontFamily: F.semi, fontSize: 12, lineHeight: 16 },
  toneCard: { borderRadius: Radius.surface, borderWidth: 1, padding: S.lg, gap: S.md },
  ruleCard: { flex: 1, gap: S.sm },
  barBox: { height: 16, justifyContent: 'center' },
  track: { flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  half: { flex: 1, height: '100%', flexDirection: 'row' },
  fill: { height: '100%', borderRadius: 4 },
  zero: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: 'rgba(242,245,251,0.35)',
  },
  rateTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginVertical: 2 },
  rateFill: { height: '100%', borderRadius: 3 },
  tradeRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 48 },
  flagLine: { flexDirection: 'row', alignItems: 'center', gap: S.sm, borderRadius: 12, paddingHorizontal: S.md, paddingVertical: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
