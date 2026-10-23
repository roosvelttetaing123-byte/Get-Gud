/**
 * Icons and pastels for the gate. Pastels follow meaning:
 * good to trade = mint, trade smaller = butter (low energy) or peach (high arousal),
 * don't trade = rose.
 */
import {
  Activity,
  Angry,
  BatteryLow,
  BedDouble,
  CandlestickChart,
  CircleCheck,
  Clock,
  CloudRain,
  Crosshair,
  Droplets,
  Hand,
  Hourglass,
  Leaf,
  ListChecks,
  Newspaper,
  NotebookPen,
  OctagonX,
  Percent,
  Rocket,
  ShieldCheck,
  Swords,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';

import type { PastelName } from '@/constants/theme';
import type { Verdict } from '@/lib/store';

import type { FactKind } from './logic';

export const EMOTION_LOOK: Record<string, { icon: LucideIcon; pastel: PastelName }> = {
  Calm: { icon: Leaf, pastel: 'mint' },
  Focused: { icon: Crosshair, pastel: 'mint' },
  Confident: { icon: ShieldCheck, pastel: 'mint' },
  Bored: { icon: Hourglass, pastel: 'butter' },
  Tired: { icon: BatteryLow, pastel: 'butter' },
  Anxious: { icon: Activity, pastel: 'peach' },
  Frustrated: { icon: Angry, pastel: 'peach' },
  Euphoric: { icon: Rocket, pastel: 'peach' },
  FOMO: { icon: TrendingUp, pastel: 'rose' },
  Revenge: { icon: Swords, pastel: 'rose' },
  Desperate: { icon: TriangleAlert, pastel: 'rose' },
};

export const emotionLook = (label: string) => EMOTION_LOOK[label] ?? { icon: Activity, pastel: 'sky' as PastelName };

/** Pick an icon for a checklist rule from its words. */
export function ruleIcon(rule: string): LucideIcon {
  const t = rule.toLowerCase();
  if (/news|calendar|cpi|nfp|fomc|event/.test(t)) return Newspaper;
  if (/stop/.test(t)) return ShieldCheck;
  if (/risk|%|lot|size/.test(t)) return Percent;
  if (/liquidity|sweep|swept|reclaim/.test(t)) return Droplets;
  if (/zone|setup|plan|supply|demand|level/.test(t)) return Target;
  if (/session|time|hour|london|new york|asia/.test(t)) return Clock;
  if (/trend|structure|bias/.test(t)) return TrendingUp;
  return ListChecks;
}

export const FACT_ICON: Record<FactKind, LucideIcon> = {
  trades: CandlestickChart,
  streak: TrendingDown,
  loss: Timer,
  sleep: BedDouble,
  mood: CloudRain,
  open: NotebookPen,
};

export const VERDICT_ICON: Record<Verdict, LucideIcon> = {
  clear: CircleCheck,
  wait: Hand,
  stop: OctagonX,
};
