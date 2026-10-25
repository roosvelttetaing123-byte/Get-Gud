import { Check, Waves, Wind } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { C, R, S, tint } from '@/constants/theme';
import { timeAgo } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import type { Urge } from '@/lib/store';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Empty,
  IconWell,
  Medal,
  Num,
  ProgressRing,
  Row,
  Screen,
  Section,
  Txt,
  isLight,
  useSpringValue,
} from '@/ui';

import { NATIVE } from './hooks';
import { IntensityReadout, IntensitySlider } from './IntensitySlider';
import { kindMeta } from './kinds';
import { SURFER_AT, URGE_KINDS, urgeRecord } from './model';
import { useNow } from '@/lib/useNow';

const SURFER_MEDAL = require('@/assets/3d/medal-urge-surfer.webp');

export function PickView({
  kind,
  before,
  minutes,
  minuteOptions,
  urges,
  onKind,
  onBefore,
  onMinutes,
  onStart,
}: {
  kind?: string;
  before?: number;
  minutes: number;
  minuteOptions: number[];
  urges: Urge[];
  onKind: (k: string) => void;
  onBefore: (n: number) => void;
  onMinutes: (m: number) => void;
  onStart: () => void;
}) {
  const ready = kind !== undefined && before !== undefined;
  const hint =
    kind === undefined ? "Pick what's pulling at you" : before === undefined ? 'Rate how strong it is' : 'Breathe with it until it passes';
  const rows: string[][] = [];
  for (let i = 0; i < URGE_KINDS.length; i += 2) rows.push(URGE_KINDS.slice(i, i + 2));

  return (
    <Screen backdrop="urge" title="Urge" caption="Something's pulling at you">
      <Section title="What's the urge?">
        <View accessibilityRole="radiogroup" style={{ gap: S.md }}>
          {rows.map((pair) => (
            <View key={pair[0]} style={styles.row}>
              {pair.map((k) => (
                <KindCard key={k} kind={k} selected={kind === k} onPress={() => onKind(k)} />
              ))}
            </View>
          ))}
        </View>
      </Section>

      <Section title="How strong is it?">
        <Card padding={S.xl}>
          <Row gap={S.xxl} style={{ justifyContent: 'center' }}>
            <IntensitySlider value={before} onChange={onBefore} label="How strong is it?" />
            <IntensityReadout value={before} />
          </Row>
        </Card>
      </Section>

      <View style={{ gap: S.md }}>
        <Row gap={S.sm} style={{ justifyContent: 'center' }}>
          {minuteOptions.map((m) => (
            <Chip key={m} label={`${m} min`} selected={minutes === m} color={C.cyan} onPress={() => onMinutes(m)} />
          ))}
        </Row>
        <Button title="Breathe" icon={Wind} color={C.cyan} disabled={!ready} onPress={onStart} />
        <Txt v="footnote" color={C.label2} align="center">
          {hint}
        </Txt>
      </View>

      <Record urges={urges} />
    </Screen>
  );
}

/* ---------- kind card ---------- */

function KindCard({ kind, selected, onPress }: { kind: string; selected: boolean; onPress: () => void }) {
  const m = kindMeta(kind);
  const [press] = useState(() => new Animated.Value(1));
  const on = useSpringValue(selected ? 1 : 0, 'bouncy');
  const spring = (to: number, bounciness = 0, speed = 40) =>
    Animated.spring(press, { toValue: to, bounciness, speed, useNativeDriver: NATIVE }).start();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={kind}
      accessibilityHint={m.hint}
      onPressIn={() => spring(0.95)}
      onPressOut={() => spring(1, selected ? 6 : 14, 14)}
      onPress={() => {
        haptic.tap();
        if (!selected) {
          // a little pop on select: dip, then overshoot back to size
          press.setValue(0.92);
          spring(1, 16, 12);
        }
        onPress();
      }}
      style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.kind,
          {
            borderColor: selected ? m.color : 'transparent',
            backgroundColor: selected ? tint(m.color, 0.16) : C.card,
            transform: [{ scale: press }],
          },
        ]}>
        <IconWell icon={m.icon} color={m.color} size={48} />
        <View style={{ gap: 1, marginTop: 'auto' }}>
          <Txt v="headline" numberOfLines={2}>
            {kind}
          </Txt>
          <Txt v="footnote" color={selected ? C.label : C.label2} numberOfLines={1}>
            {m.hint}
          </Txt>
        </View>
        <View
          style={[
            styles.check,
            { backgroundColor: m.color, opacity: Math.min(1, Math.max(0, on * 2)), transform: [{ scale: Math.max(0, on) }] },
          ]}>
          <Check size={15} color={isLight(m.color) ? '#000000' : '#FFFFFF'} strokeWidth={3.4} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ---------- record ---------- */

function Record({ urges }: { urges: Urge[] }) {
  const [now] = useNow(60_000);
  const r = urgeRecord(urges);

  if (!r.total) {
    return (
      <Section title="Your record">
        <Empty
          icon={Waves}
          color={C.cyan}
          title="No urges logged yet"
          message="When one hits, start here. It will pass."
        />
      </Section>
    );
  }

  const pct = Math.round(r.rate * 100);
  return (
    <Section title="Your record">
      <Card padding={S.lg}>
        <Row gap={S.lg} align="center">
          <View style={{ flex: 1, gap: 2 }}>
            <Row gap={S.sm} align="center">
              <Num size={56} color={C.cyan}>
                {r.resisted}
              </Num>
              {r.resisted >= SURFER_AT ? <Medal image={SURFER_MEDAL} size={48} label="Urge surfer medal" /> : null}
            </Row>
            <Txt v="headline">Ridden out</Txt>
            <Txt v="subhead" color={C.label2}>
              {`of ${r.total} ${r.total === 1 ? 'urge' : 'urges'}`}
            </Txt>
          </View>
          <View style={{ alignItems: 'center', gap: S.xs }}>
            <ProgressRing value={r.rate} size={92} stroke={11} from={C.cyan} to={C.mint} track={tint(C.cyan, 0.16)}>
              <Num size={22} weight="700">{`${pct}%`}</Num>
            </ProgressRing>
            <Txt v="caption1" color={C.label2}>
              Resist rate
            </Txt>
          </View>
        </Row>
        <Divider />
        <View style={{ gap: S.md }}>
          {r.recent.map((u) => (
            <RecentRow key={u.id} urge={u} now={now} />
          ))}
        </View>
      </Card>
    </Section>
  );
}

function RecentRow({ urge: u, now }: { urge: Urge; now: number }) {
  const m = kindMeta(u.kind);
  const won = u.outcome === 'resisted';
  const detail = u.after !== undefined ? `${u.before} to ${u.after}` : `Started at ${u.before}`;
  return (
    <Row gap={S.md}>
      <IconWell icon={m.icon} color={m.color} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="subhead" weight="600" numberOfLines={1}>
          {u.kind}
        </Txt>
        <Txt v="footnote" color={C.label2} numberOfLines={1}>
          {`${timeAgo(u.ts, now)} · ${detail}`}
        </Txt>
      </View>
      <View>
        <Badge label={won ? 'Rode it out' : 'Gave in'} color={won ? C.green : C.gray} />
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.md },
  kind: {
    flex: 1,
    minHeight: 132,
    padding: 14,
    gap: S.md,
    borderRadius: R.card - 4,
    borderWidth: 2,
  },
  check: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
