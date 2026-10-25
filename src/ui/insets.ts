/**
 * Safe-area insets that are right in the iPhone home-screen app.
 *
 * In a standalone web app iOS sometimes reports env(safe-area-inset-*) as 0 (cold starts in
 * particular), which pushed titles under the status bar and the Dynamic Island. We take the
 * larger of what react-native-safe-area-context reports and the known insets for the iPhone
 * model's screen size. Native builds use the real values untouched.
 */
import { Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/** Portrait screen height (pt) -> top inset, for home-screen web apps on iPhone. */
const TOP_BY_HEIGHT: [number, number][] = [
  [956, 62], // 16 Pro Max
  [932, 59], // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [926, 47], // 12-13 Pro Max, 14 Plus
  [896, 47], // 11, XR, XS Max
  [874, 62], // 16 Pro
  [852, 59], // 14 Pro, 15, 15 Pro, 16
  [844, 47], // 12, 13, 14
  [812, 47], // X, XS, 11 Pro, 12/13 mini
];

function fallback(): { top: number; bottom: number } {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') return { top: 0, bottom: 0 };
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  if (!standalone || !/iPhone/.test(nav.userAgent)) return { top: 0, bottom: 0 };
  const h = Math.max(window.screen.height, window.screen.width);
  const hit = TOP_BY_HEIGHT.find(([sh]) => h >= sh);
  return hit ? { top: hit[1], bottom: 34 } : { top: 20, bottom: 0 };
}

const FALLBACK = fallback();

export function useInsets(): EdgeInsets {
  const i = useSafeAreaInsets();
  return {
    ...i,
    top: Math.max(i.top, FALLBACK.top),
    bottom: Math.max(i.bottom, FALLBACK.bottom),
  };
}
