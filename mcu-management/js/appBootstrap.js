/**
 * Application bootstrap for service worker updates and cache invalidation.
 * This runs on every page so a normal reload is enough to receive a release.
 */

import { createPageLifecycle } from './utils/pageLifecycleManager.js';

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
  window.location.reload();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let controllerChanged = false;
  let activationRequested = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (!activationRequested) return;
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
      if (worker.state === 'installed' && hadController) {
        showUpdateNotice(registration, localStorage.getItem(VERSION_STORAGE_KEY));
      }
    });
  });

  await registration.update();

  if (registration.waiting) {
    showUpdateNotice(registration, localStorage.getItem(VERSION_STORAGE_KEY));
  }

  registration.activateWaitingWorker = () => {
    activationRequested = true;
    return activateWaitingWorker(registration);
  };

  return registration;
}

function activateWaitingWorker(registration) {
  if (!registration?.waiting) return false;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

function showUpdateNotice(registration, version) {
  if (!registration?.waiting || document.getElementById('madis-update-notice')) return;
  const notice = document.createElement('div');
  notice.id = 'madis-update-notice';
  notice.className = 'madis-update-notice';
  notice.setAttribute('role', 'status');
  notice.innerHTML = '<span>Versi baru MADIS tersedia.</span><button type="button">Muat Ulang</button>';
  notice.querySelector('button').addEventListener('click', () => {
    registration.activateWaitingWorker?.();
  });
  document.body.appendChild(notice);
  document.dispatchEvent(new CustomEvent('madis:update-available', {
    detail: { version, activate: () => registration.activateWaitingWorker?.() }
  }));
}

function initializePageLifecycle() {
  const pageId = document.body?.dataset.pageId || 'madis';
  const lifecycle = createPageLifecycle(pageId);
  document.querySelectorAll('[data-lifecycle-region]').forEach(element => {
    lifecycle.registerRegion(
      element.dataset.lifecycleRegion,
      element,
      { initialState: element.dataset.lifecycleState || 'ready' }
    );
  });
  lifecycle.markShellReady();
  window.MADIS_PAGE_LIFECYCLE = lifecycle;
}

async function initializeApplication() {
  try {
    initializePageLifecycle();
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
      showUpdateNotice(registration, serverVersion);
      return;
    }

    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    await registrationPromise;
  } catch (error) {
    // Updates are best-effort; application startup must continue when offline.
  }
}

initializeApplication();
