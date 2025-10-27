/**
 * Session Management Utility
 * Handles user session timeout, activity monitoring, and auto-logout
 *
 * Features:
 * - Auto-logout after inactivity timeout (default: 30 minutes)
 * - Activity monitoring (mouse, keyboard, scroll events)
 * - Warning notification before logout
 * - Graceful session cleanup on logout
 */

class SessionManager {
  constructor(options = {}) {
    // Configuration
    this.INACTIVITY_TIMEOUT = options.timeout || 30 * 60 * 1000; // 30 minutes
    this.WARNING_TIME = options.warningTime || 5 * 60 * 1000; // 5 minutes before timeout

    // State tracking
    this.lastActivityTime = Date.now();
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.isWarningVisible = false;

    // Activity events to monitor
    this.activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Initialize
    this.init();
  }

  /**
   * Initialize session manager
   */
  init() {
    // Add event listeners for activity detection
    this.activityEvents.forEach(event => {
      document.addEventListener(event, () => this.recordActivity(), { passive: true });
    });

    // Start the inactivity timer
    this.resetTimer();
  }

  /**
   * Record user activity and reset inactivity timer
   */
  recordActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    // Only reset timer if significant time has passed (at least 1 second)
    // This prevents excessive timer resets from rapid events
    if (timeSinceLastActivity > 1000) {
      this.lastActivityTime = now;
      this.resetTimer();

      // Hide warning if it's visible
      if (this.isWarningVisible) {
        this.hideWarning();
      }
    }
  }

  /**
   * Reset the inactivity timer
   */
  resetTimer() {
    // Clear existing timers
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }

    // Set warning timer (shows warning before timeout)
    const warningDelay = this.INACTIVITY_TIMEOUT - this.WARNING_TIME;
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, warningDelay);

    // Set final logout timer
    this.inactivityTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Show inactivity warning to user
   */
  showWarning() {
    if (this.isWarningVisible) {
      return; // Already showing
    }

    this.isWarningVisible = true;

    // Create warning modal
    const warningModal = document.createElement('div');
    warningModal.id = 'session-warning-modal';
    warningModal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    warningModal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-warning-light rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-warning-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900">Session Timeout Warning</h2>
        </div>

        <p class="text-gray-600 mb-4">
          Your session will expire in <span id="countdown" class="font-semibold">5:00</span> due to inactivity.
        </p>

        <p class="text-sm text-gray-500 mb-6">
          Move your mouse, type, or click to continue your session.
        </p>

        <div class="flex gap-3">
          <button id="logout-btn" class="flex-1 btn btn-secondary">
            Logout Now
          </button>
          <button id="continue-btn" class="flex-1 btn btn-primary">
            Continue Session
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(warningModal);

    // Setup event handlers
    const logoutBtn = document.getElementById('logout-btn');
    const continueBtn = document.getElementById('continue-btn');

    logoutBtn?.addEventListener('click', () => {
      this.logout();
    });

    continueBtn?.addEventListener('click', () => {
      this.hideWarning();
      this.recordActivity();
    });

    // Update countdown timer
    this.updateCountdown();
  }

  /**
   * Update countdown timer in warning modal
   */
  updateCountdown() {
    const interval = setInterval(() => {
      const modal = document.getElementById('session-warning-modal');
      if (!modal) {
        clearInterval(interval);
        return;
      }

      const countdownEl = document.getElementById('countdown');
      if (countdownEl) {
        const timeLeft = Math.ceil((this.INACTIVITY_TIMEOUT - (Date.now() - this.lastActivityTime)) / 1000);
        if (timeLeft <= 0) {
          clearInterval(interval);
        } else {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    }, 1000);
  }

  /**
   * Hide warning modal
   */
  hideWarning() {
    const modal = document.getElementById('session-warning-modal');
    if (modal) {
      modal.remove();
    }
    this.isWarningVisible = false;
  }

  /**
   * Handle session timeout
   */
  async handleTimeout() {
    this.hideWarning();
    this.logout('Session expired due to inactivity');
  }

  /**
   * Logout user
   * @param {string} message - Custom logout message (optional)
   */
  async logout(message = null) {
    try {
      // Cleanup: Remove event listeners
      this.activityEvents.forEach(event => {
        document.removeEventListener(event, () => this.recordActivity());
      });

      // Clear session storage
      sessionStorage.clear();

      // Optional: Call logout API endpoint
      try {
        // This would be called if you have a backend logout endpoint
        // await fetch('/api/logout', { method: 'POST' });
      } catch (err) {
        // Silent fail - redirect anyway
      }

      // Show message and redirect to login
      const messageText = message || 'You have been logged out';

      // Redirect to login page
      window.location.href = 'pages/login.html?message=' + encodeURIComponent(messageText);
    } catch (err) {
      // Fallback redirect
      window.location.href = 'pages/login.html';
    }
  }

  /**
   * Destroy session manager
   */
  destroy() {
    // Clear timers
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }

    // Remove event listeners
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, () => this.recordActivity());
    });

    // Hide warning
    this.hideWarning();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager({
  timeout: 30 * 60 * 1000,        // 30 minutes
  warningTime: 5 * 60 * 1000      // Show warning 5 minutes before timeout
});

/**
 * Initialize session management for authenticated pages
 * Call this function at the start of your page init()
 * @example
 * import { initializeSessionManagement } from '../utils/sessionManager.js';
 *
 * async function init() {
 *   initializeSessionManagement();
 *   // ... rest of initialization
 * }
 */
export function initializeSessionManagement() {
  // Session manager is already initialized as singleton
  // This function just ensures it's active and provides a consistent API
  return sessionManager;
}

/**
 * Setup global logout handler for all pages
 * @param {Function} authLogout - Auth service logout function
 */
export function setupGlobalLogoutHandler(authLogout) {
  window.handleLogout = function() {
    sessionManager.logout('User initiated logout');
  };
}
