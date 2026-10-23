/**
 * Installable web app plumbing. Native no-op; the real implementation is pwa.web.ts.
 * Keep the exports identical in both files.
 */

/** Call once at startup (root layout). No-op on iOS/Android. */
export function initPwa(): void {}

/** True when launched from the home screen. Always false on native. */
export function isStandalone(): boolean {
  return false;
}

/** Build id of the running web page. Null on native. */
export function currentBuild(): string | null {
  return null;
}

/** Subscribe to "a newer version is ready". Never fires on native. */
export function onUpdateAvailable(_cb: () => void): () => void {
  return () => {};
}

/** React hook: true once a newer web version is waiting. Always false on native. */
export function useUpdateAvailable(): boolean {
  return false;
}

/** Activate the waiting web version and reload. No-op on native. */
export function applyUpdate(): void {}
