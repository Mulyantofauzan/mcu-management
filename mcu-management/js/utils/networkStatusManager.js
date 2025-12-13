/**
 * Network Status Manager
 * Monitors network connectivity and displays notifications to user
 * Shows offline/online status changes with appropriate messaging
 */

import { showToast } from './uiHelpers.js';
import { logger } from './logger.js';

class NetworkStatusManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.notificationContainer = null;
    this.isInitialized = false;
    this.lastNotificationTime = 0;
    this.notificationDebounce = 1000; // Don't show notifications more than once per second
  }

  /**
   * Initialize network status monitoring
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Check connection status periodically (every 10 seconds)
    this.connectionCheckInterval = setInterval(() => {
      this.checkConnection();
    }, 10000);

    this.isInitialized = true;
    logger.info('Network status manager initialized');
  }

  /**
   * Handle when device comes online
   */
  handleOnline() {
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationDebounce) {
      return;
    }

    this.isOnline = true;
    this.lastNotificationTime = now;

    logger.info('✅ Network restored - User is back online');

    // Show success notification
    showToast('Koneksi jaringan telah dipulihkan ✓', 'success');

    // Dispatch custom event for other parts of app to listen
    window.dispatchEvent(new CustomEvent('networkStatusChanged', {
      detail: { isOnline: true }
    }));
  }

  /**
   * Handle when device goes offline
   */
  handleOffline() {
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationDebounce) {
      return;
    }

    this.isOnline = false;
    this.lastNotificationTime = now;

    logger.warn('⚠️ Network disconnected - User is offline');

    // Show error notification
    showToast('Tidak ada koneksi jaringan. Fitur tertentu mungkin tidak berfungsi.', 'warning');

    // Dispatch custom event for other parts of app to listen
    window.dispatchEvent(new CustomEvent('networkStatusChanged', {
      detail: { isOnline: false }
    }));
  }

  /**
   * Periodically check connection by attempting to fetch a small resource
   * This helps detect when connection is lost but events haven't fired yet
   */
  async checkConnection() {
    try {
      // Use a HEAD request to /favicon.ico (small resource)
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (!this.isOnline && response.ok) {
        // We just came back online
        this.handleOnline();
      }
    } catch (error) {
      // Fetch failed - likely offline
      if (this.isOnline) {
        this.handleOffline();
      }
    }
  }

  /**
   * Get current online status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      status: this.isOnline ? 'Online' : 'Offline'
    };
  }

  /**
   * Check if connection is available
   * Returns true if online, false if offline
   */
  isConnected() {
    return this.isOnline;
  }

  /**
   * Destroy/cleanup network status manager
   */
  destroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());

    this.isInitialized = false;
  }
}

// Create singleton instance
export const networkStatusManager = new NetworkStatusManager();

// Auto-initialize when module loads (if in browser environment)
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      networkStatusManager.init();
    });
  } else {
    networkStatusManager.init();
  }
}

export default networkStatusManager;
