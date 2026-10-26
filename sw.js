const CACHE_NAME = 'calendar-v67';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=67',
  './app.js?v=67',
  './shared-calendar.js?v=67',
  './supabase-config.js?v=67',
  './map-config.js?v=67',
  './manifest.webmanifest?v=67',
  './manifest-dark.webmanifest?v=67',
  './icon.svg?v=67',
  './apple-touch-icon.png?v=67',
  './icon-192.png?v=67',
  './icon-512.png?v=67',
  './icon-maskable-512.png?v=67',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
