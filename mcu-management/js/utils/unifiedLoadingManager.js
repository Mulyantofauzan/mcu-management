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
        this.displayedProgress = 0;
        this.animationFrame = null;
        this.animationResolve = null;
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

        this._cancelProgressAnimation();
        this.currentProgress = 0;
        this.displayedProgress = 0;
        this._renderProgress(0);

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
        this._cancelProgressAnimation();
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
        const target = Math.min(100, Math.max(0, percent));
        const start = this.displayedProgress;
        this.currentProgress = target;
        this._cancelProgressAnimation();

        if (start === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.displayedProgress = target;
            this._renderProgress(target);
            return Promise.resolve();
        }

        const duration = Math.min(600, Math.max(220, Math.abs(target - start) * 9));

        return new Promise(resolve => {
            let startTime = null;
            this.animationResolve = resolve;

            const animate = timestamp => {
                if (startTime === null) startTime = timestamp;

                const elapsed = Math.min(1, (timestamp - startTime) / duration);
                const eased = elapsed < 0.5
                    ? 4 * elapsed * elapsed * elapsed
                    : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;

                this.displayedProgress = start + ((target - start) * eased);
                this._renderProgress(this.displayedProgress);

                if (elapsed < 1) {
                    this.animationFrame = window.requestAnimationFrame(animate);
                    return;
                }

                this.animationFrame = null;
                this.animationResolve = null;
                this.displayedProgress = target;
                this._renderProgress(target);
                resolve();
            };

            this.animationFrame = window.requestAnimationFrame(animate);
        });
    }

    /**
     * Increment progress by percentage
     * @param {number} increment - Amount to increment (default: 10)
     */
    incrementProgress(increment = 10) {
        return this.updateProgress(this.currentProgress + increment);
    }

    _renderProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = percent + '%';
        }
        if (this.progressPercent) {
            this.progressPercent.textContent = Math.round(percent);
        }
    }

    _cancelProgressAnimation() {
        if (this.animationFrame !== null) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.animationResolve) {
            this.animationResolve();
            this.animationResolve = null;
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

        if (this.progressBar) {
            this.progressBar.style.transition = 'none';
            this.progressBar.style.willChange = 'width';
        }

        this.currentProgress = 0;
        this.displayedProgress = 0;
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
