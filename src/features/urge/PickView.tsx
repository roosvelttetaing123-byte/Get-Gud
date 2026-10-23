import { Gauge, ShieldCheck, Tag, Wind } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { C, Pastel, S } from '@/constants/theme';
import { timeAgo } from '@/lib/derive';
import type { Urge } from '@/lib/store';
import { ArtCard, Body, Button, Display, Grid, Hero, IconBadge, Pill, ProgressRing, Row, Screen, Section, Small, Sub, Tile } from '@/ui/legacy';

import { URGE_KINDS, urgeRecord } from './model';
import { IntensityControl, kindMeta, kindTint } from './visuals';

const ON_ART = 'rgba(242,245,251,0.8)';

export function PickView({
  kind,
  before,
  minutes,
  urges,
  onKind,
  onBefore,
  onStart,
}: {
  kind?: string;
  before?: number;
  minutes: number;
  urges: Urge[];
  onKind: (k: string) => void;
  onBefore: (n: number) => void;
  onStart: () => void;
}) {
  const ready = kind !== undefined && before !== undefined;
  const hint = kind === undefined ? 'Pick what it is and how strong it feels.' : 'Now rate how strong it is.';

  return (
    <Screen>
      <Hero context="Something's pulling at you" title="Name the urge." />

      <Grid>
        {URGE_KINDS.map((k) => {
          const m = kindMeta(k);
          return (
            <Tile
              key={k}
              title={k}
              subtitle={m.hint}
              icon={m.icon}
              pastel={m.pastel}
              selected={kind === k}
              accessibilityRole="radio"
              onPress={() => onKind(k)}
            />
          );
        })}
      </Grid>

      <IntensityControl title="How strong is it?" value={before} onChange={onBefore} />

      <View style={{ gap: S.md }}>
        <Button
          kind="accent"
          icon={Wind}
          label={`Ride it out for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}
          disabled={!ready}
          onPress={onStart}
        />
        {!ready ? (
          <Small color={C.faint} style={styles.center}>
            {hint}
          </Small>
        ) : (
          <Small color={C.faint} style={styles.center}>
            Paced breathing until it passes. You can stop any time.
          </Small>
        )}
      </View>

      <Record urges={urges} minutes={minutes} />
    </Screen>
  );
}

function Record({ urges, minutes }: { urges: Urge[]; minutes: number }) {
  const r = urgeRecord(urges);

  if (!r.total) {
    return (
      <Section title="Your record">
        <ArtCard art="calm">
          <Display size={23}>Urges peak and fade, usually within 20 minutes.</Display>
          <Sub color={ON_ART}>Next time one hits, start here. Three taps and you&apos;re breathing.</Sub>
          <View style={styles.steps}>
            <Step icon={Tag} text="Name what's pulling at you" />
            <Step icon={Gauge} text="Rate how strong it is" />
            <Step icon={Wind} text={`Breathe with it for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`} />
          </View>
        </ArtCard>
      </Section>
    );
  }

  const pct = Math.round(r.rate * 100);
  return (
    <Section title="Your record" aside={`${r.total} logged`}>
      <ArtCard
        art="calm"
        footer={
          <View style={styles.rows}>
            {r.recent.map((u) => (
              <RecentRow key={u.id} urge={u} />
            ))}
          </View>
        }>
        <Row gap={S.lg} style={{ alignItems: 'center' }}>
          <View style={styles.glass}>
            <Row gap={S.sm}>
              <ShieldCheck size={16} color={C.jade} strokeWidth={2.4} />
              <Small color={ON_ART}>Ridden out</Small>
            </Row>
            <Display size={52} color={C.jade} style={styles.tab}>
              {String(r.resisted)}
            </Display>
            <Small color={ON_ART}>{`of ${r.total} ${r.total === 1 ? 'urge' : 'urges'}`}</Small>
          </View>
          <View style={styles.ringCol}>
            <ProgressRing value={r.rate} size={104} stroke={9} colors={[C.jade, Pastel.mint[1]]} track="rgba(10,16,32,0.35)">
              <Display size={24}>{`${pct}%`}</Display>
            </ProgressRing>
            <Small color={ON_ART}>Resist rate</Small>
          </View>
        </Row>
      </ArtCard>
    </Section>
  );
}

function Step({ icon, text }: { icon: typeof Wind; text: string }) {
  return (
    <Row gap={S.md}>
      <IconBadge icon={icon} size={36} color={C.mist} bg="rgba(10,16,32,0.35)" />
      <Body style={{ flex: 1 }}>{text}</Body>
    </Row>
  );
}

function RecentRow({ urge: u }: { urge: Urge }) {
  const won = u.outcome === 'resisted';
  const detail = u.after !== undefined ? `${u.before} to ${u.after}` : `Started at ${u.before}`;
  return (
    <Row gap={S.md}>
      <IconBadge icon={kindMeta(u.kind).icon} size={38} color={kindTint(u.kind)} bg="rgba(255,255,255,0.08)" />
      <View style={{ flex: 1, gap: 1 }}>
        <Body numberOfLines={1} style={styles.rowTitle}>
          {u.kind}
        </Body>
        <Small numberOfLines={1}>{`${timeAgo(u.ts)} · ${detail}`}</Small>
      </View>
      <View>
        <Pill label={won ? 'Rode it out' : 'Gave in'} tone={won ? 'jade' : 'coral'} />
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  steps: { gap: S.md, marginTop: S.xs },
  rows: { flex: 1, gap: S.lg },
  rowTitle: { fontSize: 15 },
  glass: {
    flex: 1,
    gap: 2,
    padding: S.lg,
    borderRadius: 20,
    backgroundColor: 'rgba(10,16,32,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ringCol: { alignItems: 'center', gap: S.sm },
  tab: { fontVariant: ['tabular-nums'], marginTop: 4 },
});
