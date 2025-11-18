/**
 * Service Worker for MCU-APP
 *
 * Features:
 * - Offline support (serve cached pages when offline)
 * - Cache-first strategy for static assets
 * - Network-first strategy for API calls
 * - Smart cache updates
 * - Background sync for offline operations
 *
 * Cache Strategies:
 * 1. Cache-first: Static assets (CSS, JS, images)
 * 2. Network-first: API calls with fallback to cache
 * 3. Stale-while-revalidate: Master data (fetch fresh, serve stale immediately)
 */

const CACHE_VERSION = 'madis-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/output.css',
  '/assets/images/favicon.ico',
  '/js/config/envConfig.js',
  '/js/config/supabase.js',
  '/js/router/spaRouter.js'
];

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
    .then(() => self.skipWaiting()) // Activate immediately
    .catch((error) => {
      console.warn('Service Worker: Failed to cache static assets', error);
    })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
    .then(() => self.clients.claim()) // Take control immediately
  );
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external CDN requests (let them go to network)
  if (url.hostname !== location.hostname && url.origin.includes('cdn.jsdelivr') === false) {
    return;
  }

  // HTML pages - Network first
  if (request.headers.get('Accept').includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // API calls - Network first with API cache
  if (url.pathname.includes('/api/')) {
    event.respondWith(apiNetworkFirstStrategy(request));
    return;
  }

  // Static assets - Cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // CDN resources - Cache first with network fallback
  if (url.origin.includes('cdn.jsdelivr') || url.origin.includes('unpkg') || url.origin.includes('cdnjs')) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Database requests - Network first
  if (url.pathname.includes('supabase') || url.pathname.includes('realtime')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
});

/**
 * Cache-first strategy: Try cache first, fall back to network
 * Good for: Static assets, CSS, JS, images
 */
async function cacheFirstStrategy(request) {
  try {
    // Check cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Network fallback
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Offline: return cached version if available
    const cached = await caches.match(request);
    return cached || new Response('Offline - resource not available', { status: 503 });
  }
}

/**
 * Network-first strategy: Try network first, fall back to cache
 * Good for: HTML pages, frequently changing content
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed: return cached version
    const cached = await caches.match(request);
    return cached || new Response('Offline - page not available', { status: 503 });
  }
}

/**
 * API Network-first strategy: For API calls with special handling
 */
async function apiNetworkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful API responses
    if (response.ok && response.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed: return cached API response
    const cached = await caches.match(request);

    if (cached) {
      // Return cached response but with a warning header
      const responseWithHeader = new Response(cached.body, cached);
      responseWithHeader.headers.set('X-From-Cache', 'true');
      return responseWithHeader;
    }

    // No cache available: return error response
    return new Response(
      JSON.stringify({ error: 'Offline - API not available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Stale-while-revalidate strategy: Serve cache immediately, update in background
 * Good for: Master data (departments, doctors, etc.)
 */
async function staleWhileRevalidateStrategy(request) {
  const cached = await caches.match(request);

  // Fetch fresh data in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });

  // Return cached immediately, or wait for network
  return cached || fetchPromise;
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Handle background sync (for offline operations)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-operations') {
    event.waitUntil(
      // TODO: Implement offline operation queue sync
      Promise.resolve()
    );
  }
});

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'MADIS Notification',
    icon: '/assets/images/favicon-32x32.png',
    badge: '/assets/images/favicon-16x16.png',
    tag: data.tag || 'madis-notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MADIS', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If window is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data?.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

// Log service worker lifecycle
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_CACHE_STATS') {
    caches.keys().then((names) => {
      const stats = { version: CACHE_VERSION, caches: names };
      event.ports[0].postMessage(stats);
    });
  }
});
