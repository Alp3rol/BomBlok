const CACHE_NAME = 'bomblok-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './themes.css',
  './icon.png',
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
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
