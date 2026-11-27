const CACHE = 'pleziah-surestream-v36-2';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/surestream-mark.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Optional shell files must not prevent the new worker from installing.
    await Promise.all(SHELL.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok) await cache.put(path, response);
      } catch {
        // The app remains usable online even if an optional shell file is unavailable.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put('/', copy)).catch(() => {}));
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  if (/\.(js|css|woff2?|svg|png|webp|jpe?g|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      try {
        // Network-first keeps deployed bundles current; cache is only an offline fallback.
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      } catch {
        if (cached) return cached;
        throw new Error('Asset unavailable online and in the offline cache.');
      }
    })());
  }
});
