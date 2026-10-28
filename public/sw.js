const CACHE = 'surestream-pleziah-v31';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/surestream-mark.svg', '/og-surestream.jpg', '/assets/stadium-hero.jpg', '/assets/matchday-banner.jpg', '/assets/yamal-goalkeeper.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        // Clone synchronously before the browser can consume the response body.
        const cacheCopy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put('/', cacheCopy)).catch(() => {}));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }
  if (/\.(js|css|woff2?|svg|png|webp|jpe?g|ico)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then(async cached => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        // Clone synchronously, then let the service-worker event wait for cache storage.
        const cacheCopy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, cacheCopy)).catch(() => {}));
      }
      return response;
    }));
  }
});
