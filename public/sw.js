// Kill switch: this Service Worker exists only to evict every previous SW
// version of Chamos Barber that was using "Cache First" for the Next.js
// HTML + JS chunks. That strategy locked browsers onto stale bundles after
// every deploy (the cache name "chamos-barber-v1.0.1" was never bumped),
// which surfaced as 400/409/500s against endpoints whose payload contract
// had moved on. See feedback memory for the full incident.
//
// Behavior:
//   1. install: skipWaiting so we take over immediately.
//   2. activate: claim all clients, delete every Cache Storage entry,
//      unregister this worker, and reload all open clients so they fetch
//      the current build straight from the network.
//   3. fetch: passthrough (no caching).
//
// Once every active user has loaded this file at least once their browser
// will be SW-free. Future PWA work should re-introduce a worker only with
// a build-ID-based cache name (e.g. caches.open(`chamos-${BUILD_ID}`)) and
// a Network First strategy for HTML and Next.js assets.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));

        await self.clients.claim();

        try {
            await self.registration.unregister();
        } catch (_) {
            // best-effort: keep going even if unregister fails
        }

        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
            try {
                client.navigate(client.url);
            } catch (_) {
                // fallthrough — the user's next manual reload will pick it up
            }
        }
    })());
});

self.addEventListener('fetch', () => {
    // No-op: let the browser handle every request directly.
});
