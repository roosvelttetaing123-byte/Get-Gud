/**
 * Today's coach card: ONE thing. A calm rough-night plan, or the most useful pattern the app has
 * learned about you, or a short "still learning" note. "What I've learned" opens the full list.
 */
import { router } from 'expo-router';
import { MoonStar, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, S, SYS, tint } from '@/constants/theme';
import type { Coach, Insight } from '@/lib/coach';
import { haptic } from '@/lib/haptics';
import { actions } from '@/lib/store';
import { Card, Divider, IconSquare, IconWell, Pressy, ProgressRing, Sheet, Txt } from '@/ui';

import { AREA_COLOR, COACH_ICON, TIP_COLOR } from './coachLook';
import { LearnedDeck } from './LearnedDeck';

export { AREA_COLOR, COACH_ICON } from './coachLook';

function TextButton({ label, onPress, color = C.tint }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: 4 })}>
      <Txt v="subhead" weight="600" color={color}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function CoachCard({ coach, dayKey }: { coach: Coach; dayKey: string }) {
  const [open, setOpen] = useState(false);
  const card = coach.card;
  if (!card) return null;
  const count = coach.learned.length;
  const hide = () => actions.updateDay(dayKey, { coachHidden: true });

  const footer = (
    <View style={styles.footer}>
      {count ? <TextButton label={`What I’ve learned (${count})`} onPress={() => setOpen(true)} /> : <View />}
      <TextButton label="Hide for today" color={C.label2} onPress={hide} />
    </View>
  );

  return (
    <>
      {card.kind === 'rough' ? (
        <Card style={{ gap: S.md, backgroundColor: tint(SYS.indigo, 0.16) }} accessibilityLabel={card.title}>
          <View style={styles.head}>
            <IconWell icon={MoonStar} color={SYS.indigo} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="headline">{card.title}</Txt>
              <Txt v="footnote" color={C.label2}>
                {card.because}
              </Txt>
            </View>
          </View>
          <Txt v="subhead" color={C.label}>
            {card.lead}
          </Txt>
          <View style={styles.tips}>
            {card.tips.map((t, i) => (
              <React.Fragment key={t.text}>
                {i > 0 ? <Divider inset={42} /> : null}
                <View style={styles.tip}>
                  <IconSquare icon={COACH_ICON[t.icon]} color={TIP_COLOR[t.icon] ?? SYS.indigo} size={28} />
                  <Txt v="subhead" style={{ flex: 1 }}>
                    {t.text}
                  </Txt>
                </View>
              </React.Fragment>
            ))}
          </View>
          {footer}
        </Card>
      ) : card.kind === 'insight' ? (
        // Only the body is tappable: the footer holds its own buttons, and a button can't sit inside a button.
        <Card style={{ gap: S.sm }}>
          <Pressy
            accessibilityRole={card.route ? 'button' : undefined}
            accessibilityLabel={`${card.title}. ${card.body}`}
            disabled={!card.route}
            scaleTo={0.98}
            onPress={() => {
              if (!card.route) return;
              haptic.tap();
              router.push(card.route);
            }}
            style={{ gap: S.sm }}>
            <View style={styles.kicker}>
              <Sparkles size={14} color={C.tint} strokeWidth={2.4} />
              <Txt v="footnote" weight="600" color={C.tint}>
                Learned about you
              </Txt>
            </View>
            <View style={styles.head}>
              <IconWell icon={COACH_ICON[card.icon]} color={AREA_COLOR[card.area]} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="headline">{card.title}</Txt>
                <Txt v="subhead" color={C.label2}>
                  {card.body}
                </Txt>
              </View>
            </View>
            <Txt v="caption1" color={C.label3} style={{ paddingLeft: 56 }}>
              {card.evidence}
            </Txt>
          </Pressy>
          {footer}
        </Card>
      ) : (
        <Card style={{ gap: S.sm }}>
          <View style={styles.head}>
            <ProgressRing value={Math.max(0.04, card.progress)} size={44} stroke={5} from={C.tint} to={SYS.orange}>
              <Sparkles size={16} color={C.tint} strokeWidth={2.4} />
            </ProgressRing>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="headline">Learning about you</Txt>
              <Txt v="subhead" color={C.label2}>
                {card.body}
              </Txt>
            </View>
          </View>
        </Card>
      )}

      <LearnedSheet visible={open} onClose={() => setOpen(false)} learned={coach.learned} />
    </>
  );
}

function LearnedSheet({ visible, onClose, learned }: { visible: boolean; onClose: () => void; learned: Insight[] }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="What I’ve learned" detent="medium">
      <Txt v="subhead" color={C.label2}>
        Patterns from your own data, strongest first. Each one shows only once there’s enough to trust. Nothing leaves this
        phone.
      </Txt>
      <LearnedDeck
        items={learned}
        onOpen={(i) => {
          if (!i.route) return;
          haptic.tap();
          onClose();
          router.push(i.route);
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tips: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 16, paddingHorizontal: S.md },
  tip: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
});
