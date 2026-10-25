/**
 * How the coach looks: an icon per tip and a colour per life area, shared by the daily card
 * and the "What I've learned" deck.
 */
import {
  BatteryLow,
  BedDouble,
  CalendarDays,
  Coffee,
  DoorOpen,
  HeartPulse,
  ListChecks,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';

import { SYS } from '@/constants/theme';
import type { CoachArea, CoachIcon } from '@/lib/coach';

export const COACH_ICON: Record<CoachIcon, LucideIcon> = {
  moon: MoonStar,
  battery: BatteryLow,
  coffee: Coffee,
  bed: BedDouble,
  shield: ShieldCheck,
  sun: Sun,
  wind: Wind,
  heart: HeartPulse,
  trend: TrendingUp,
  check: ListChecks,
  calendar: CalendarDays,
  door: DoorOpen,
  sparkles: Sparkles,
};

/** One colour per life area, so the list reads at a glance. Never red: these are facts, not verdicts. */
export const AREA_COLOR: Record<CoachArea, string> = {
  sleep: SYS.indigo,
  trading: SYS.green,
  mood: SYS.purple,
  urges: SYS.cyan,
  habits: SYS.orange,
};

export const TIP_COLOR: Partial<Record<CoachIcon, string>> = {
  shield: SYS.green,
  moon: SYS.indigo,
  coffee: SYS.brown,
  sun: SYS.yellow,
  bed: SYS.purple,
};
