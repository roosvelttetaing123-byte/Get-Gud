/**
 * Icons and colours for journal entities: feelings, outcomes and gate verdicts.
 * Every colour is an iOS system colour from the theme.
 */
import {
  Activity,
  Angry,
  Annoyed,
  BadgeCheck,
  BatteryLow,
  Brain,
  Clock,
  CloudRain,
  Coins,
  Crosshair,
  DoorOpen,
  Frown,
  HeartCrack,
  Hourglass,
  Leaf,
  Meh,
  Minus,
  Rocket,
  Sparkles,
  Swords,
  Trophy,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { C } from '@/constants/theme';
import { EMOTIONS } from '@/lib/derive';
import type { Trade, Verdict } from '@/lib/store';

const FEELING: Record<string, { icon: LucideIcon; color: string }> = {
  Calm: { icon: Leaf, color: C.mint },
  Focused: { icon: Crosshair, color: C.blue },
  Confident: { icon: BadgeCheck, color: C.green },
  Bored: { icon: Hourglass, color: C.brown },
  Tired: { icon: BatteryLow, color: C.indigo },
  Anxious: { icon: Activity, color: C.teal },
  Frustrated: { icon: Frown, color: C.orange },
  Euphoric: { icon: Sparkles, color: C.yellow },
  FOMO: { icon: Rocket, color: C.pink },
  Revenge: { icon: Swords, color: C.red },
  Desperate: { icon: HeartCrack, color: C.purple },
};

/** Fallback for feelings added later: colour by how the gate treats them. */
function toneColor(label: string) {
  const tone = EMOTIONS.find((e) => e.label === label)?.tone as string | undefined;
  if (tone === 'jade') return C.green;
  if (tone === 'tangerine') return C.orange;
  if (tone === 'coral') return C.red;
  return C.gray;
}

export const feelingLook = (label: string) => FEELING[label] ?? { icon: Brain, color: toneColor(label) };

/** Feelings offered after a trade closes, each with its own icon and colour. */
const AFTER: Record<string, { icon: LucideIcon; color: string }> = {
  Proud: { icon: Trophy, color: C.yellow },
  Calm: { icon: Leaf, color: C.mint },
  Relieved: { icon: Wind, color: C.teal },
  Indifferent: { icon: Meh, color: C.gray },
  Annoyed: { icon: Annoyed, color: C.orange },
  Angry: { icon: Angry, color: C.red },
  Regret: { icon: CloudRain, color: C.indigo },
  Greedy: { icon: Coins, color: C.brown },
  Shaken: { icon: Zap, color: C.purple },
};
export const afterLook = (label: string) => AFTER[label] ?? { icon: Brain, color: C.tint };

export const VERDICT: Record<Verdict, { word: string; color: string }> = {
  clear: { word: 'Clear', color: C.clear },
  wait: { word: 'Wait', color: C.wait },
  stop: { word: 'Stop', color: C.stop },
};

/** Win up (green), loss down (red), break-even flat (grey), open waiting (orange), walked away (mint). */
export function outcomeLook(t: Trade): { icon: LucideIcon; color: string; label: string } {
  if (!t.taken) return { icon: DoorOpen, color: C.mint, label: 'Walked away' };
  if (!t.result) return { icon: Clock, color: C.orange, label: 'Open' };
  if (t.result === 'win') return { icon: TrendingUp, color: C.green, label: 'Win' };
  if (t.result === 'loss') return { icon: TrendingDown, color: C.red, label: 'Loss' };
  return { icon: Minus, color: C.gray, label: 'Break even' };
}
