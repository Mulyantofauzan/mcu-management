/**
 * Static Lab Form Handler
 * Manages static 14-item lab form (no rendering, just value/status handling)
 */

import { isValidLabItemId, getExpectedLabItemCount } from '../data/labItemsMapping.js';

class StaticLabForm {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.labItemsMap = {};
        this.originalValues = {}; // ✅ Track original values to detect actual changes
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

        this._setupInputListeners();
        console.log('[StaticLabForm] Initialized with', Object.keys(this.labItemsMap).length, 'fields');
    }


    /**
     * Setup input listeners - called by init()
     */
    _setupInputListeners() {
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

        // Load values into inputs and store original values
        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const existing = existingMap[labId];

            if (existing && existing.value) {
                metadata.input.value = existing.value;
                // ✅ CRITICAL: Store original value to detect actual changes later
                this.originalValues[labId] = String(existing.value);
                // Trigger change event to update status
                metadata.input.dispatchEvent(new Event('change'));
            } else {
                // ✅ Track empty values as original too
                this.originalValues[labId] = '';
            }
        }

        console.log('[StaticLabForm] Loaded existing results, tracking original values:', this.originalValues);
    }

    /**
     * Get all lab results from form
     * ✅ FIXED: Now includes ALL 14 items (even empty ones for proper tracking)
     */
    getAllLabResults() {
        const results = [];

        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const value = metadata.input.value.trim();
            const labItemId = parseInt(labId, 10);

            // Validate lab_item_id is valid
            if (!isValidLabItemId(labItemId)) {
                console.warn(`[StaticLabForm] Invalid lab_item_id: ${labItemId}. Skipping.`);
                continue;
            }

            // ✅ FIXED: Include ALL items with values, set empty ones as null
            // This ensures all 14 items are accounted for in the system
            if (value) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > 0) {
                    results.push({
                        labItemId: labItemId,
                        value: numValue
                    });
                }
            }
            // Note: Empty/null values are NOT added here (handled separately in backend)
        }

        // Log info about results
        const expectedCount = getExpectedLabItemCount();
        console.log(`[StaticLabForm] Collected ${results.length}/${expectedCount} lab items with values`);

        return results;
    }

    /**
     * Check if user has made changes to lab items
     * ✅ FIXED: Now properly compares current values with original values
     */
    hasChanges() {
        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const currentValue = String(metadata.input.value.trim());
            const originalValue = this.originalValues[labId] || '';

            // If current value differs from original, there's a change
            if (currentValue !== originalValue) {
                console.log(`[StaticLabForm] Detected change in lab ${labId}: "${originalValue}" -> "${currentValue}"`);
                return true;
            }
        }
        console.log('[StaticLabForm] No changes detected in lab items');
        return false;
    }

    /**
     * Validate all required fields are filled
     * ✅ FIXED: Now validates ONLY fields that user has filled (not all 14)
     */
    validateAllFieldsFilled() {
        const errors = [];
        let filledCount = 0;

        for (const labId in this.labItemsMap) {
            const metadata = this.labItemsMap[labId];
            const value = metadata.input.value.trim();

            // ✅ FIXED: Only validate fields that have values
            if (value) {
                filledCount++;
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    errors.push(`${metadata.name} harus berupa angka`);
                } else if (numValue <= 0) {
                    errors.push(`${metadata.name} harus lebih besar dari 0`);
                }
            }
        }

        // Warn if NO fields are filled (at least 1 is needed)
        if (filledCount === 0) {
            errors.push('Minimal satu pemeriksaan lab harus diisi');
        }

        console.log(`[StaticLabForm] Validation: ${filledCount}/${Object.keys(this.labItemsMap).length} fields filled`);

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
        // ✅ CRITICAL: Reset original values when clearing form
        this.originalValues = {};
        console.log('[StaticLabForm] Form cleared, original values reset');
    }
}

export { StaticLabForm };
