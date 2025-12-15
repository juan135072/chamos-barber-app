// ================================================================
// 🔧 SERVICE WORKER - CHAMOS BARBER APP
// Service Worker para PWA con estrategia de caché
// ================================================================

const CACHE_NAME = 'chamos-barber-v1'
const urlsToCache = [
  '/',
  '/barber-app',
  '/offline.html',
  '/chamos-logo.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell')
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Estrategia de caché: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return

  // Ignorar requests de Supabase y APIs externas
  if (
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('api.') ||
    event.request.url.includes('/api/')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar la respuesta porque es un stream que solo se puede consumir una vez
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
      .catch(() => {
        // Si falla el network, buscar en caché
        return caches.match(event.request).then((response) => {
          if (response) {
            return response
          }

          // Si no está en caché, mostrar página offline
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html')
          }
        })
      })
  )
})

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received')
  
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Chamos Barber'
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked')
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/barber-app'

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
