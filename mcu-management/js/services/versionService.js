/**
 * Version Service
 * Manages app versioning and cache invalidation
 *
 * Ensures users always get the latest version of the app
 * by checking version.json and clearing old caches when needed
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_FILE = '../version.json';
const LOCAL_STORAGE_KEY = 'madis-app-version';

let lastVersionCheck = 0;
let currentVersion = null;

/**
 * Initialize version service
 * Check version on app load and periodically
 */
export async function initVersionService() {
    try {
        // Check version immediately on load
        await checkAndUpdateVersion();

        // Set up periodic version checks
        setInterval(checkAndUpdateVersion, VERSION_CHECK_INTERVAL);
    } catch (error) {
    }
}

/**
 * Get current app version
 */
export async function getCurrentVersion() {
    if (currentVersion) {
        return currentVersion;
    }

    try {
        const response = await fetch(VERSION_FILE, { cache: 'no-store' });
        const data = await response.json();
        currentVersion = data.version;
        return data.version;
    } catch (error) {
        return null;
    }
}

/**
 * Check if new version is available and update if needed
 */
export async function checkAndUpdateVersion() {
    try {
        const now = Date.now();

        // Throttle version checks
        if (now - lastVersionCheck < VERSION_CHECK_INTERVAL) {
            return;
        }

        lastVersionCheck = now;

        // Get current version from server
        const serverVersion = await getCurrentVersion();
        if (!serverVersion) {
            return;
        }

        // Get stored version from localStorage
        const storedVersion = localStorage.getItem(LOCAL_STORAGE_KEY);

        // If versions differ, clear cache and reload
        if (storedVersion && storedVersion !== serverVersion) {
            await clearAllCaches();
            notifyUserOfUpdate(storedVersion, serverVersion);
            return;
        }

        // Store current version
        localStorage.setItem(LOCAL_STORAGE_KEY, serverVersion);
    } catch (error) {
    }
}

/**
 * Clear all service worker caches
 */
export async function clearAllCaches() {
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(name => caches.delete(name))
            );
        }
    } catch (error) {
    }
}

/**
 * Force refresh by clearing cache and reloading
 */
export async function forceRefresh() {
    try {
        await clearAllCaches();

        // Unregister service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }

        // Reload page hard (bypass cache)
        window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
    } catch (error) {
        // Fallback: just reload
        window.location.reload();
    }
}

/**
 * Notify user of update
 */
function notifyUserOfUpdate(oldVersion, newVersion) {
    // Show in-app notification
    const message = `Versi baru tersedia (${newVersion}). Silakan refresh halaman untuk mendapatkan fitur terbaru.`;

    // Try to show toast if available
    try {
        const { showToast } = require('./uiHelpers.js');
        showToast(message, 'info');
    } catch (e) {
        // Fallback: show alert
    }

    // Create update notification banner
    createUpdateBanner(newVersion);
}

/**
 * Create update notification banner
 */
function createUpdateBanner(newVersion) {
    // Check if banner already exists
    if (document.getElementById('update-banner')) {
        return;
    }

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #3b82f6;
        color: white;
        padding: 1rem;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem;">
            <span>Versi baru MADIS ${newVersion} tersedia. </span>
            <button onclick="window.location.reload()" style="
                background-color: white;
                color: #3b82f6;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 0.25rem;
                cursor: pointer;
                font-weight: 500;
            ">Refresh Sekarang</button>
            <button onclick="document.getElementById('update-banner').remove()" style="
                background-color: transparent;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 1.25rem;
                padding: 0;
            ">✕</button>
        </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Get version info for display
 */
export async function getVersionInfo() {
    const appVersion = await getCurrentVersion();
    const storedVersion = localStorage.getItem(LOCAL_STORAGE_KEY);
    const swActive = 'serviceWorker' in navigator;

    return {
        appVersion,
        storedVersion,
        swActive,
        timestamp: new Date().toISOString()
    };
}

export default {
    initVersionService,
    getCurrentVersion,
    checkAndUpdateVersion,
    clearAllCaches,
    forceRefresh,
    getVersionInfo
};
