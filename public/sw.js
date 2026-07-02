/*
 * Sightread Chess — offline service worker.
 *
 * The whole app (including the ~1 MB of drill/game data) is bundled into hashed
 * build assets, so offline support is simple:
 *   - navigations (the HTML page): network-first, fall back to cache → new deploys
 *     show up when online, the app still opens with no connection.
 *   - hashed assets (JS/CSS/JSON/icons): cache-first → instant, immutable.
 * Bump CACHE to force every client to drop the old cache on the next visit.
 */
const CACHE = 'sightread-v1'
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/icon-32.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // HTML navigations: network-first so a new deploy is picked up when online.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    )
    return
  }

  // Everything else: cache-first, fall back to network (and cache what we fetch).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
    })
  )
})
