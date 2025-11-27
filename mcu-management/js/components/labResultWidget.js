/**
 * Lab Result Widget Component - Fixed 14-Item Form
 * Menampilkan form pemeriksaan lab dengan 14 item tetap
 * Semua field wajib diisi, status otomatis berdasarkan nilai vs range
 */

import { labService } from '../services/labService.js';
import { isValidLabItemId, getExpectedLabItemCount } from '../data/labItemsMapping.js';

class LabResultWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.labItems = [];
        this.fieldValues = {}; // Store current field values: { labItemId: { value, status, notes } }
        this.originalValues = {}; // Store original values loaded from DB untuk detect changes
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

            // Sort items sesuai custom order
            this.sortLabItems();

            this.renderFixedForm();
            return true;
        } catch (error) {
            console.error('[LabWidget] Error initializing:', error);
            return false;
        }
    }

    /**
     * Sort lab items sesuai urutan yang diinginkan
     * Uses lab_item_id for reliable ordering (tidak tergantung nama string)
     */
    sortLabItems() {
        // Define desired order by lab_item_id (5, 6, 3, 7, 31, 8, 10, 11, 9, 32, 12, 13, 1, 2)
        // Leukosit, Trombosit, Hemoglobin, Gula Darah Puasa, Gula Darah 2 JPP,
        // Kolesterol Total, HDL, LDL, Trigliserida, Asam Urat, Ureum, Kreatinin, SGOT, SGPT
        const desiredOrder = [5, 6, 3, 7, 31, 8, 10, 11, 9, 32, 12, 13, 1, 2];

        this.labItems.sort((a, b) => {
            const indexA = desiredOrder.indexOf(a.id);
            const indexB = desiredOrder.indexOf(b.id);

            // If both found in desired order, use that order
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // If only one is found, put it first
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            // If neither found, keep original order
            return 0;
        });
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
                    <div class="mb-1">
                        <label class="label text-xs block mb-0.5">Status</label>
                        <div id="${statusId}" class="lab-status-display text-xs font-medium text-gray-700 py-1">-</div>
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
        const itemId = parseInt(input.dataset.itemId, 10);
        const value = parseFloat(input.value);

        // Validate item ID
        if (!isValidLabItemId(itemId)) {
            console.warn(`[LabWidget] Invalid lab_item_id in handleValueChange: ${itemId}`);
            return;
        }

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
            statusField.textContent = status || '-';
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

            // Populate fields dengan existing data dan store original values
            this.labItems.forEach(item => {
                const input = document.getElementById(`lab-value-${item.id}`);
                if (input && existingMap[item.id]) {
                    const existingValue = existingMap[item.id].value;
                    input.value = existingValue;

                    // Store original value untuk detect changes later
                    this.originalValues[item.id] = String(existingValue);

                    // Trigger change event to calculate status
                    input.dispatchEvent(new Event('change'));
                } else if (input) {
                    // No existing value for this item
                    this.originalValues[item.id] = '';
                }
            });
        } catch (error) {
            console.error('[LabWidget] Error loading existing results:', error);
            throw error;
        }
    }

    /**
     * Check apakah user telah membuat perubahan pada lab items
     * Return true jika ada perubahan, false jika belum ada perubahan
     */
    hasChanges() {
        for (const itemId in this.fieldValues) {
            const currentValue = document.getElementById(`lab-value-${itemId}`)?.value?.trim() || '';
            const originalValue = this.originalValues[itemId] || '';

            if (String(currentValue) !== String(originalValue)) {
                return true; // Ada perubahan
            }
        }
        return false; // Tidak ada perubahan
    }

    /**
     * Validate bahwa semua fields terisi dengan nilai > 0
     * HANYA jalankan jika user telah membuat perubahan pada lab items
     */
    validateAllFieldsFilled() {
        const errors = [];

        for (const itemId in this.fieldValues) {
            const field = this.fieldValues[itemId];
            const input = document.getElementById(`lab-value-${itemId}`);
            const numItemId = parseInt(itemId, 10);

            if (!input) {
                errors.push(`Field untuk item ${itemId} tidak ditemukan di DOM`);
                continue;
            }

            // Validate item ID
            if (!isValidLabItemId(numItemId)) {
                errors.push(`Item ID tidak valid: ${itemId}`);
                continue;
            }

            const value = input.value.trim();

            // Check if empty
            if (!value) {
                const item = this.labItems.find(i => i.id === numItemId);
                const itemName = item ? item.name : `Item ${itemId}`;
                errors.push(`${itemName} harus diisi`);
                continue;
            }

            // Check if valid number
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                const item = this.labItems.find(i => i.id === numItemId);
                const itemName = item ? item.name : `Item ${itemId}`;
                errors.push(`${itemName} harus berupa angka`);
                continue;
            }

            // Check if > 0
            if (numValue <= 0) {
                const item = this.labItems.find(i => i.id === numItemId);
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
            const labItemId = parseInt(itemId, 10);

            // Validate item ID exists in database
            if (!isValidLabItemId(labItemId)) {
                console.warn(`[LabWidget] Invalid lab_item_id in getAllLabResults: ${labItemId}. Skipping.`);
                continue;
            }

            if (isNaN(numValue) || numValue <= 0) continue;

            results.push({
                labItemId: labItemId,
                value: numValue,
                notes: field.status || null
            });
        }

        // Log warning if number of results doesn't match expected count
        const expectedCount = getExpectedLabItemCount();
        if (results.length !== expectedCount) {
            console.warn(`[LabWidget] Expected ${expectedCount} lab items, got ${results.length}`);
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
