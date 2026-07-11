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

const CACHE_VERSION = 'madis-v30';
const MAX_CACHE_ENTRIES = 200;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/output.css',
  '/css/sidebar.css',
  '/js/appBootstrap.js',
  '/assets/images/favicon.ico',
  '/js/config/envConfig.js',
  '/js/config/supabase.js',
  '/js/router/spaRouter.js'
];

/**
 * Install Event - Cache static assets (continue even if some fail)
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Use allSettled to cache assets that succeed, ignore failures
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url))
      );
    })
    .then(() => self.skipWaiting()) // Activate immediately
    .catch((error) => {
      // Silent fail - service worker installation errors are non-critical
    })
  );
});

/**
 * Activate Event - Clean up old caches aggressively
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(CACHE_VERSION))
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

  // Never cache the release manifest. It is the source of truth for updates.
  if (url.pathname === '/version.json') {
    event.respondWith(networkOnlyStrategy(request));
    return;
  }

  // External libraries and Supabase manage their own network behavior.
  if (url.hostname !== location.hostname) return;

  // HTML pages - Network first
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Do not persist API responses because they may contain user-specific data.
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkOnlyStrategy(request));
    return;
  }

  // Unhashed code and styles must revalidate on every normal reload.
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
});

async function networkOnlyStrategy(request) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Network unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Cache-first strategy: Try cache first, fall back to network
 * Good for: Static assets, CSS, JS, images
 */
async function cacheFirstStrategy(request) {
  try {
    // Check cache first - fastest path
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Network fallback with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);

    // Cache successful responses
    if (response.ok && response.status < 400) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, MAX_CACHE_ENTRIES);
    }

    return response;
  } catch (error) {
    // Timeout or network error, return cached or error
    const cached = await caches.match(request);
    return cached || new Response('Resource unavailable', { status: 503 });
  }
}

/**
 * Network-first strategy: Try network first, fall back to cache
 * Good for: HTML pages, frequently changing content
 */
async function networkFirstStrategy(request) {
  const cachePromise = caches.match(request);

  try {
    // Network request with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7 second timeout

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);

    // Cache successful responses
    if (response.ok || response.status < 400) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed or timeout, return cached version
    const cached = await cachePromise;
    return cached || new Response('Offline - page not available', { status: 503 });
  }
}

/**
 * API Network-first strategy: For API calls with special handling and timeouts
 */
async function apiNetworkFirstStrategy(request) {
  const cacheKey = new Request(request, { method: 'GET' });

  try {
    // API request with longer timeout (15s for Supabase)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);

    // Cache successful API responses
    if (response.ok && response.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(cacheKey, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed or timeout: return cached API response
    const cached = await caches.match(cacheKey);

    if (cached) {
      return cached;
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
 * Note: .js files are handled separately with network-first strategy
 */
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.png', '.jpg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.json', '.wasm'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Trim cache to keep only N most recent entries
 */
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxEntries) {
      const keysToDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    // Silent fail - cache trimming errors are non-critical
  }
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
