const CACHE_NAME = 'fitlog-v1';
const STATIC_ASSETS = [
    '/',
    '/today',
    '/gtg',
    '/program',
    '/tools',
    '/progress',
    '/settings',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Always go network-first for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Cache-first for static assets, fallback to network
    event.respondWith(
        caches.match(request).then((cached) => {
            const fetched = fetch(request).then((response) => {
                // Update cache with fresh copy
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return response;
            });
            return cached || fetched;
        })
    );
});
