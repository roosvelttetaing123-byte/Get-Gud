/**
 * Health-style Highlight: one plain-English sentence and one big number.
 */
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { C, FONT, S, TYPE } from '@/constants/theme';
import { Card, IconWell, Num, Row, Txt } from '@/ui';

import { Dots } from './bits';
import { type Highlight, WARMUP } from './insight';

export function HighlightCard({ highlight, closed }: { highlight: Highlight | null; closed: number }) {
  if (!highlight) return <Warmup closed={closed} />;
  const h = highlight;
  const spoken = h.sentence.map((s) => s.text).join('');
  return (
    <Card padding={S.xl} style={{ gap: S.lg }}>
      <Row gap={10}>
        <IconWell icon={h.icon} color={h.color} size={32} />
        <Txt v="subhead" weight="600" color={h.color} style={{ flex: 1 }}>
          {h.category}
        </Txt>
        <Txt v="footnote" color={C.label3}>
          Highlight
        </Txt>
      </Row>
      <View style={{ gap: S.sm }} accessible accessibilityLabel={`${spoken} ${h.value} ${h.unit}`}>
        <Row gap={6} align="baseline" style={{ flexWrap: 'wrap' }}>
          <Num size={48} weight="700" color={h.valueColor} style={{ letterSpacing: -0.5 }}>
            {h.value}
          </Num>
          <Txt v="subhead" weight="600" color={C.label2}>
            {h.unit}
          </Txt>
        </Row>
        <Text
          style={{
            fontFamily: FONT.system,
            fontSize: TYPE.title3.size,
            lineHeight: TYPE.title3.line + 1,
            fontWeight: '600',
            color: C.label,
          }}>
          {h.sentence.map((s, i) =>
            s.color ? (
              <Text key={i} style={{ color: s.color, fontWeight: '700' }}>
                {s.text}
              </Text>
            ) : (
              <React.Fragment key={i}>{s.text}</React.Fragment>
            ),
          )}
        </Text>
      </View>
    </Card>
  );
}

function Warmup({ closed }: { closed: number }) {
  const left = Math.max(0, WARMUP - closed);
  return (
    <Card padding={S.xl} style={{ gap: S.lg }}>
      <Row gap={10}>
        <IconWell icon={Sparkles} color={C.tint} size={32} />
        <Txt v="subhead" weight="600" color={C.tint} style={{ flex: 1 }}>
          Highlights
        </Txt>
      </Row>
      <View style={{ gap: 6 }}>
        <Txt v="title3" weight="700">
          Patterns appear after a few trades
        </Txt>
        <Txt v="subhead" color={C.label2}>
          {left === 1 ? 'Log 1 more result to see them.' : `Log ${left} more results to see them.`}
        </Txt>
      </View>
      <Dots done={Math.min(closed, WARMUP)} total={WARMUP} />
    </Card>
  );
}
