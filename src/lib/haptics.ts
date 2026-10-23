/**
 * Haptics. iOS/Android: expo-haptics. Web: see haptics.web.ts (silent no-op).
 *
 * Every call is fire-and-forget and never throws, so it is safe in any handler.
 */
import * as Haptics from 'expo-haptics';

const run = (p: () => Promise<void>) => {
  try {
    p().catch(() => {});
  } catch {
    // module unavailable (e.g. Expo Go on an unsupported device): stay silent
  }
};

export const haptic = {
  /** Selection tick: toggles, pickers, segmented controls. */
  tap: (): void => run(() => Haptics.selectionAsync()),
  /** Light impact: button presses. */
  press: (): void => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Heavy impact: committing a big action. */
  heavy: (): void => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: (): void => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: (): void => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: (): void => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type Haptic = typeof haptic;
