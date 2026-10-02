const CACHE_NAME = 'molemisi-v2';
const OFFLINE_URL = '/offline.html';

/**
 * Shell assets precached at install.
 *
 * `/game` is deliberately NOT here. The previous worker precached `/` and then
 * applied a blanket network-first + cache fallback to EVERY GET, which meant
 * Next.js RSC payloads and the rendered game HTML were served from cache when
 * the network was flaky. That is the worst case for this game: the player sees
 * a stale farm — old balance, old crops — with no indication it is stale. The
 * spec's offline rule is "displays last-known state and queues no value-affecting
 * actions", so only truly static, immutable assets are cached here.
 */
const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/branding/logo.png',
];

// Immutable, content-hashed build output: safe to serve cache-first.
const BUILD_ASSET = /\/_next\/static\//;
// Never cached: value-affecting reads, auth, and server-rendered state.
const NEVER_CACHE = [
  /\/api\//,
  /\/auth\//,
  /\/admin/,
  /^\/game\/?(\?|$)/,
  /_next\/data/,
  /\.(?:json)$/,
];

function isNeverCache(url) {
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return true; // cross-origin (API host)
    return NEVER_CACHE.some((re) => re.test(u.pathname));
  } catch (_) {
    return true;
  }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // addAll() is atomic: one 404 rejects the whole install and the player
      // silently loses offline support. add individually so a missing optional
      // asset cannot break the rest.
      await Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      );
    }),
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// Push event — 03 §12. The server-side web-push sender (VAPID) is not built
// yet; this handler is the receiver it will target when it is.
self.addEventListener('push', (event) => {
  let payload = { title: 'Molemisi', body: 'Something happened on your farm.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    // Plain-text payloads still deserve a readable body.
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }),
  );
});

// Notification click - focus the app (or open it)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = clientList.find((c) => c.url.includes('/game'));
      if (client) return client.focus();
      return self.clients.openWindow('/game');
    })(),
  );
});

// Fetch event.
//
// Three strategies, chosen per request:
//   - build assets  → cache-first (content-hashed, immutable)
//   - navigations   → network-only, offline fallback page
//   - everything else→ network-first, cache as a safety net
//
// Crucially, the API host is cross-origin (port 3001) and is never touched, so
// no Pula balance or crop state can ever be served from a cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET is cacheable. A queued POST would be a queued sale — the spec
  // explicitly forbids queueing value-affecting actions offline.
  if (req.method !== 'GET') return;
  if (isNeverCache(req.url)) return;

  // Content-hashed build output never changes under the same URL.
  if (BUILD_ASSET.test(new URL(req.url).pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navigations: never serve a cached document. A stale farm that looks live is
  // worse than an honest offline screen.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((hit) => hit || Response.error())),
    );
    return;
  }

  // Everything else: network-first so the player gets live data whenever
  // possible, with the cache only as an offline fallback.
  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error())),
  );
});
