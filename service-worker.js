const CACHE_NAME = 'meditrack-v1-offline';

// List of files to cache immediately when the app loads
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // External Libraries (Caching these ensures app works offline)
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js'
];

// 1. INSTALL EVENT: Cache core files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker ...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker
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
  // Claim control of all clients immediately
  return self.clients.claim();
});

// 3. FETCH EVENT: Offline-First Strategy
// Check cache first. If found, return it. If not, fetch from network and cache the result.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Otherwise, fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // If response is opaque (like CDNs sometimes), we still return it but might not cache depending on strictness.
          // For this app, we return the network response directly if we can't cache it properly.
          return networkResponse;
        }

        // Clone the response because it's a stream and can only be consumed once
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // Network failed (offline) and not in cache
        console.log('[Service Worker] Fetch failed:', err);
        // You could return a custom offline.html here if you wanted
      });
    })
  );
});