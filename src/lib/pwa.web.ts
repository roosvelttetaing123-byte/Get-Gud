/**
 * Installable web app plumbing (web only; pwa.ts is the native no-op).
 *
 * - Registers /Get-Gud/sw.js in production builds (offline + instant launch).
 *   In development it unregisters any worker left over from a production test so dev
 *   bundles are never cached.
 * - Asks for persistent storage so iOS doesn't evict the journal.
 * - Reports "update available" when a newer build is installed and waiting while the page
 *   still runs an older one. HTML is network-first, so most deploys simply appear on the
 *   next launch; the hook covers the app resuming from the background after a deploy.
 */
import { useSyncExternalStore } from 'react';

const BASE = (process.env.EXPO_BASE_URL || '/Get-Gud').replace(/\/+$/, '');
const SCOPE = `${BASE}/`;
const SW_URL = `${BASE}/sw.js`;
const UPDATE_CHECK_MS = 60_000;

let started = false;
let updateReady = false;
let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** True when launched from the home screen (standalone display mode). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

/** Build id of the running page (injected into index.html at build time), or null in dev. */
export function currentBuild(): string | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('meta[name="gg-build"]')?.getAttribute('content') ?? null;
}

function askBuild(worker: ServiceWorker): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 3000);
    channel.port1.onmessage = (e: MessageEvent<{ build?: string }>) => {
      clearTimeout(timer);
      resolve(e.data?.build ?? null);
    };
    worker.postMessage({ type: 'GET_BUILD' }, [channel.port2]);
  });
}

async function onWaiting(worker: ServiceWorker) {
  // First install: there is no older worker to replace.
  if (!navigator.serviceWorker.controller) return;
  const [mine, theirs] = [currentBuild(), await askBuild(worker)];
  if (mine && theirs && mine === theirs) {
    // The page already runs this build (it came network-first); hand over quietly.
    worker.postMessage({ type: 'SKIP_WAITING' });
    return;
  }
  waitingWorker = worker;
  if (!updateReady) {
    updateReady = true;
    emit();
  }
}

function requestPersistentStorage() {
  const storage = navigator.storage;
  if (!storage?.persist) return;
  (storage.persisted ? storage.persisted() : Promise.resolve(false))
    .then((already) => already || storage.persist())
    .catch(() => {});
}

function cleanUpDevWorkers() {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.filter((r) => new URL(r.scope).pathname.startsWith(SCOPE)).forEach((r) => r.unregister()))
    .catch(() => {});
}

function register() {
  navigator.serviceWorker
    .register(SW_URL, { scope: SCOPE })
    .then((reg) => {
      if (reg.waiting) void onWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && reg.waiting) void onWaiting(reg.waiting);
        });
      });
      // iOS resumes home-screen apps instead of relaunching them: look for a new deploy
      // whenever the app comes back to the foreground.
      let lastCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_MS) return;
        lastCheck = Date.now();
        reg.update().catch(() => {});
      });
    })
    .catch(() => {
      // unsupported or blocked (private mode): the app still works online
    });
}

/** Call once at startup (root layout). Safe to call more than once. */
export function initPwa(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  requestPersistentStorage();
  if (!('serviceWorker' in navigator)) return;
  if (__DEV__) {
    cleanUpDevWorkers();
    return;
  }
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Subscribe to "a newer version is ready". Returns an unsubscribe function. */
export function onUpdateAvailable(cb: () => void): () => void {
  listeners.add(cb);
  if (updateReady) cb();
  return () => {
    listeners.delete(cb);
  };
}

/** React hook: true once a newer version is installed and waiting. */
export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => updateReady,
    () => false,
  );
}

/** Activate the waiting version and reload into it (e.g. from an "Update" button). */
export function applyUpdate(): void {
  const worker = waitingWorker;
  if (!worker || !('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }
  let done = false;
  const reload = () => {
    if (done) return;
    done = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  worker.postMessage({ type: 'SKIP_WAITING' });
  setTimeout(reload, 3000);
}
