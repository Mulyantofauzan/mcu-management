/**
 * Lab Result Widget Component
 * Untuk menampilkan dan manage lab results secara dinamis di form MCU
 */

import { labService } from '../services/labService.js';
import { showToast } from '../utils/uiHelpers.js';

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
            console.log(`✅ LabResultWidget initialized with ${this.labItems.length} lab items`);
            return true;
        } catch (error) {
            console.error('❌ Error initializing LabResultWidget:', error);
            return false;
        }
    }

    /**
     * Add new lab result form ke container
     */
    addLabResultForm(resultData = null) {
        if (!this.container) {
            console.error('❌ Container not found:', this.containerId);
            return;
        }

        const resultId = `lab-result-${Date.now()}`;
        const isEdit = resultData ? true : false;

        // Build dropdown options
        const labItemOptions = this.labItems
            .map(item => `<option value="${item.id}" data-unit="${item.unit}" data-min="${item.min_range_reference}" data-max="${item.max_range_reference}">${item.name}</option>`)
            .join('');

        const formHTML = `
            <div id="${resultId}" class="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <!-- Pemeriksaan Dropdown -->
                    <div>
                        <label class="label text-sm">Pemeriksaan <span class="text-danger">*</span></label>
                        <select class="input lab-item-select" data-result-id="${resultId}" required>
                            <option value="">Pilih Pemeriksaan...</option>
                            ${labItemOptions}
                        </select>
                    </div>

                    <!-- Nilai -->
                    <div>
                        <label class="label text-sm">Nilai <span class="text-danger">*</span></label>
                        <input type="number" step="0.01" class="input lab-value-input" data-result-id="${resultId}" placeholder="Nilai hasil" required />
                    </div>

                    <!-- Satuan (auto-filled, readonly) -->
                    <div>
                        <label class="label text-sm">Satuan</label>
                        <input type="text" class="input lab-unit-display" data-result-id="${resultId}" readonly placeholder="Auto" />
                    </div>

                    <!-- Rentang Rujukan (auto-filled, readonly) -->
                    <div>
                        <label class="label text-sm">Rentang Rujukan</label>
                        <input type="text" class="input lab-range-display" data-result-id="${resultId}" readonly placeholder="Auto" />
                    </div>
                </div>

                <!-- Notes & Remove Button -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="md:col-span-2">
                        <label class="label text-sm">Catatan (Normal/High/Low)</label>
                        <input type="text" class="input lab-notes-input" data-result-id="${resultId}" placeholder="Misal: Normal, High, Low" />
                    </div>
                    <div class="flex items-end">
                        <button type="button" class="btn btn-danger btn-sm remove-lab-result" data-result-id="${resultId}" style="width: 100%;">Hapus</button>
                    </div>
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

        labSelect.addEventListener('change', (e) => this.handleLabItemChange(e, resultId));
        removeBtn.addEventListener('click', (e) => this.removeLabResult(e, resultId));

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

        console.log(`✅ Added lab result form: ${resultId}`);
    }

    /**
     * Handle lab item selection - auto-fill unit dan range
     */
    handleLabItemChange(event, resultId) {
        const selectedOption = event.target.selectedOptions[0];
        const unit = selectedOption.dataset.unit || '';
        const minRange = selectedOption.dataset.min || '';
        const maxRange = selectedOption.dataset.max || '';

        // Update display fields
        const unitDisplay = document.querySelector(`#${resultId} .lab-unit-display`);
        const rangeDisplay = document.querySelector(`#${resultId} .lab-range-display`);

        if (unitDisplay) unitDisplay.value = unit;
        if (rangeDisplay) rangeDisplay.value = minRange && maxRange ? `${minRange} - ${maxRange}` : '';
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
