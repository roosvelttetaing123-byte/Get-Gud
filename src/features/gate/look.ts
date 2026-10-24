/**
 * Icons and colours for the gate. Colours come from SYS only.
 */
import {
  Activity,
  Anchor,
  BatteryLow,
  BedDouble,
  Brain,
  ChartCandlestick,
  Clock,
  CloudRain,
  Coins,
  Crosshair,
  Droplets,
  Flame,
  Hand,
  HeartHandshake,
  Hourglass,
  Leaf,
  ListChecks,
  Newspaper,
  OctagonX,
  Percent,
  Rocket,
  ShieldCheck,
  Snail,
  Swords,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { SYS } from '@/constants/theme';
import type { GateCause } from '@/lib/derive';
import type { Verdict } from '@/lib/store';

export const FEELING_ICON: Record<string, LucideIcon> = {
  Calm: Leaf,
  Focused: Crosshair,
  Confident: ShieldCheck,
  Patient: Anchor,
  Bored: Hourglass,
  Impatient: Zap,
  Tired: BatteryLow,
  Anxious: Activity,
  FOMO: TrendingUp,
  Frustrated: Flame,
  Revenge: Swords,
  Euphoric: Rocket,
  Desperate: TriangleAlert,
};

export const feelingIcon = (label: string): LucideIcon => FEELING_ICON[label] ?? Brain;

export const ABOUT_ICON: Record<string, LucideIcon> = {
  'After a loss': TrendingDown,
  'After a win': TrendingUp,
  News: Newspaper,
  Tired: BedDouble,
  Bored: Snail,
  'Personal life': HeartHandshake,
  'Money pressure': Coins,
};

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

/** Icon-square colours for rule rows, cycled like iOS Settings. */
export const RULE_COLORS = [SYS.blue, SYS.orange, SYS.purple, SYS.pink, SYS.teal, SYS.indigo, SYS.green, SYS.yellow];

export const CAUSE_ICON: Record<GateCause, LucideIcon> = {
  limit: OctagonX,
  hot: Flame,
  red: Swords,
  rules: ListChecks,
  cooldown: Timer,
  amber: Activity,
  mood: CloudRain,
  sleep: BedDouble,
  streak: TrendingDown,
  last: ChartCandlestick,
  unnamed: Brain,
  clear: ShieldCheck,
};

export const VERDICT_LOOK: Record<
  Verdict,
  { word: string; colors: readonly [string, string, ...string[]]; icon: LucideIcon; caption: string }
> = {
  clear: { word: 'Clear.', colors: [SYS.green, SYS.mint], icon: ShieldCheck, caption: 'Good to trade' },
  wait: { word: 'Wait.', colors: [SYS.orange, SYS.yellow], icon: Hourglass, caption: 'Not yet' },
  stop: { word: 'Stop.', colors: [SYS.red, SYS.pink], icon: Hand, caption: 'Don’t trade this' },
};
