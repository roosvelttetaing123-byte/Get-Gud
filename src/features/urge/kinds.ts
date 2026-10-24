/** Each urge kind's icon, system colour and a 2-4 word hint. */
import {
  CircleHelp,
  Dumbbell,
  HandCoins,
  MoonStar,
  MoveVertical,
  Repeat,
  Smartphone,
  Swords,
  type LucideIcon,
} from 'lucide-react-native';

import { C } from '@/constants/theme';

export interface KindMeta {
  icon: LucideIcon;
  color: string;
  hint: string;
}

const KIND_META: Record<string, KindMeta> = {
  'Revenge trade': { icon: Swords, color: C.red, hint: 'Win it back' },
  Overtrade: { icon: Repeat, color: C.orange, hint: 'Just one more' },
  'Move my stop': { icon: MoveVertical, color: C.yellow, hint: 'Give it room' },
  'Take profit early': { icon: HandCoins, color: C.mint, hint: 'Lock it in now' },
  Doomscroll: { icon: Smartphone, color: C.indigo, hint: 'Phone in hand' },
  'Skip the gym': { icon: Dumbbell, color: C.green, hint: 'Not today' },
  'Stay up late': { icon: MoonStar, color: C.purple, hint: 'One more episode' },
  Other: { icon: CircleHelp, color: C.gray, hint: 'Something else' },
};

export const kindMeta = (kind: string): KindMeta => KIND_META[kind] ?? KIND_META.Other;
