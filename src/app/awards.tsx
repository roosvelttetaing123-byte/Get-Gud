/**
 * Medals: Apple Fitness Awards. The latest medal is the hero, live in 3D (drag to spin it), then the
 * streak strip, then every medal in a 3-column grid. Tap any medal to open it full screen.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { S } from '@/constants/theme';
import { HeroMedal, MedalSection, StreakStrip } from '@/features/awards/parts';
import { MedalViewer } from '@/features/awards/Viewer';
import { SECTIONS, latestEarned, medalViews, nextUp, streakInfo } from '@/features/awards/model';
import { useStore } from '@/lib/store';
import { useNow } from '@/lib/useNow';
import { Button, Screen, Section } from '@/ui';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function MedalsScreen() {
  const state = useStore();
  const [nowMs] = useNow(60_000);
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const views = useMemo(() => medalViews(state), [state]);
  const info = useMemo(() => streakInfo(state, views, now), [state, views, now]);
  const hero = latestEarned(views) ?? nextUp(views);
  const earnedCount = views.filter((v) => v.earned).length;

  const [openId, setOpenId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const open = (id: string) => {
    setOpenId(id);
    setVisible(true);
  };
  const selected = views.find((v) => v.award.id === openId);
  const section = SECTIONS.find((s) => openId && s.ids.includes(openId))?.title;

  return (
    <>
      <Screen
        modal
        backdrop="awards"
        title="Medals"
        caption={`${earnedCount} of ${views.length} earned`}
        accessory={<Button title="Done" kind="gray" size="small" full={false} onPress={close} />}>
        {hero ? <HeroMedal key={hero.award.id} view={hero} now={now} /> : null}

        <Section title="Your streak">
          <StreakStrip info={info} />
        </Section>

        <View style={{ gap: S.section + 4 }}>
          {SECTIONS.map((s) => (
            <MedalSection
              key={s.title}
              title={s.title}
              views={s.ids.map((id) => views.find((v) => v.award.id === id)).filter((v) => !!v)}
              now={now}
              onOpen={open}
            />
          ))}
        </View>
      </Screen>
      <MedalViewer view={selected} section={section} visible={visible} now={now} onClose={() => setVisible(false)} />
    </>
  );
}
