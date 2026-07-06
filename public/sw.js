// Minimal app-shell cache for Aura. No build-time asset manifest — this caches
// whatever the user actually loads at runtime, so it doesn't need to know
// Vite's content-hashed filenames. Purely additive: on any cache miss or SW
// failure, requests just fall through to the network like normal.
const CACHE = 'aura-shell-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // Navigations: try the network first (so updates show up promptly), fall back to
  // whatever shell we have cached when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // Static assets: cache-first, filling the cache on first fetch.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()))
          return res
        }),
    ),
  )
})

// Daily-reminder push: the payload is always the small generic { title, body }
// object sent by api/push/send-reminders.ts — never anything from the user's
// journal/chat, since the server that sends this never has access to it.
self.addEventListener('push', (event) => {
  let data = { title: 'Aura', body: '' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // best-effort; fall back to the generic title/body above
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'aura-daily-reminder',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    }),
  )
})
