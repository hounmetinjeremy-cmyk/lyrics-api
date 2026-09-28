const CACHE_NAME = 'lyrics-finder-v1'
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('offline')))
})
