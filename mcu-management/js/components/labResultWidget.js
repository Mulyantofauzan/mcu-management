/**
 * Lab Result Widget Component - Fixed 14-Item Form
 * Menampilkan form pemeriksaan lab dengan 14 item tetap
 * Semua field wajib diisi, status otomatis berdasarkan nilai vs range
 */

import { labService } from '../services/labService.js';

class LabResultWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.labItems = [];
        this.fieldValues = {}; // Store current field values: { labItemId: { value, status, notes } }
    }

    /**
     * Initialize widget - load 14 lab items dan render form
     */
    async init() {
        try {
            this.labItems = await labService.getAllLabItems();

            if (!this.labItems || this.labItems.length === 0) {
                console.error('[LabWidget] No lab items found in database');
                return false;
            }

            this.renderFixedForm();
            return true;
        } catch (error) {
            console.error('[LabWidget] Error initializing:', error);
            return false;
        }
    }

    /**
     * Render fixed 14-item form dalam grid 4 kolom (compact)
     */
    renderFixedForm() {
        if (!this.container) {
            console.error('[LabWidget] Container not found');
            return;
        }

        // Create grid container (3 columns untuk desktop, lebih hemat tempat)
        let gridHTML = '<div class="grid grid-cols-3 gap-3 mb-4">';

        // Render each lab item as fixed field (compact version)
        this.labItems.forEach(item => {
            const fieldId = `lab-field-${item.id}`;
            const valueInputId = `lab-value-${item.id}`;
            const statusId = `lab-status-${item.id}`;

            // Initialize field value storage
            this.fieldValues[item.id] = {
                labItemId: item.id,
                value: null,
                status: '',
                notes: null,
                min: item.min_range_reference,
                max: item.max_range_reference,
                unit: item.unit
            };

            gridHTML += `
                <div id="${fieldId}" class="p-2 bg-gray-50 rounded border border-gray-200">
                    <label class="label text-xs font-semibold block mb-1">${item.name} <span class="text-danger">*</span></label>
                    <input
                        type="number"
                        step="0.01"
                        id="${valueInputId}"
                        class="input lab-value-input text-xs w-full mb-1"
                        placeholder="0.00"
                        data-item-id="${item.id}"
                        data-min="${item.min_range_reference || ''}"
                        data-max="${item.max_range_reference || ''}"
                        required
                    />
                    <div class="flex gap-1 mb-1">
                        <div class="flex-1">
                            <label class="label text-xs block mb-0.5">Status</label>
                            <input
                                type="text"
                                id="${statusId}"
                                class="input lab-status-display text-xs w-full"
                                readonly
                                placeholder="-"
                            />
                        </div>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${item.unit} | ${item.min_range_reference || '-'}-${item.max_range_reference || '-'}
                    </div>
                </div>
            `;
        });

        gridHTML += '</div>';

        // Set container HTML
        this.container.innerHTML = gridHTML;

        // Attach event listeners to all value inputs
        const valueInputs = this.container.querySelectorAll('.lab-value-input');
        valueInputs.forEach(input => {
            input.addEventListener('change', (e) => this.handleValueChange(e));
            input.addEventListener('input', (e) => this.handleValueChange(e));
        });
    }

    /**
     * Handle value input change - calculate status otomatis
     */
    handleValueChange(event) {
        const input = event.target;
        const itemId = parseInt(input.dataset.itemId);
        const value = parseFloat(input.value);

        // Find the item
        const item = this.labItems.find(i => i.id === itemId);
        if (!item) return;

        // Update stored value
        this.fieldValues[itemId].value = input.value;

        // Calculate status
        let status = '';
        if (!isNaN(value) && input.value.trim() !== '') {
            const min = parseFloat(item.min_range_reference);
            const max = parseFloat(item.max_range_reference);

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

        this.fieldValues[itemId].status = status;
        this.fieldValues[itemId].notes = status;

        // Update status display
        const statusField = document.getElementById(`lab-status-${itemId}`);
        if (statusField) {
            statusField.value = status;
        }
    }

    /**
     * Load existing lab results dan populate ke fields
     */
    async loadExistingResults(mcuId) {
        try {
            if (!mcuId) {
                throw new Error('mcuId is required');
            }

            const existing = await labService.getPemeriksaanLabByMcuId(mcuId);

            // Create map of existing results by lab_item_id
            const existingMap = {};
            if (existing && Array.isArray(existing)) {
                existing.forEach(result => {
                    existingMap[result.lab_item_id] = result;
                });
            }

            // Populate fields dengan existing data
            this.labItems.forEach(item => {
                const input = document.getElementById(`lab-value-${item.id}`);
                if (input && existingMap[item.id]) {
                    const existingValue = existingMap[item.id].value;
                    input.value = existingValue;

                    // Trigger change event to calculate status
                    input.dispatchEvent(new Event('change'));
                }
            });
        } catch (error) {
            console.error('[LabWidget] Error loading existing results:', error);
            throw error;
        }
    }

    /**
     * Validate bahwa semua fields terisi dengan nilai > 0
     */
    validateAllFieldsFilled() {
        const errors = [];

        for (const itemId in this.fieldValues) {
            const field = this.fieldValues[itemId];
            const input = document.getElementById(`lab-value-${itemId}`);

            if (!input) {
                errors.push(`Field untuk item ${itemId} tidak ditemukan di DOM`);
                continue;
            }

            const value = input.value.trim();

            // Check if empty
            if (!value) {
                const item = this.labItems.find(i => i.id === parseInt(itemId));
                const itemName = item ? item.name : `Item ${itemId}`;
                errors.push(`${itemName} harus diisi`);
                continue;
            }

            // Check if valid number
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                const item = this.labItems.find(i => i.id === parseInt(itemId));
                const itemName = item ? item.name : `Item ${itemId}`;
                errors.push(`${itemName} harus berupa angka`);
                continue;
            }

            // Check if > 0
            if (numValue <= 0) {
                const item = this.labItems.find(i => i.id === parseInt(itemId));
                const itemName = item ? item.name : `Item ${itemId}`;
                errors.push(`${itemName} harus lebih besar dari 0`);
            }
        }

        return errors;
    }

    /**
     * Get all lab results dari form - dengan validasi semua terisi
     */
    getAllLabResults() {
        const results = [];

        for (const itemId in this.fieldValues) {
            const field = this.fieldValues[itemId];
            const input = document.getElementById(`lab-value-${itemId}`);

            if (!input) continue;

            const value = input.value.trim();
            if (!value) continue;

            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue <= 0) continue;

            results.push({
                labItemId: parseInt(itemId),
                value: numValue,
                notes: field.status || null
            });
        }

        return results;
    }

    /**
     * Clear form
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.fieldValues = {};
        this.labItems = [];
    }
}

/**
 * Factory function untuk create widget instance
 */
export function createLabResultWidget(containerId) {
    return new LabResultWidget(containerId);
}

export { LabResultWidget };
