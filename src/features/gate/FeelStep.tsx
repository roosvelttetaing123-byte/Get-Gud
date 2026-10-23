import { ListChecks } from 'lucide-react-native';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';

import { S } from '@/constants/theme';
import type { TradingToday } from '@/lib/derive';
import type { Settings } from '@/lib/store';
import { Button, Grid, Screen } from '@/ui/legacy';

import { EmotionTile, emotionTitleSize } from './EmotionTile';

import { EMOTION_GROUPS } from './logic';
import { emotionLook } from './look';
import { GroupHead, PickedCard, SessionCard, StepHeader } from './parts';

const GAP = 10;

export function FeelStep({
  selected,
  onToggle,
  trading,
  settings,
  onNext,
}: {
  selected: string[];
  onToggle: (label: string) => void;
  trading: TradingToday;
  settings: Settings;
  onNext: () => void;
}) {
  const { width } = useWindowDimensions();
  // Screen caps content at 560 wide with 20pt gutters; three columns share two gaps.
  const column = (Math.min(width, 560) - S.gutter * 2 - GAP * 2) / 3;
  const titleSize = emotionTitleSize(column);

  return (
    <Screen>
      <StepHeader context="Before you touch the chart" title="How do you feel?" step={1} />

      <SessionCard trading={trading} settings={settings} />

      <View style={{ gap: S.xl }}>
        {EMOTION_GROUPS.map((g) => (
          <View key={g.tone} style={{ gap: S.md }}>
            <GroupHead title={g.caption} aside={g.aside} tone={g.tone} />
            <Grid columns={3} gap={GAP}>
              {g.items.map((e) => {
                const look = emotionLook(e.label);
                return (
                  <EmotionTile
                    key={e.label}
                    label={e.label}
                    icon={look.icon}
                    pastel={look.pastel}
                    selected={selected.includes(e.label)}
                    titleSize={titleSize}
                    onPress={() => onToggle(e.label)}
                  />
                );
              })}
            </Grid>
          </View>
        ))}
      </View>

      <PickedCard selected={selected} />

      <Button kind="accent" icon={ListChecks} label="Next" onPress={onNext} disabled={!selected.length} />
    </Screen>
  );
}
