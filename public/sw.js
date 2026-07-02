const CACHE_NAME = 'muslim-bag-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clean old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // We only cache assets from the same origin or CDN assets (from unpkg for the PDF worker, etc.)
  const isSameOrigin = url.origin === self.location.origin;
  const isCdn = url.hostname.includes('unpkg.com') || url.hostname.includes('icons8.com') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com');

  if (isSameOrigin || isCdn) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache and update cache with new version from network in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => { /* offline: ignore background sync failure */ });
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch((err) => {
          // If a navigation request fails, serve the root cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          throw err;
        });
      })
    );
  }
});
