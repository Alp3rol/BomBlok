// BomBlok Service Worker
// Caching strategy (no build step, so no content-hashed filenames):
//   - Navigations / HTML  -> network-first: always the latest index.html when online,
//                            cached copy as an offline fallback.
//   - Same-origin assets  -> stale-while-revalidate: serve instantly from cache, then
//                            refresh the cache in the background so the NEXT load is current.
//   - Cross-origin (CDN, fonts, Supabase) -> not intercepted; the browser handles them.
// This removes the old "cache-first + manual CACHE_NAME bump" trap where updates never
// reached users. Bump VERSION only when you want to force an immediate full refresh for
// everyone (it drops all previous caches on activate); day-to-day edits reach users on
// their own via the strategies above, with no version bump and no ?v= query needed.

const VERSION = 'v10';
const CACHE_NAME = `bomblok-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './themes.css',
  './icon.png',
  './manifest.json',
  './js/main.js',
  './js/state.js',
  './js/grid.js',
  './js/mechanics.js',
  './js/particles.js',
  './js/audio.js',
  './js/theme.js',
  './js/config.js',
  './js/missions.js',
  './js/leaderboard.js',
  './js/rules.js',
  './js/haptics.js',
  './js/achievements.js'
];

// Pre-cache the app shell. `cache: 'reload'` bypasses the browser HTTP cache so we never
// bake a stale copy into the SW cache (the exact failure mode that hid earlier updates).
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      )
    )
  );
});

// Drop caches from previous versions and take control of already-open pages immediately.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only manage our own origin; let the browser handle CDN/fonts/Supabase normally.
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  event.respondWith(isHTML ? networkFirst(req) : staleWhileRevalidate(req));
});

// HTML: fresh when online, cached fallback when offline.
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached =
      (await cache.match(req)) ||
      (await cache.match('./index.html')) ||
      (await cache.match('./'));
    return cached || Response.error();
  }
}

// Assets: instant from cache, revalidate in the background for the next load.
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const network = fetch(req, { cache: 'no-store' })
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}
