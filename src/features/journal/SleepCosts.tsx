/**
 * "What tiredness costs": your results by how rested you were when you hit the gate.
 * Rested first, then the tired bands, so the drop reads top to bottom.
 */
import { BedDouble } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { EdgeRow, REST_LOOK } from '@/features/sleep/EdgeRow';
import { SLEEP_TINT } from '@/features/sleep/look';
import { restLine, type SleepEdge } from '@/lib/sleepEdge';
import { Card, Divider, IconSquare, Row, Section, Txt } from '@/ui';

import { fmtRx } from './format';

/** Footer: one plain sentence once there's enough, otherwise what the rows mean. */
function footer(e: SleepEdge): string {
  const line = restLine(e);
  if (line) {
    const t = line.tired.label.toLowerCase();
    const on = line.tired.id === 'short' ? 'After a short night' : `With ${t}`;
    return `Rested, you average ${fmtRx(line.rested.avgR)} a trade. ${on}, ${fmtRx(line.tired.avgR)}.`;
  }
  return 'Average R per trade by how you slept.';
}

export function SleepCosts({ edge }: { edge: SleepEdge }) {
  if (!edge.closed) return null;

  // Trades but no sleep to match them with: one quiet nudge toward the Sleep tab.
  if (!edge.matched) {
    return (
      <Section title="What tiredness costs">
        <Card onPress={() => router.navigate('/sleep')} accessibilityLabel="Log sleep" padding={S.lg}>
          <Row gap={S.md}>
            <IconSquare icon={BedDouble} color={SLEEP_TINT} />
            <View style={{ flex: 1 }}>
              <Txt v="subhead" color={C.label2}>
                Log your sleep and this shows how it moves your results.
              </Txt>
            </View>
          </Row>
        </Card>
      </Section>
    );
  }

  const max = Math.max(...edge.byRest.map((b) => Math.abs(b.avgR)));
  return (
    <Section title="What tiredness costs" footer={footer(edge)}>
      <Card padding={0} style={{ gap: 0 }}>
        {edge.byRest.map((b, i) => (
          <View key={b.id}>
            {i > 0 ? <Divider inset={58} /> : null}
            <EdgeRow bucket={b} max={max} icon={REST_LOOK[b.id].icon} color={REST_LOOK[b.id].color} />
          </View>
        ))}
      </Card>
    </Section>
  );
}
