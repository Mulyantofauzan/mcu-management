/**
 * Static Lab Form Handler
 * Manages static 14-item lab form (no rendering, just value/status handling)
 */

class StaticLabForm {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.labItemsMap = {};
        this.init();
    }

    /**
     * Initialize form - attach event listeners to all inputs
     */
    init() {
        if (!this.container) {
            console.error('[StaticLabForm] Container not found:', this.containerId);
            return;
        }

        const inputs = this.container.querySelectorAll('.lab-value-input');
        inputs.forEach(input => {
            const labId = input.dataset.labId;
            const labName = input.dataset.labName;
            const min = parseFloat(input.dataset.min);
            const max = parseFloat(input.dataset.max);

            // Store metadata
            this.labItemsMap[labId] = {
                name: labName,
                min,
                max,
                input: input,
                statusDisplay: input.parentElement.querySelector('.lab-status')
            };

            // Attach event listeners
            input.addEventListener('input', (e) => this.handleValueChange(e));
            input.addEventListener('change', (e) => this.handleValueChange(e));
        });

        console.log('[StaticLabForm] Initialized with', Object.keys(this.labItemsMap).length, 'fields');
    }

    /**
     * Handle value input and update status
     */
    handleValueChange(event) {
        const input = event.target;
        const labId = input.dataset.labId;
        const metadata = this.labItemsMap[labId];

        if (!metadata) return;

        const value = parseFloat(input.value);
        let status = '-';

        if (!isNaN(value) && input.value.trim() !== '') {
            const { min, max } = metadata;
            if (!isNaN(min) && !isNaN(max)) {
                if (value < min) {
                    status = 'Low';
                } else if (value > max) {
                    status = 'High';
                } else {
                    status = 'Normal';
                }
            }
        }

        // Update status display
        if (metadata.statusDisplay) {
            metadata.statusDisplay.textContent = status;
            // Add color based on status
            metadata.statusDisplay.className = 'lab-status text-xs font-medium mt-1';
            if (status === 'Normal') {
                metadata.statusDisplay.classList.add('text-green-600');
            } else if (status === 'Low') {
                metadata.statusDisplay.classList.add('text-blue-600');
            } else if (status === 'High') {
                metadata.statusDisplay.classList.add('text-red-600');
            } else {
                metadata.statusDisplay.classList.add('text-gray-700');
            }
        }
    }

    /**
     * Load existing lab values into form
     */
    loadExistingResults(existingLabResults) {
        if (!existingLabResults || !Array.isArray(existingLabResults)) {
            console.warn('[StaticLabForm] No existing results to load');
            return;
        }

        // Create map for quick lookup
        const existingMap = {};
        existingLabResults.forEach(result => {
            existingMap[result.lab_item_id] = result;
        });

        // Load values into inputs
        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const existing = existingMap[labId];

            if (existing && existing.value) {
                metadata.input.value = existing.value;
                // Trigger change event to update status
                metadata.input.dispatchEvent(new Event('change'));
            }
        }

        console.log('[StaticLabForm] Loaded', existingLabResults.length, 'existing results');
    }

    /**
     * Get all lab results from form
     */
    getAllLabResults() {
        const results = [];

        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const value = metadata.input.value.trim();

            if (value) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > 0) {
                    results.push({
                        labItemId: parseInt(labId),
                        value: numValue
                    });
                }
            }
        }

        return results;
    }

    /**
     * Check if user has made changes to lab items
     */
    hasChanges() {
        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            if (metadata.input.value.trim() !== '') {
                return true;
            }
        }
        return false;
    }

    /**
     * Validate all required fields are filled
     */
    validateAllFieldsFilled() {
        const errors = [];

        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const value = metadata.input.value.trim();

            if (!value) {
                errors.push(`${metadata.name} harus diisi`);
            } else {
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    errors.push(`${metadata.name} harus berupa angka`);
                } else if (numValue <= 0) {
                    errors.push(`${metadata.name} harus lebih besar dari 0`);
                }
            }
        }

        return errors;
    }

    /**
     * Validate all required fields are filled (alias for compatibility)
     */
    validate() {
        return this.validateAllFieldsFilled();
    }

    /**
     * Clear form
     */
    clear() {
        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            metadata.input.value = '';
            if (metadata.statusDisplay) {
                metadata.statusDisplay.textContent = '-';
                metadata.statusDisplay.className = 'lab-status text-xs font-medium text-gray-700 mt-1';
            }
        }
    }
}

export { StaticLabForm };
