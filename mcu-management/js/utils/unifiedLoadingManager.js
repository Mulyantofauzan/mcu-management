/**
 * Unified Loading Manager
 * Provides a centralized loading state with customizable messages for MCU operations
 * Shows full-screen loading with backdrop blur during file upload + save MCU process
 */

export class UnifiedLoadingManager {
    constructor() {
        this.loadingElement = null;
        this.messageElement = null;
        this.isVisible = false;
    }

    /**
     * Show loading screen with optional custom message
     * @param {string} message - Loading message (default: "Memproses...")
     */
    show(message = 'Memproses...') {
        if (!this.loadingElement) {
            this._createLoadingElement();
        }

        if (this.messageElement) {
            this.messageElement.textContent = message;
        }

        // Show using both methods for compatibility
        this.loadingElement.classList.remove('hidden');
        this.loadingElement.style.display = 'flex';
        this.isVisible = true;
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide loading screen
     */
    hide() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
            this.loadingElement.style.display = 'none';
        }
        this.isVisible = false;
        document.body.style.overflow = 'auto';
    }

    /**
     * Update loading message while visible
     * @param {string} message - New message to display
     */
    updateMessage(message) {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    /**
     * Create the loading element
     * @private
     */
    _createLoadingElement() {
        // Try to use existing element from HTML first (for dashboard)
        this.loadingElement = document.getElementById('unified-loading-overlay');

        // If not found, create a new one (for other pages)
        if (!this.loadingElement) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.id = 'unified-loading-manager';
            this.loadingElement.innerHTML = `
                <div class="fixed top-0 left-0 right-0 bottom-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div class="flex flex-col items-center gap-4">
                        <!-- Animated Spinner -->
                        <div class="animate-spin">
                            <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <!-- Message -->
                        <p class="text-sm text-gray-700 font-medium" id="unified-loading-message">Memproses...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(this.loadingElement);
        }

        this.messageElement = this.loadingElement.querySelector('#unified-loading-message');
        this.loadingElement.classList.add('hidden');
    }

    /**
     * Check if loading is currently visible
     */
    isShowing() {
        return this.isVisible;
    }
}

// Export singleton instance
export const unifiedLoading = new UnifiedLoadingManager();
