import {
  BedDouble,
  BookOpen,
  Briefcase,
  Droplets,
  Dumbbell,
  Footprints,
  Laugh,
  Annoyed,
  Frown,
  Meh,
  Smile,
  Moon,
  PhoneOff,
  Salad,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, PASTELS, Pastel, S, type PastelName } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { ProgressRing, Small } from '@/ui/legacy';

import { weekdayLetter } from './useToday';

/** Pick an icon for a promise from its words. */
export function promiseIcon(text: string): LucideIcon {
  const t = text.toLowerCase();
  if (/gym|lift|train|workout|push|squat/.test(t)) return Dumbbell;
  if (/walk|run|steps|cardio/.test(t)) return Footprints;
  if (/work|office|job|on time/.test(t)) return Briefcase;
  if (/study|read|learn|course|msc|book/.test(t)) return BookOpen;
  if (/bed|sleep|lights/.test(t)) return BedDouble;
  if (/phone|scroll|screen/.test(t)) return PhoneOff;
  if (/water|drink|hydrat/.test(t)) return Droplets;
  if (/eat|meal|food|protein|breakfast/.test(t)) return Salad;
  if (/wake|morning|sun/.test(t)) return Sun;
  if (/night|evening/.test(t)) return Moon;
  return Target;
}

export const pastelAt = (i: number): PastelName => PASTELS[i % PASTELS.length];

/** Seven small rings, one per day, oldest first. */
export function WeekRings({ days, todayKey }: { days: { key: string; date: Date; ratio: number }[]; todayKey: string }) {
  return (
    <View style={styles.week}>
      {days.map((d) => {
        const today = d.key === todayKey;
        const full = d.ratio >= 1;
        return (
          <View
            key={d.key}
            style={styles.day}
            accessible
            accessibilityLabel={`${d.date.toDateString()}: ${Math.round(d.ratio * 100)} percent kept`}>
            <ProgressRing
              value={d.ratio}
              size={36}
              stroke={4.5}
              colors={full ? [C.jade, '#9BE7C6'] : [C.accent, '#BFAEFF']}>
              {full ? <Text style={{ color: C.jade, fontFamily: F.extra, fontSize: 13 }}>✓</Text> : null}
            </ProgressRing>
            <Small color={today ? C.mist : C.faint} style={today ? { fontFamily: F.bold } : undefined}>
              {weekdayLetter(d.date)}
            </Small>
          </View>
        );
      })}
    </View>
  );
}

const MOODS: { icon: LucideIcon; label: string }[] = [
  { icon: Frown, label: 'Rough' },
  { icon: Annoyed, label: 'Low' },
  { icon: Meh, label: 'Okay' },
  { icon: Smile, label: 'Good' },
  { icon: Laugh, label: 'Great' },
];

/** Five face buttons for mood. */
export function MoodPicker({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.moodRow}>
      {MOODS.map((m, i) => {
        const n = i + 1;
        const on = value === n;
        const I = m.icon;
        const [a] = Pastel[(['rose', 'peach', 'butter', 'mint', 'sky'] as const)[i]];
        return (
          <Pressable
            key={m.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={m.label}
            onPress={() => {
              haptic.tap();
              onChange(n);
            }}
            style={[styles.mood, on && { backgroundColor: a, borderColor: a }]}>
            <I size={24} color={on ? C.onLight : C.haze} strokeWidth={2} />
            <Text style={{ fontFamily: F.semi, fontSize: 11, color: on ? C.onLight : C.faint }}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6 },
  moodRow: { flexDirection: 'row', gap: S.sm },
  mood: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.line,
  },
});
