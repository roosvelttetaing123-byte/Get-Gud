/**
 * Icons and colours for journal entities: emotions, outcomes and gate verdicts.
 */
import {
  Activity,
  BadgeCheck,
  BatteryLow,
  Brain,
  Clock,
  Crosshair,
  DoorOpen,
  Frown,
  HeartCrack,
  Hourglass,
  Leaf,
  Minus,
  OctagonX,
  Rocket,
  ShieldCheck,
  Sparkles,
  Swords,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';

import { C, Tint, toneColor, type Tone } from '@/constants/theme';
import type { Trade, Verdict } from '@/lib/store';

const EMOTION_ICON: Record<string, LucideIcon> = {
  Calm: Leaf,
  Focused: Crosshair,
  Confident: BadgeCheck,
  Bored: Hourglass,
  Tired: BatteryLow,
  Anxious: Activity,
  Frustrated: Frown,
  Euphoric: Sparkles,
  FOMO: Rocket,
  Revenge: Swords,
  Desperate: HeartCrack,
};

export const emotionIcon = (label: string): LucideIcon => EMOTION_ICON[label] ?? Brain;

/** Win up, loss down, break-even flat, open waiting, walked away out the door. */
export function outcomeIcon(t: Trade): LucideIcon {
  if (!t.taken) return DoorOpen;
  if (!t.result) return Clock;
  if (t.result === 'win') return TrendingUp;
  if (t.result === 'loss') return TrendingDown;
  return Minus;
}

export const VERDICT_ICON: Record<Verdict, LucideIcon> = {
  clear: ShieldCheck,
  wait: Hourglass,
  stop: OctagonX,
};

/** Foreground and soft background for a tone; neutral sits on the raised navy. */
export const toneFg = (tone: Tone) => (tone === 'neutral' ? C.haze : toneColor(tone));
export const toneBg = (tone: Tone) => (tone === 'neutral' ? C.raised : Tint[tone]);
