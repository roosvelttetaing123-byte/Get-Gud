/*
 * Get Gud service worker: offline support and instant launch for the home-screen app.
 *
 * This file is a template. scripts/postbuild-web.mjs fills in BUILD_ID and PRECACHE in
 * dist/sw.js after `expo export`, so every deploy gets its own cache.
 *
 *   navigations (HTML)           network-first (3 s), cached shell as fallback
 *   _expo/static/**, assets/**   cache-first (file names are content-hashed)
 *   other files in scope         stale-while-revalidate (manifest, icons)
 *
 * A new version waits until the app is closed, or until the page sends SKIP_WAITING
 * (applyUpdate() in src/lib/pwa.web.ts), so a running page never loses its lazy chunks.
 */
const BUILD_ID = '__BUILD_ID__';
const PRECACHE = /*__PRECACHE__*/ [];

const PREFIX = 'getgud-';
const CACHE = PREFIX + BUILD_ID;
const SCOPE = self.registration.scope; // e.g. https://host/Get-Gud/
const SHELL = new URL('./', SCOPE).href; // index.html (the app is a single-page shell)
const IMMUTABLE = [new URL('_expo/static/', SCOPE).href, new URL('assets/', SCOPE).href];
const NAV_TIMEOUT_MS = 3000;

const isImmutable = (url) => IMMUTABLE.some((p) => url.startsWith(p));

async function pool(items, size, fn) {
  const queue = items.slice();
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const keys = (await caches.keys()).filter((k) => k.startsWith(PREFIX) && k !== CACHE);
      const previous = await Promise.all(keys.map((k) => caches.open(k)));
      await pool(PRECACHE, 6, async (path) => {
        const url = new URL(path, SCOPE).href;
        if (isImmutable(url)) {
          // Hashed files never change: reuse them from the previous version's cache.
          for (const old of previous) {
            const hit = await old.match(url);
            if (hit) return cache.put(url, hit);
          }
        }
        const res = await fetch(url, { cache: isImmutable(url) ? 'default' : 'no-cache', credentials: 'same-origin' });
        if (!res.ok) throw new Error(`precache ${url}: HTTP ${res.status}`);
        await cache.put(url, unredirect(res));
      });
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'GET_BUILD') {
    const reply = { type: 'BUILD', build: BUILD_ID };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source) event.source.postMessage(reply);
  }
});

/** App routes (no file extension, or .html) all get the single-page shell. */
function isAppNavigation(request, url) {
  if (request.mode !== 'navigate' || !url.href.startsWith(SCOPE)) return false;
  const last = url.pathname.split('/').pop() || '';
  return !last.includes('.') || last.endsWith('.html');
}

/** Navigations must not be answered with a redirected response; rebuild it plainly. */
function unredirect(res) {
  if (!res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function navigation(event) {
  const cache = await caches.open(CACHE);
  const network = fetch(SHELL, { cache: 'no-cache', credentials: 'same-origin' }).then(async (raw) => {
    const res = unredirect(raw);
    if (res.ok) await cache.put(SHELL, res.clone());
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  const cached = (await cache.match(SHELL)) || (await caches.match(SHELL));
  if (!cached) return network.catch(() => fetch(event.request));

  // Network-first so a new deploy shows up on the next launch; fall back to the cached
  // shell when offline, on a server error, or when the network is slower than 3 s.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    return res && res.ok ? res : cached;
  } catch {
    return cached;
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request.url);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request.url, copy)).catch(() => {});
  }
  return res;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const hit = await caches.match(request.url);
  const network = fetch(request)
    .then(async (res) => {
      if (res.ok && res.type === 'basic') await cache.put(request.url, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  if (request.headers.has('range')) return; // media range requests: let the network handle them

  if (isAppNavigation(request, url)) return event.respondWith(navigation(event));
  if (request.mode === 'navigate') return; // a direct visit to a file: plain network
  if (url.pathname.endsWith('/sw.js')) return;
  if (isImmutable(url.href)) return event.respondWith(cacheFirst(request));
  return event.respondWith(staleWhileRevalidate(event));
});
