/**
 * Application bootstrap for service worker updates and cache invalidation.
 * This runs on every page so a normal reload is enough to receive a release.
 */

const VERSION_STORAGE_KEY = 'madis-app-version';
const RELOAD_STORAGE_KEY = 'madis-reloaded-version';

async function fetchServerVersion() {
  const response = await fetch(`/version.json?ts=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Version check failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.version || null;
}

async function clearApplicationCaches() {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('madis-'))
      .map(name => caches.delete(name))
  );
}

function displayVersion(version) {
  if (!version) return;

  document.querySelectorAll('#app-version').forEach(element => {
    element.textContent = `v${version}`;
  });
}

function reloadOnce(version) {
  if (sessionStorage.getItem(RELOAD_STORAGE_KEY) === version) return;

  sessionStorage.setItem(RELOAD_STORAGE_KEY, version);
  const url = new URL(window.location.href);
  url.searchParams.set('appVersion', version);
  window.location.replace(url.toString());
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  let controllerChanged = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controllerChanged) return;
    controllerChanged = true;

    const version = localStorage.getItem(VERSION_STORAGE_KEY);
    if (version) reloadOnce(version);
  });

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none'
  });

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });

  await registration.update();

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  return registration;
}

async function initializeApplication() {
  try {
    const registrationPromise = registerServiceWorker().catch(() => null);
    const serverVersion = await fetchServerVersion();

    if (!serverVersion) return;

    displayVersion(serverVersion);

    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!storedVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);
      sessionStorage.removeItem(RELOAD_STORAGE_KEY);
      await registrationPromise;
      return;
    }

    if (storedVersion !== serverVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);
      await clearApplicationCaches();

      const registration = await registrationPromise;
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reloadOnce(serverVersion);
      return;
    }

    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    await registrationPromise;
  } catch (error) {
    // Updates are best-effort; application startup must continue when offline.
  }
}

initializeApplication();
