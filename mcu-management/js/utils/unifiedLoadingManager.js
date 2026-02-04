/**
 * Unified Loading Manager
 * Provides a centralized loading state with customizable messages for MCU operations
 * Shows full-screen loading with backdrop blur during file upload + save MCU process
 */

export class UnifiedLoadingManager {
    constructor() {
        this.loadingElement = null;
        this.messageElement = null;
        this.progressBar = null;
        this.progressPercent = null;
        this.isVisible = false;
        this.currentProgress = 0;
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

        console.log('✅ Loading screen shown:', {
            message,
            isVisible: this.isVisible,
            display: this.loadingElement.style.display,
            hasHiddenClass: this.loadingElement.classList.contains('hidden')
        });
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
     * Update loading progress bar
     * @param {number} percent - Progress percentage (0-100)
     */
    updateProgress(percent) {
        this.currentProgress = Math.min(100, Math.max(0, percent));
        if (this.progressBar) {
            this.progressBar.style.width = this.currentProgress + '%';
        }
        if (this.progressPercent) {
            this.progressPercent.textContent = Math.round(this.currentProgress);
        }
        // Uncomment for detailed progress debugging:
        // console.log(`Progress: ${this.currentProgress}%`);
    }

    /**
     * Increment progress by percentage
     * @param {number} increment - Amount to increment (default: 10)
     */
    incrementProgress(increment = 10) {
        this.updateProgress(this.currentProgress + increment);
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
                    <div class="flex flex-col items-center gap-6">
                        <!-- Animated Spinner -->
                        <div class="animate-spin">
                            <svg class="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                        </div>
                        <!-- Message -->
                        <p class="text-base text-gray-900 font-semibold" id="unified-loading-message">Memproses...</p>
                        <!-- Progress Bar -->
                        <div class="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div id="unified-loading-bar" class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full" style="width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <!-- Progress Text -->
                        <p class="text-xs text-gray-600"><span id="unified-loading-percent">0</span>%</p>
                    </div>
                </div>
            `;
            document.body.appendChild(this.loadingElement);
            // Only add hidden class for dynamically created elements
            this.loadingElement.classList.add('hidden');
        }

        this.messageElement = this.loadingElement.querySelector('#unified-loading-message');
        this.progressBar = this.loadingElement.querySelector('#unified-loading-bar');
        this.progressPercent = this.loadingElement.querySelector('#unified-loading-percent');

        // Debug logging
        console.log('✅ UnifiedLoading initialized:', {
            elementFound: !!this.loadingElement,
            messageFound: !!this.messageElement,
            progressBarFound: !!this.progressBar,
            percentFound: !!this.progressPercent
        });

        this.currentProgress = 0;
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
