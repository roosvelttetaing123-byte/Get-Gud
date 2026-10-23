/**
 * Web haptics: a silent no-op.
 *
 * iOS Safari has no navigator.vibrate, and the "click a hidden <input switch>" trick is
 * blocked on iOS 26.5 and misfires elsewhere, so we don't attempt it. The one genuine
 * source of Taptic feedback on iPhone web is the user tapping a real
 * <input type="checkbox" switch> (see src/ui/NativeSwitch.web.tsx).
 */
const noop = (): void => {};

export const haptic = {
  tap: noop,
  press: noop,
  heavy: noop,
  success: noop,
  warning: noop,
  error: noop,
};

export type Haptic = typeof haptic;
