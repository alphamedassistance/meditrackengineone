const CACHE_NAME = 'meditrack-v1-offline';

// 1. INSTALL EVENT: Cache ONLY local core files
// We removed the external CDN links here to prevent installation failure.
// They will be cached dynamically in the fetch event below.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker ...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE EVENT: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker ....');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache.', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 3. FETCH EVENT: Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Handle Supabase and other external requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        // We ALLOW 'cors' type now so external CDNs can be cached
        if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
        }

        // Clone response to cache it
        const responseToCache = networkResponse.clone();
        
        // Only cache GET requests (don't cache API POST/PUT calls)
        if (event.request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }

        return networkResponse;
      }).catch(() => {
         // Optional: Return a fallback page if offline and resource not cached
      });
    })
  );
});
