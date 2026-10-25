/**
 * "Tilt to look": the medal follows the phone's tilt (DeviceOrientation).
 * iOS asks for permission, and only from a tap, so call requestTilt() straight from the press handler.
 */
type Permission = () => Promise<'granted' | 'denied' | 'default'>;
interface OrientationCtor {
  requestPermission?: Permission;
}

function ctor(): OrientationCtor | undefined {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return undefined;
  return (window as unknown as { DeviceOrientationEvent: OrientationCtor }).DeviceOrientationEvent;
}

/** The API exists. */
export const tiltApi = (): boolean => !!ctor();

/** iOS: tilt needs a permission prompt (shown from a tap). */
export const tiltNeedsPermission = (): boolean => typeof ctor()?.requestPermission === 'function';

/** Ask for motion access. Call it synchronously inside a tap handler. Resolves true when tilt can run. */
export function requestTilt(): Promise<boolean> {
  const D = ctor();
  if (!D) return Promise.resolve(false);
  if (typeof D.requestPermission !== 'function') return Promise.resolve(true);
  try {
    return D.requestPermission().then(
      (r) => r === 'granted',
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

/**
 * Watch for real orientation data (Android and desktop fire events without a prompt; a desktop
 * has the API but no sensor). Calls back once with true when a reading arrives.
 */
export function watchTiltData(onData: () => void): () => void {
  if (!ctor()) return () => {};
  const fn = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    window.removeEventListener('deviceorientation', fn);
    onData();
  };
  window.addEventListener('deviceorientation', fn);
  return () => window.removeEventListener('deviceorientation', fn);
}
