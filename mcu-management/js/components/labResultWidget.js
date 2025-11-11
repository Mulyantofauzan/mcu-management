/**
 * Lab Result Widget Component
 * Untuk menampilkan dan manage lab results secara dinamis di form MCU
 */

import { labService } from '../services/labService.js';

class LabResultWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.labItems = [];
        this.results = [];
    }

    /**
     * Initialize widget - load lab items dari master data
     */
    async init() {
        try {
            this.labItems = await labService.getAllLabItems();
            return true;
        } catch (error) {
            console.error('Error initializing LabResultWidget:', error);
            return false;
        }
    }

    /**
     * Add new lab result form ke container
     */
    addLabResultForm(resultData = null) {
        if (!this.container) {
            console.error('Container not found:', this.containerId);
            return;
        }

        const resultId = `lab-result-${Date.now()}`;
        const isEdit = resultData ? true : false;

        // Build dropdown options
        const labItemOptions = this.labItems
            .map(item => `<option value="${item.id}" data-unit="${item.unit}" data-min="${item.min_range_reference}" data-max="${item.max_range_reference}">${item.name}</option>`)
            .join('');

        const formHTML = `
            <div id="${resultId}" class="flex flex-wrap items-end gap-2 mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                <!-- Pemeriksaan Dropdown -->
                <div class="flex-1 min-w-48">
                    <label class="label text-xs block mb-1">Pemeriksaan <span class="text-danger">*</span></label>
                    <select class="input lab-item-select text-sm w-full" data-result-id="${resultId}" required>
                        <option value="">Pilih...</option>
                        ${labItemOptions}
                    </select>
                </div>

                <!-- Nilai -->
                <div class="w-20">
                    <label class="label text-xs block mb-1">Nilai <span class="text-danger">*</span></label>
                    <input type="number" step="0.01" class="input lab-value-input text-sm w-full" data-result-id="${resultId}" placeholder="0.00" required />
                </div>

                <!-- Satuan (readonly) -->
                <div class="w-20">
                    <label class="label text-xs block mb-1">Satuan</label>
                    <input type="text" class="input lab-unit-display text-sm w-full" data-result-id="${resultId}" readonly />
                </div>

                <!-- Rentang (readonly) -->
                <div class="w-24">
                    <label class="label text-xs block mb-1">Rentang</label>
                    <input type="text" class="input lab-range-display text-sm w-full" data-result-id="${resultId}" readonly />
                </div>

                <!-- Catatan (readonly) -->
                <div class="w-20">
                    <label class="label text-xs block mb-1">Catatan</label>
                    <input type="text" class="input lab-notes-input text-sm w-full" data-result-id="${resultId}" readonly />
                </div>

                <!-- Remove Button -->
                <div class="w-10">
                    <button type="button" class="btn btn-danger btn-sm remove-lab-result w-full" data-result-id="${resultId}">-</button>
                </div>
            </div>
        `;

        // Append to container
        const resultElement = document.createElement('div');
        resultElement.innerHTML = formHTML;
        this.container.appendChild(resultElement.firstElementChild);

        // Attach event listeners
        const labSelect = document.querySelector(`#${resultId} .lab-item-select`);
        const removeBtn = document.querySelector(`#${resultId} .remove-lab-result`);

        if (labSelect) labSelect.addEventListener('change', (e) => this.handleLabItemChange(e, resultId));
        if (removeBtn) removeBtn.addEventListener('click', (e) => this.removeLabResult(e, resultId));

        // Populate jika edit
        if (isEdit && resultData) {
            this.populateLabResult(resultId, resultData);
        }

        // Store reference
        this.results.push({
            id: resultId,
            element: document.getElementById(resultId),
            data: resultData || null
        });
    }

    /**
     * Handle lab item selection - auto-fill unit, range, dan update catatan
     */
    handleLabItemChange(event, resultId) {
        const selectedOption = event.target.selectedOptions[0];
        const unit = selectedOption.dataset.unit || '';
        const minRange = parseFloat(selectedOption.dataset.min) || null;
        const maxRange = parseFloat(selectedOption.dataset.max) || null;

        // Update display fields
        const unitDisplay = document.querySelector(`#${resultId} .lab-unit-display`);
        const rangeDisplay = document.querySelector(`#${resultId} .lab-range-display`);

        if (unitDisplay) unitDisplay.value = unit;
        if (rangeDisplay) rangeDisplay.value = minRange !== null && maxRange !== null ? `${minRange} - ${maxRange}` : '';

        // Add value input listener untuk auto-update catatan
        const valueInput = document.querySelector(`#${resultId} .lab-value-input`);
        if (valueInput) {
            valueInput.removeEventListener('change', this.autoFillNotes);
            valueInput.addEventListener('change', () => this.autoFillNotes(resultId, minRange, maxRange));
            // Also trigger on input event untuk real-time update
            valueInput.addEventListener('input', () => this.autoFillNotes(resultId, minRange, maxRange));
        }

        // Trigger initial notes update jika ada nilai
        this.autoFillNotes(resultId, minRange, maxRange);
    }

    /**
     * Auto-fill notes berdasarkan nilai dan rentang rujukan
     * Normal = dalam rentang, High = > max, Low = < min
     */
    autoFillNotes(resultId, minRange, maxRange) {
        const valueInput = document.querySelector(`#${resultId} .lab-value-input`);
        const notesInput = document.querySelector(`#${resultId} .lab-notes-input`);

        if (!valueInput || !notesInput) return;

        const value = parseFloat(valueInput.value);
        let status = '';

        // Tentukan status berdasarkan nilai
        if (!isNaN(value) && minRange !== null && maxRange !== null) {
            if (value < minRange) {
                status = 'Low';
            } else if (value > maxRange) {
                status = 'High';
            } else {
                status = 'Normal';
            }
        }

        notesInput.value = status;
    }

    /**
     * Populate form dengan existing data (untuk edit)
     */
    populateLabResult(resultId, resultData) {
        const container = document.getElementById(resultId);
        if (!container) return;

        // Set dropdown value
        const select = container.querySelector('.lab-item-select');
        if (select && resultData.lab_item_id) {
            select.value = resultData.lab_item_id;
            // Trigger change event untuk auto-fill fields
            select.dispatchEvent(new Event('change'));
        }

        // Set nilai
        const valueInput = container.querySelector('.lab-value-input');
        if (valueInput && resultData.value) {
            valueInput.value = resultData.value;
        }

        // Set catatan
        const notesInput = container.querySelector('.lab-notes-input');
        if (notesInput && resultData.notes) {
            notesInput.value = resultData.notes;
        }
    }

    /**
     * Remove lab result form
     */
    removeLabResult(event, resultId) {
        event.preventDefault();
        const element = document.getElementById(resultId);
        if (element) {
            element.remove();
            // Remove from results array
            this.results = this.results.filter(r => r.id !== resultId);
            console.log(`✅ Removed lab result: ${resultId}`);
        }
    }

    /**
     * Get all lab results dari form
     */
    getAllLabResults() {
        const results = [];

        this.results.forEach(result => {
            const element = result.element;
            if (!element) return;

            const labItemId = element.querySelector('.lab-item-select').value;
            const value = element.querySelector('.lab-value-input').value;
            const notes = element.querySelector('.lab-notes-input').value;

            // Only include jika lab item dipilih
            if (labItemId && value) {
                results.push({
                    labItemId: parseInt(labItemId),
                    value: parseFloat(value),
                    notes: notes || null
                });
            }
        });

        return results;
    }

    /**
     * Clear all lab results
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.results = [];
    }

    /**
     * Load existing results (untuk edit MCU)
     */
    async loadExistingResults(mcuId) {
        try {
            const existing = await labService.getPemeriksaanLabByMcuId(mcuId);
            this.clear();

            existing.forEach(result => {
                this.addLabResultForm({
                    lab_item_id: result.lab_item_id,
                    value: result.value,
                    notes: result.notes
                });
            });

            console.log(`✅ Loaded ${existing.length} existing lab results for MCU: ${mcuId}`);
        } catch (error) {
            console.error('❌ Error loading existing results:', error);
        }
    }
}

/**
 * Factory function untuk create widget instance
 */
export function createLabResultWidget(containerId) {
    return new LabResultWidget(containerId);
}

export { LabResultWidget };
