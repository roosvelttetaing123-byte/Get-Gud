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
const BUILD_ID = "80fdb0a-20261025-051750";
const PRECACHE = ["./","_expo/static/js/web/[id]-a2960be04b22da9ca1075c0cf02a42be.js","_expo/static/js/web/__common-c0576ddcb7ca1940aa5c018368397b51.js","_expo/static/js/web/__expo-metro-runtime-8c088df87a31e4e6accd81c554ec290d.js","_expo/static/js/web/_layout-1a7a98e54134a33f655bc96dc146c1a1.js","_expo/static/js/web/_layout-a8cb47904b9d5a5e2b95a415cc2cb2a5.js","_expo/static/js/web/awards-453d73f758f05fedebb817429fdfc7b0.js","_expo/static/js/web/entry-6263ffb6288755f625a2eed53880669f.js","_expo/static/js/web/gate-33bd39c615c52a0c5d709fc137a7948c.js","_expo/static/js/web/index-e15d5edb2f8516da2303181035398c61.js","_expo/static/js/web/journal-621fc2f49a0cd58ab992eac20fa97867.js","_expo/static/js/web/onboarding-2168510e466788da4f998b68406355b2.js","_expo/static/js/web/runtime-f29a3ea8bbdb5ccaaea9a225cd6d16f5.js","_expo/static/js/web/settings-367164ddffa838787cd60321688749fd.js","_expo/static/js/web/sleep-04114ab020cac2ae8c0baf78fb92091d.js","_expo/static/js/web/urge-1872e77993666979c26144f37f53c457.js","apple-touch-icon.png","assets/assets/3d/gate-shield.c8c017b794b5678802ee0292eb02534b.webp","assets/assets/3d/medal-locked.b88ecc9ffd335d94c57ca4b4998c330c.webp","assets/assets/3d/medal-perfect-day.a151a96e9b18e965472eedb3aa4084e3.webp","assets/assets/3d/medal-streak-100.4f6189764cd3de7427f9f9d07afb3877.webp","assets/assets/3d/medal-streak-21.e9e7cfcd400a071953f2f1d4bf80d87a.webp","assets/assets/3d/medal-streak-3.4c7cb305acc0f4922b9c4db62c2feb3c.webp","assets/assets/3d/medal-streak-66.3f893c56b467f9d408dab6dc9862d5f0.webp","assets/assets/3d/medal-streak-7.13af8d87a408429cd4ddea85d73efe02.webp","assets/assets/3d/medal-urge-surfer.7f6372e725d33b71e0f126a89117d02e.webp","assets/assets/3d/medal-walked-away.aad80fbf7127ae8f88d63678f3da0b15.webp","assets/assets/3d/mood-1.dbef53f63ca6c0b8735d1193790f6d65.webp","assets/assets/3d/mood-2.6b07bbc1c89bfd8d9d5488bcff3ca3c1.webp","assets/assets/3d/mood-3.41194fe23f1544f95c78cd6b413709f9.webp","assets/assets/3d/mood-4.b1033c0c08aaa3b38c2a62e4a0466a58.webp","assets/assets/3d/mood-5.1e6146a995369472760994a061061860.webp","assets/assets/3d/mood-6.8559f11ed2a2812847f6336623a1cedc.webp","assets/assets/3d/mood-7.568ae40d1a1101153a83a37b85994415.webp","assets/assets/3d/ring-trophy.78a993214447db3c0398bc2883e3d93f.webp","assets/assets/images/icon.c2f6507a8baade5f36eb4b06dc013260.png","assets/node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png","assets/node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png","assets/node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png","assets/node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png","assets/node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png","assets/node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png","assets/node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png","assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png","assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png","assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png","assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png","assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png","assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png","assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png","assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png","assets/node_modules/expo-router/assets/react-navigation/elements/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png","assets/node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png","assets/node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png","favicon.ico","icon-192.png","icon-512.png","manifest.json"];

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
