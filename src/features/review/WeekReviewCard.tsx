/**
 * "Your week": the card that opens the Week in review story. Self-contained, so it can sit on
 * any screen: it shows from Sunday 18:00 through Tuesday, until you've watched that week.
 * The ring around the play button is the story itself, one segment per slide in its colour.
 *
 *   <WeekReviewCard />            uses the clock
 *   <WeekReviewCard now={ts} />   for a pinned time
 */
import { Play } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { C, S } from '@/constants/theme';
import { useNow } from '@/features/journal/bits';
import { latestWeek, reviewDue, slideIds, teaser, weekReview, type WeekReview } from '@/lib/review';
import { useStore } from '@/lib/store';
import { Card, Txt } from '@/ui';

import { STORY_COLORS } from './look';
import { WeekStory } from './WeekStory';

/** The latest week and what happened in it, kept fresh with the store and the clock. */
export function useLatestReview(now: number): { review: WeekReview; slides: number; due: boolean; seen: boolean } {
  const state = useStore();
  const review = useMemo(() => weekReview(state, latestWeek(now), now), [state, now]);
  return {
    review,
    slides: slideIds(state, review).length,
    due: reviewDue(now),
    seen: state.reviewSeen === review.week.key,
  };
}

export function WeekReviewCard({ now: at }: { now?: number }) {
  const tick = useNow();
  const now = at ?? tick;
  const { review, slides, due, seen } = useLatestReview(now);
  const [open, setOpen] = useState(false);
  const show = due && !seen && !review.empty;

  return (
    <>
      {show ? (
        <Card
          padding={S.lg}
          onPress={() => setOpen(true)}
          accessibilityLabel={`Your week in review, ${review.week.label}. ${teaser(review)}. Play`}>
          <View style={styles.row}>
            <StoryRing count={slides} />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt v="footnote" weight="600" color={C.label2}>
                {review.week.label}
              </Txt>
              <Txt v="title3" weight="700">
                Your week in review
              </Txt>
              <Txt v="subhead" color={C.label2} numberOfLines={2}>
                {teaser(review)}
              </Txt>
            </View>
          </View>
        </Card>
      ) : null}
      <WeekStory visible={open} now={now} onClose={() => setOpen(false)} />
    </>
  );
}

const RING = 62;
const STROKE = 3.5;

/** Instagram's "new story" ring, cut into one coloured segment per slide, around a play button. */
export function StoryRing({ count, size = RING }: { count: number; size?: number }) {
  const r = (size - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const gap = count > 1 ? 7 : 0;
  const seg = circ / count - gap;
  const inner = size - 14;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        {Array.from({ length: count }, (_, k) => (
          <Circle
            key={k}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={STORY_COLORS[k % STORY_COLORS.length]}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${seg} ${circ - seg}`}
            strokeDashoffset={-(k * (circ / count) + gap / 2)}
          />
        ))}
      </Svg>
      <View style={[styles.disc, { width: inner, height: inner, borderRadius: inner / 2 }]}>
        <Play size={inner * 0.4} color={C.bg} fill={C.bg} strokeWidth={2} style={{ marginLeft: inner * 0.06 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  disc: { backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
});
