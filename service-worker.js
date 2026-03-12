const CACHE_NAME = 'meditrack-v2-offline'; // <--- Bumped to v2 so phones download the new update!

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

// 3. FETCH EVENT: True Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    // Only cache GET requests (ignore Supabase POST/PUT requests)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                
                // Fetch the fresh version from the network in the background
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // If network response is valid, update the cache
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Ignore network errors (user might be offline)
                });

                // Return the cached response IMMEDIATELY if we have it, 
                // otherwise wait for the network fetch to finish.
                return cachedResponse || fetchPromise;
            });
        })
    );
});
