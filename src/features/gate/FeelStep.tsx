import React from 'react';
import { View } from 'react-native';

import { C, S, toneColor } from '@/constants/theme';
import { EMOTIONS } from '@/lib/derive';
import { Body, Button, Chip, Divider, Hero, Row, Screen, Small, Sub, Surface } from '@/ui';

import { EMOTION_GROUPS } from './logic';

export function FeelStep({
  selected,
  onToggle,
  limitHit,
  onNext,
}: {
  selected: string[];
  onToggle: (label: string) => void;
  limitHit: string | null;
  onNext: () => void;
}) {
  const picked = EMOTIONS.filter((e) => selected.includes(e.label));

  return (
    <Screen>
      <Hero context="Before you touch the chart" title="How do you feel?" />

      {limitHit ? (
        <Surface tone="coral">
          <Body>{limitHit}</Body>
          <Sub>You can still check in. The gate will say stop.</Sub>
        </Surface>
      ) : null}

      <View style={{ gap: S.lg }}>
        {EMOTION_GROUPS.map((g) => (
          <View key={g.tone} style={{ gap: S.sm }}>
            <Small>{g.caption}</Small>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
              {g.items.map((e) => (
                <Chip
                  key={e.label}
                  label={e.label}
                  tone={e.tone}
                  selected={selected.includes(e.label)}
                  onPress={() => onToggle(e.label)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      {picked.length ? (
        <Surface style={{ gap: 0, paddingVertical: S.sm }}>
          {picked.map((e, i) => (
            <View key={e.label}>
              {i > 0 ? <Divider /> : null}
              <Row gap={S.md} style={{ paddingVertical: 10, alignItems: 'baseline' }}>
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: toneColor(e.tone), top: -1 }}
                />
                <Body style={{ fontWeight: '600', minWidth: 92 }}>{e.label}</Body>
                <Sub style={{ flex: 1 }}>{e.hint}</Sub>
              </Row>
            </View>
          ))}
        </Surface>
      ) : (
        <Sub color={C.faint}>Pick everything that’s true right now. More than one is fine.</Sub>
      )}

      <Button label="Next" onPress={onNext} disabled={!selected.length} />
    </Screen>
  );
}
