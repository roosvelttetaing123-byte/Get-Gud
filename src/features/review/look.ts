/**
 * Week in review colours and icons. Each slide is one bold system colour, full bleed,
 * with black or white type picked for contrast (light colours take black, like iOS buttons).
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
  Sunrise,
  TrendingUp,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';

import { C, SYS } from '@/constants/theme';
import type { CoachIcon } from '@/lib/coach';
import type { SlideId } from '@/lib/review';

export interface SlideLook {
  bg: string;
  fg: string;
  icon: LucideIcon;
}

/** Dark, light, dark, light: neighbouring slides never share a family. */
export const SLIDE_LOOK: Record<SlideId, SlideLook> = {
  rituals: { bg: SYS.purple, fg: C.label, icon: Sunrise },
  promises: { bg: SYS.orange, fg: C.bg, icon: ListChecks },
  trading: { bg: SYS.blue, fg: C.label, icon: ShieldCheck },
  urges: { bg: SYS.cyan, fg: C.bg, icon: Wind },
  sleep: { bg: SYS.indigo, fg: C.label, icon: MoonStar },
  focus: { bg: C.tint, fg: C.bg, icon: Sparkles },
};

/** The order the colours appear in, for previews of the story. */
export const STORY_COLORS = [SYS.purple, SYS.orange, SYS.blue, SYS.cyan, SYS.indigo, C.tint];

/** The coach's icon names, drawn with Lucide (same set as Today's coach card). */
export const FOCUS_ICON: Record<CoachIcon, LucideIcon> = {
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

/** Translucent versions of the slide's type colour, for tracks and wells. */
export const ink = (fg: string, a: number) => (fg === C.bg ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
