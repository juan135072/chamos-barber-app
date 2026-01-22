// ================================================================
// 📱 SERVICE WORKER - Chamos Barber PWA
// Caché de archivos estáticos y soporte offline
// ================================================================

// MESSAGE HANDLER - Debe estar en el nivel superior para evitar advertencias del navegador
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

const CACHE_NAME = 'chamos-barber-v1.0.0'
const API_CACHE_NAME = 'chamos-barber-api-v1'

// Archivos a cachear en instalación
const STATIC_CACHE = [
  '/',
  '/barber-app',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/manifest.json'
]

// ================================================================
// INSTALACIÓN DEL SERVICE WORKER
// ================================================================
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Service Worker: Archivos estáticos cacheados')
      return cache.addAll(STATIC_CACHE)
    })
  )

  // Forzar activación inmediata
  self.skipWaiting()
})

// ================================================================
// ACTIVACIÓN DEL SERVICE WORKER
// ================================================================
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activando...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ Service Worker: Eliminando caché antigua:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )

  // Tomar control inmediato de todas las páginas
  return self.clients.claim()
})

// ================================================================
// FETCH - ESTRATEGIA DE CACHÉ
// ================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar solicitudes externas (Supabase, CDN, etc.)
  if (url.origin !== location.origin) {
    return
  }

  // Ignorar POST/PUT/DELETE (solo cachear GET)
  if (request.method !== 'GET') {
    return
  }

  // Estrategia: Network First para /barber-app, Cache First para estáticos
  if (url.pathname.startsWith('/barber-app')) {
    // Network First: Intenta red primero, si falla usa caché
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar respuesta para cachear
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // Si falla la red, buscar en caché
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Fallback: retornar página offline
            return caches.match('/barber-app')
          })
        })
    )
  } else {
    // Cache First: Para archivos estáticos
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request).then((response) => {
          // No cachear si no es 200 OK
          if (!response || response.status !== 200 || response.type === 'error') {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })

          return response
        })
      })
    )
  }
})

// ================================================================
// PUSH NOTIFICATIONS (Placeholder para OneSignal)
// ================================================================
self.addEventListener('push', (event) => {
  console.log('📬 Push notification recibida:', event)

  const options = {
    body: event.data ? event.data.text() : 'Nueva cita agendada',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    tag: 'barber-app-notification',
    requireInteraction: false,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'ver',
        title: 'Ver Citas',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'cerrar',
        title: 'Cerrar',
        icon: '/favicon-32x32.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Chamos Barber', options)
  )
})

// ================================================================
// NOTIFICATION CLICK
// ================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificación clickeada:', event.action)

  event.notification.close()

  if (event.action === 'ver') {
    event.waitUntil(
      clients.openWindow('/barber-app')
    )
  }
})

// ================================================================
// BACKGROUND SYNC (Futuro - para acciones offline)
// ================================================================
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag)

  if (event.tag === 'sync-citas') {
    event.waitUntil(
      // Implementar lógica de sincronización
      console.log('Sincronizando citas pendientes...')
    )
  }
})
// background sync logic above
})

console.log('✅ Service Worker cargado correctamente')
