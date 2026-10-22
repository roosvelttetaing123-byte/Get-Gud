import { StyleSheet, View } from 'react-native';

import { C, S, T } from '@/constants/theme';
import { timeAgo } from '@/lib/derive';
import type { Urge } from '@/lib/store';
import { Body, Button, Chip, Display, Divider, Hero, Row, Scale, Screen, Section, Small, Sub, Surface } from '@/ui';

import { URGE_KINDS, urgeRecord } from './model';

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
  return (
    <Screen>
      <Hero context="Something's pulling at you" title="Name the urge." />

      <View style={styles.chips}>
        {URGE_KINDS.map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => onKind(k)} />
        ))}
      </View>

      <Section title="How strong is it?">
        <Scale value={before} onChange={onBefore} max={10} low="Faint" high="Overwhelming" />
      </Section>

      <Button
        label={`Ride it out for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}
        disabled={!ready}
        onPress={onStart}
      />

      <Record urges={urges} />
    </Screen>
  );
}

function Record({ urges }: { urges: Urge[] }) {
  const r = urgeRecord(urges);
  if (!r.total) {
    return (
      <Section title="Your record">
        <Sub>Urges peak and fade, usually within 20 minutes. Next time one hits, start here.</Sub>
      </Section>
    );
  }
  const now = Date.now();
  return (
    <Section title="Your record">
      <Row gap={S.xl} style={styles.stats}>
        <View style={styles.stat}>
          <Display size={T.hero} color={C.jade}>
            {r.resisted}
          </Display>
          <Small>{r.resisted === 1 ? 'urge ridden out' : 'urges ridden out'}</Small>
        </View>
        <View style={styles.stat}>
          <Display size={T.title}>{`${Math.round(r.rate * 100)}%`}</Display>
          <Small>{`of ${r.total} ${r.total === 1 ? 'urge' : 'urges'}`}</Small>
        </View>
      </Row>

      <Surface>
        {r.recent.map((u, i) => (
          <View key={u.id} style={styles.listItem}>
            {i > 0 ? <Divider /> : null}
            <Row gap={S.md} style={styles.entry}>
              <View style={styles.entryMain}>
                <Body numberOfLines={1}>{u.kind}</Body>
                <Small>{timeAgo(u.ts, now)}</Small>
              </View>
              <View style={styles.entrySide}>
                <Sub color={u.outcome === 'resisted' ? C.jade : C.coral}>
                  {u.outcome === 'resisted' ? 'Rode it out' : 'Gave in'}
                </Sub>
                <Small>{u.after !== undefined ? `${u.before} to ${u.after}` : `Started at ${u.before}`}</Small>
              </View>
            </Row>
          </View>
        ))}
      </Surface>
    </Section>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stats: { alignItems: 'flex-end' },
  stat: { gap: 2 },
  listItem: { gap: S.md },
  entry: { alignItems: 'flex-start' },
  entryMain: { flex: 1, gap: 2 },
  entrySide: { alignItems: 'flex-end', gap: 2 },
});
