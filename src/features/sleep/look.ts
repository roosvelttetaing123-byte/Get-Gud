import { CloudSun, Coffee, Moon, MoonStar, Sun, Sunrise, Sunset, Utensils, Smartphone, BedDouble, type LucideIcon } from 'lucide-react-native';

import { C, SYS } from '@/constants/theme';
import type { Debt, HabitId, PhaseId } from '@/lib/sleep';

export const SLEEP_TINT = SYS.indigo;

export const PHASE_LOOK: Record<PhaseId, { color: string; icon: LucideIcon }> = {
  groggy: { color: SYS.gray, icon: Sunrise },
  peak1: { color: SYS.yellow, icon: Sun },
  dip: { color: SYS.cyan, icon: CloudSun },
  peak2: { color: SYS.orange, icon: Sunset },
  winddown: { color: SYS.indigo, icon: Moon },
  melatonin: { color: '#B57BFF', icon: MoonStar },
  sleep: { color: SYS.gray2, icon: BedDouble },
};

export const HABIT_LOOK: Record<HabitId, { color: string; icon: LucideIcon }> = {
  light: { color: SYS.yellow, icon: Sun },
  caffeine: { color: SYS.brown, icon: Coffee },
  meal: { color: SYS.orange, icon: Utensils },
  screens: { color: SYS.indigo, icon: Smartphone },
  bed: { color: '#B57BFF', icon: BedDouble },
};

/** Debt zones. High debt is orange, never red: it's a fact, not a failure. */
export const DEBT_LOOK: Record<Debt['zone'], { color: string; label: string }> = {
  low: { color: SYS.green, label: 'Low' },
  moderate: { color: SYS.yellow, label: 'Moderate' },
  high: { color: SYS.orange, label: 'High' },
};

export const NIGHT_BG = '#05060F';
export const DIM = C.label2;
