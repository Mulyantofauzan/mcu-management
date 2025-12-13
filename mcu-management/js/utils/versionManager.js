/**
 * Version Manager - Handles app version checking and update notifications
 *
 * Features:
 * - Checks for new version every time app loads
 * - Shows update banner when new version is available
 * - Forces cache clear and page reload when user clicks update
 * - Tracks version history in localStorage
 * - Prevents old cached versions from being used
 */

// Current app version (update this when deploying new fixes)
const CURRENT_VERSION = '1.0.6';

// Service worker cache version (must match sw.js)
const CURRENT_CACHE_VERSION = 'madis-v6';

// Version history key in localStorage
const VERSION_HISTORY_KEY = 'madis_version_history';
const LAST_VERSION_CHECK_KEY = 'madis_last_version_check';

/**
 * Get stored version from localStorage
 */
function getStoredVersion() {
  return localStorage.getItem('madis_current_version') || '0.0.0';
}

/**
 * Store current version in localStorage
 */
function storeCurrentVersion() {
  localStorage.setItem('madis_current_version', CURRENT_VERSION);
  localStorage.setItem('madis_sw_cache_version', CURRENT_CACHE_VERSION);
}

/**
 * Get service worker cache version from localStorage
 */
function getStoredCacheVersion() {
  return localStorage.getItem('madis_sw_cache_version') || 'madis-v0';
}

/**
 * Add version to history
 */
function addToVersionHistory(version, timestamp = new Date().toISOString()) {
  try {
    let history = JSON.parse(localStorage.getItem(VERSION_HISTORY_KEY) || '[]');

    // Only add if not already in history
    if (!history.find(v => v.version === version)) {
      history.push({ version, timestamp });

      // Keep only last 10 versions
      if (history.length > 10) {
        history = history.slice(-10);
      }

      localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
  }
}

/**
 * Check if update is available by comparing versions
 */
function isUpdateAvailable() {
  const storedVersion = getStoredVersion();
  const storedCacheVersion = getStoredCacheVersion();

  // Check version number
  const versionChanged = storedVersion !== CURRENT_VERSION;

  // Check cache version (different cache = new deployment)
  const cacheVersionChanged = storedCacheVersion !== CURRENT_CACHE_VERSION;

  return versionChanged || cacheVersionChanged;
}

/**
 * Show update notification banner
 */
function showUpdateBanner() {
  // Check if banner already exists
  if (document.getElementById('update-notification-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'update-notification-banner';
  banner.className = 'fixed top-0 left-0 right-0 z-[10000] bg-blue-600 text-white p-3 shadow-lg';
  banner.innerHTML = `
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex-1">
        <p class="font-semibold text-sm md:text-base">
          ✨ Versi terbaru tersedia! (v${CURRENT_VERSION})
        </p>
        <p class="text-xs md:text-sm opacity-90">
          Aplikasi telah diperbarui dengan perbaikan dan fitur baru. Silakan refresh halaman untuk mendapatkan versi terbaru.
        </p>
      </div>
      <div class="flex gap-2 ml-4 flex-shrink-0">
        <button
          onclick="window.versionManager.dismissUpdate()"
          class="px-3 py-1 text-xs rounded hover:bg-blue-700 transition"
        >
          Nanti
        </button>
        <button
          onclick="window.versionManager.applyUpdate()"
          class="px-3 py-1 text-xs font-semibold rounded bg-white text-blue-600 hover:bg-gray-100 transition"
        >
          Update Sekarang
        </button>
      </div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  // Auto-dismiss after 5 seconds (user can dismiss manually too)
  const autoDismissTime = setTimeout(() => {
    const stillExists = document.getElementById('update-notification-banner');
    if (stillExists && !stillExists.classList.contains('hidden')) {
      stillExists.style.opacity = '0.5';
    }
  }, 5000);

  // Store timeout ID for cleanup
  banner.autoDismissTimeout = autoDismissTime;
}

/**
 * Dismiss update notification
 */
function dismissUpdate() {
  const banner = document.getElementById('update-notification-banner');
  if (banner) {
    banner.classList.add('hidden');
    clearTimeout(banner.autoDismissTimeout);
  }
}

/**
 * Apply update - clear all caches and reload
 */
async function applyUpdate() {
  try {
    // Show loading state
    const banner = document.getElementById('update-notification-banner');
    if (banner) {
      const btn = banner.querySelector('[onclick*="applyUpdate"]');
      if (btn) {
        btn.textContent = 'Sedang memperbarui...';
        btn.disabled = true;
      }
    }

    // Unregister all service workers to clear caches
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    }

    // Update version in localStorage
    storeCurrentVersion();
    addToVersionHistory(CURRENT_VERSION);


    // Wait 500ms to ensure caches are cleared, then reload
    setTimeout(() => {
      // Force reload without cache
      window.location.href = window.location.href;
    }, 500);

  } catch (error) {
    alert('Gagal mengaplikasikan update. Silakan refresh halaman secara manual (Ctrl+Shift+R).');
  }
}

/**
 * Initialize version manager
 * Called automatically on app startup
 */
export async function initVersionManager() {
  const storedVersion = getStoredVersion();
  const isFirstTime = !storedVersion || storedVersion === '0.0.0';
  const hasUpdate = isUpdateAvailable();


  // Add to version history
  addToVersionHistory(CURRENT_VERSION);

  // Show notification only if NOT first time AND update is available
  if (!isFirstTime && hasUpdate) {
    showUpdateBanner();
  }

  // Update stored version to current
  storeCurrentVersion();

  // Update last version check timestamp
  localStorage.setItem(LAST_VERSION_CHECK_KEY, new Date().toISOString());
}

/**
 * Get version info (for debugging)
 */
export function getVersionInfo() {
  return {
    currentVersion: CURRENT_VERSION,
    currentCacheVersion: CURRENT_CACHE_VERSION,
    storedVersion: getStoredVersion(),
    storedCacheVersion: getStoredCacheVersion(),
    updateAvailable: isUpdateAvailable(),
    versionHistory: JSON.parse(localStorage.getItem(VERSION_HISTORY_KEY) || '[]'),
    lastVersionCheck: localStorage.getItem(LAST_VERSION_CHECK_KEY)
  };
}

/**
 * Export functions to window for HTML onclick handlers
 */
export const versionManager = {
  dismissUpdate,
  applyUpdate,
  getVersionInfo,
  getCurrentVersion: () => CURRENT_VERSION,
  getStoredVersion,
  isUpdateAvailable
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.versionManager = versionManager;
}
