// BomBlok Service Worker
// Caching strategy (no build step, so no content-hashed filenames):
//   - Every same-origin GET -> network-first: the newest copy when online, the cached copy
//     as an offline fallback.
//   - Cross-origin (CDN, fonts, Supabase) -> not intercepted; the browser handles them.
//
// Assets used to be stale-while-revalidate, which served them instantly from cache and
// refreshed in the background. That produced VERSION SKEW: navigations are network-first,
// so after a deploy a reload fetched the NEW index.html while the module scripts still came
// from the OLD cache. The service worker only registers on window 'load' — after those
// modules have already been requested — so bumping VERSION cannot prevent it either; it
// only cleans up the load after. Any change that alters the HTML/JS contract (a new element
// id, a new saved-data shape) would break for exactly one load per user.
//
// Network-first costs a round trip per asset when online, which on a CDN with HTTP/2 is
// negligible for a project this size, and nothing when offline. Consistency wins.
// Bump VERSION to force every client to drop its old cache on activate.

const VERSION = 'v18';
const CACHE_NAME = `bomblok-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './themes.css',
  './assets/favicon-32.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './manifest.json',
  './js/main.js',
  './js/state.js',
  './js/storage.js',
  './js/run-save.js',
  './js/run-save-schema.js',
  './js/grid.js',
  './js/mechanics.js',
  './js/particles.js',
  './js/audio.js',
  './js/theme.js',
  './js/settings.js',
  './js/keyboard.js',
  './js/modal.js',
  './js/config.js',
  './js/missions.js',
  './js/leaderboard.js',
  './js/rules.js',
  './js/haptics.js',
  './js/achievements.js'
];

// Pre-cache the app shell. `cache: 'reload'` bypasses the browser HTTP cache so we never
// bake a stale copy into the SW cache (the exact failure mode that hid earlier updates).
//
// skipWaiting() MUST come after the precache resolves, not before it. Calling it up front
// activates the worker while cache.add() calls are still in flight, and the browser is then
// free to terminate the old worker mid-write — the precache was silently completing zero
// entries. The cache only ever held what the running page happened to request, so
// manifest.json and the icons were never stored, and a first visit followed by going
// offline had no app shell to fall back on.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
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

  event.respondWith(networkFirst(req, isHTML));
});

// Fresh when online, cached copy when offline.
// `isHTML` only controls the offline fallback: a navigation may fall back to the cached
// app shell, but an asset must not — answering a .js request with index.html would hand
// the module loader a page of HTML and fail confusingly.
async function networkFirst(req, isHTML) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached =
      (await cache.match(req)) ||
      (isHTML
        ? (await cache.match('./index.html')) || (await cache.match('./'))
        : undefined);
    return cached || Response.error();
  }
}
