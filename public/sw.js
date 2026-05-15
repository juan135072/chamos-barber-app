// ================================================================
// 📱 SERVICE WORKER - Chamos Barber PWA
// ================================================================

// 1. CONFIGURACIÓN
const CACHE_NAME = 'chamos-barber-v1.0.1';
const API_CACHE_NAME = 'chamos-barber-api-v1';
const STATIC_CACHE = [
  '/',
  '/barber-app',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/manifest.json'
];

// 2. LISTENERS - Deben estar en el nivel superior absoluto para evaluación inicial

// Manejo de mensajes (ej. actualización de versión)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// INSTALACIÓN
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Service Worker: Archivos estáticos cacheados');
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar control inmediato de todas las páginas
  return self.clients.claim();
});

// FETCH - ESTRATEGIA DE CACHÉ
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes externas (Supabase, CDN, etc.) para caché estático
  if (url.origin !== location.origin) {
    return;
  }

  // Ignorar POST/PUT/DELETE (solo cachear GET)
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia: Network First para /barber-app, Cache First para estáticos
  if (url.pathname.startsWith('/barber-app')) {
    // Network First: Intenta red primero, si falla usa caché
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar respuesta para cachear
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, buscar en caché
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback: retornar la página principal del app si estamos en esa ruta
            return caches.match('/barber-app');
          });
        })
    );
  } else {
    // Cache First: Para otros archivos estáticos internos
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // No cachear si no es 200 OK o si es un error
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
  }
});

console.log('✅ Service Worker cargado y consolidado');

