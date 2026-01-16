/**
 * Data Master Page - CRUD for Job Titles, Departments, Vendors, Doctors
 */

import { authService } from '../services/authService.js';
import { masterDataService } from '../services/masterDataService.js';
import { labService } from '../services/labService.js';
import { showToast, openModal, closeModal, confirmDialog } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';  // ✅ FIX: Wait for Supabase initialization
import { initSuperSearch } from '../components/superSearch.js';  // ✅ NEW: Global search

let currentTab = 'jobTitles';
let currentData = [];
let editingId = null;

// ✅ Initialize window functions immediately (before init() runs)
// This prevents onclick errors during page load
window.switchTab = async function(tab) { /* Will be overwritten by actual implementation */ };
window.openAddModal = function() { /* Will be overwritten by actual implementation */ };
window.closeCrudModal = function() { /* Will be overwritten by actual implementation */ };
window.handleSubmit = async function(event) { /* Will be overwritten by actual implementation */ };
window.editItem = async function(id) { /* Will be overwritten by actual implementation */ };
window.deleteItem = async function(id) { /* Will be overwritten by actual implementation */ };
window.handleLogout = function() { /* Will be overwritten by actual implementation */ };

/**
 * Show unified loading overlay
 */
function showUnifiedLoading(title = 'Memproses...', message = 'Mohon tunggu') {
    const overlay = document.getElementById('unified-loading-overlay');
    const titleEl = document.getElementById('unified-loading-title');
    const messageEl = document.getElementById('unified-loading-message');

    if (overlay) {
        overlay.classList.remove('hidden');
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
    }

    // Reset all steps to pending state
    resetLoadingSteps();
}

/**
 * Hide unified loading overlay
 */
function hideUnifiedLoading() {
    const overlay = document.getElementById('unified-loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/**
 * Reset loading steps
 */
function resetLoadingSteps() {
    // Reset upload step
    const uploadIcon = document.getElementById('step-upload-icon');
    const uploadLabel = document.getElementById('step-upload-label');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadProgressText = document.getElementById('upload-progress-text');

    if (uploadIcon) {
        uploadIcon.textContent = '⏳';
        uploadIcon.style.background = '#e5e7eb';
        uploadIcon.style.color = '#6b7280';
    }
    if (uploadLabel) {
        uploadLabel.style.color = '#6b7280';
    }
    if (uploadProgressBar) {
        uploadProgressBar.style.display = 'none';
    }
    if (uploadProgressText) {
        uploadProgressText.style.display = 'none';
    }

    // Reset save step
    const saveIcon = document.getElementById('step-save-icon');
    const saveLabel = document.getElementById('step-save-label');

    if (saveIcon) {
        saveIcon.textContent = '⏳';
        saveIcon.style.background = '#e5e7eb';
        saveIcon.style.color = '#6b7280';
    }
    if (saveLabel) {
        saveLabel.style.color = '#6b7280';
    }
}

/**
 * Start upload step
 */
function startUploadStep(fileCount) {
    const uploadIcon = document.getElementById('step-upload-icon');
    const uploadLabel = document.getElementById('step-upload-label');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadProgressText = document.getElementById('upload-progress-text');

    if (uploadIcon) {
        uploadIcon.textContent = '⏳';
        uploadIcon.style.background = '#fbbf24';
        uploadIcon.style.color = '#92400e';
    }
    if (uploadLabel) {
        uploadLabel.style.color = '#1f2937';
    }
    if (uploadProgressBar && fileCount > 0) {
        uploadProgressBar.style.display = 'block';
    }
    if (uploadProgressText && fileCount > 0) {
        uploadProgressText.style.display = 'block';
        uploadProgressText.textContent = `0 dari ${fileCount} file`;
    }
}

/**
 * Update upload progress
 */
function updateUploadProgress(current, total) {
    const progressFill = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-text');

    if (progressFill) {
        const percentage = (current / total) * 100;
        progressFill.style.width = percentage + '%';
    }
    if (progressText) {
        progressText.textContent = `${current} dari ${total} file`;
    }
}

/**
 * Complete upload step
 */
function completeUploadStep() {
    const uploadIcon = document.getElementById('step-upload-icon');
    const uploadLabel = document.getElementById('step-upload-label');

    if (uploadIcon) {
        uploadIcon.textContent = '✓';
        uploadIcon.style.background = '#d1fae5';
        uploadIcon.style.color = '#059669';
    }
    if (uploadLabel) {
        uploadLabel.style.color = '#059669';
    }
}

/**
 * Start save step
 */
function startSaveStep() {
    const saveIcon = document.getElementById('step-save-icon');
    const saveLabel = document.getElementById('step-save-label');

    if (saveIcon) {
        saveIcon.textContent = '⏳';
        saveIcon.style.background = '#fbbf24';
        saveIcon.style.color = '#92400e';
    }
    if (saveLabel) {
        saveLabel.style.color = '#1f2937';
    }
}

/**
 * Complete save step
 */
function completeSaveStep() {
    const saveIcon = document.getElementById('step-save-icon');
    const saveLabel = document.getElementById('step-save-label');

    if (saveIcon) {
        saveIcon.textContent = '✓';
        saveIcon.style.background = '#d1fae5';
        saveIcon.style.color = '#059669';
    }
    if (saveLabel) {
        saveLabel.style.color = '#059669';
    }
}

const tabConfig = {
    jobTitles: { title: 'Jabatan', getAll: () => masterDataService.getAllJobTitles(), create: (d) => masterDataService.createJobTitle(d), update: (id, d) => masterDataService.updateJobTitle(id, d), delete: (id) => masterDataService.deleteJobTitle(id) },
    departments: { title: 'Departemen', getAll: () => masterDataService.getAllDepartments(), create: (d) => masterDataService.createDepartment(d), update: (id, d) => masterDataService.updateDepartment(id, d), delete: (id) => masterDataService.deleteDepartment(id) },
    vendors: { title: 'Vendor', getAll: () => masterDataService.getAllVendors(), create: (d) => masterDataService.createVendor(d), update: (id, d) => masterDataService.updateVendor(id, d), delete: (id) => masterDataService.deleteVendor(id) },
    doctors: { title: 'Dokter', getAll: () => masterDataService.getAllDoctors(), create: (d) => masterDataService.createDoctor(d), update: (id, d) => masterDataService.updateDoctor(id, d), delete: (id) => masterDataService.deleteDoctor(id) },
    labItems: { title: 'Item Pemeriksaan Lab', getAll: () => labService.getAllLabItems(), create: (d) => labService.createLabItem(d), update: (id, d) => labService.updateLabItem(id, d), delete: (id) => labService.deleteLabItem(id) },
    diseases: { title: 'Penyakit', getAll: () => masterDataService.getAllDiseases(), create: (d) => masterDataService.createDisease(d), update: (id, d) => masterDataService.updateDisease(id, d), delete: (id) => masterDataService.deleteDisease(id) }
};

async function init() {
    try {
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Wait for sidebar to load before updating user info

        updateUserInfo();
        await loadData();

        // ✅ NEW: Initialize Super Search (Cmd+K global search)
        try {
            await initSuperSearch();
        } catch (error) {
        }

        // Show page content after initialization complete
        document.body.classList.add('initialized');
    } catch (error) {
        showToast('Error initializing page: ' + error.message, 'error');
        // Still show page even on error
        document.body.classList.add('initialized');
    }
}

function updateUserInfo() {
    const user = authService.getCurrentUser();
    if (user) {
        // Store user globally
        window.currentUser = user;

        // Safely access user properties with fallbacks
        const displayName = user?.displayName || user?.name || user?.username || 'User';
        const role = user?.role || 'Petugas';
        const initial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';

        // Safe DOM access with null checks
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = displayName;
        }

        const userRoleEl = document.getElementById('user-role');
        if (userRoleEl) {
            userRoleEl.textContent = role;
        }

        const userInitialEl = document.getElementById('user-initial');
        if (userInitialEl) {
            userInitialEl.textContent = initial;
        }

        // Initialize sidebar - handles permission checks internally
        if (typeof initializeSidebar === 'function') {
            initializeSidebar(user);
        }

        // Apply permission checks to show/hide admin menus
        if (typeof hideAdminMenus === 'function') {
            hideAdminMenus(user);
        }
    }
}

async function loadData() {
    try {
        const config = tabConfig[currentTab];
        currentData = await config.getAll();

        renderTable();
    } catch (error) {

        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

function renderTable() {
    const container = document.getElementById('data-table');

    if (currentData.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Belum ada data</p>';
        return;
    }

    let html = '<div class="table-container"><table class="table"><thead><tr>';

    // Dynamic columns berdasarkan tab
    if (currentTab === 'labItems') {
        html += '<th>Nama</th><th>Satuan</th><th>Rentang Min-Max</th><th>Status</th><th>Aksi</th>';
    } else if (currentTab === 'jobTitles') {
        html += '<th>ID</th><th>Nama</th><th>Tingkat Risiko</th><th>Aksi</th>';
    } else if (currentTab === 'diseases') {
        html += '<th>ID</th><th>Nama</th><th>Kategori</th><th>Kode ICD-10</th><th>Status</th><th>Aksi</th>';
    } else {
        html += '<th>ID</th><th>Nama</th><th>Aksi</th>';
    }

    html += '</tr></thead><tbody>';

    currentData.forEach(item => {
        html += '<tr>';

        if (currentTab === 'labItems') {
            // labItems columns
            html += `<td><span class="font-medium text-gray-900">${item.name}</span></td>`;
            html += `<td><span class="text-sm text-gray-600">${item.unit || '-'}</span></td>`;
            html += `<td><span class="text-sm text-gray-600">${item.min_range_reference || '-'} - ${item.max_range_reference || '-'}</span></td>`;
            html += `<td><span class="text-sm ${item.is_active ? 'text-green-600' : 'text-red-600'}">${item.is_active ? 'Aktif' : 'Tidak Aktif'}</span></td>`;
        } else if (currentTab === 'jobTitles') {
            // Job titles columns dengan risk_level
            html += `<td><span class="text-sm text-gray-600">${item.id}</span></td>`;
            html += `<td><span class="font-medium text-gray-900">${item.name}</span></td>`;
            const riskLevel = item.risk_level || 'moderate';
            const riskLevelDisplay = riskLevel === 'low' ? 'Rendah' : riskLevel === 'high' ? 'Tinggi' : 'Sedang';
            const riskColor = riskLevel === 'low' ? 'text-green-600' : riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600';
            html += `<td><span class="text-sm font-medium ${riskColor}">${riskLevelDisplay}</span></td>`;
        } else if (currentTab === 'diseases') {
            // Diseases columns dengan category, ICD-10 code, dan status
            html += `<td><span class="text-sm text-gray-600">${item.id}</span></td>`;
            html += `<td><span class="font-medium text-gray-900">${item.name}</span></td>`;
            const categoryMap = { cardiovascular: 'Kardiovaskular', metabolic: 'Metabolik', respiratory: 'Respirasi', infectious: 'Infeksi', cancer: 'Kanker', other: 'Lainnya' };
            html += `<td><span class="text-sm text-gray-600">${categoryMap[item.category] || item.category}</span></td>`;
            html += `<td><span class="text-sm text-gray-600">${item.icd_10_code || '-'}</span></td>`;
            html += `<td><span class="text-sm ${item.is_active ? 'text-green-600' : 'text-red-600'}">${item.is_active ? 'Aktif' : 'Tidak Aktif'}</span></td>`;
        } else {
            // Standard columns untuk master data lainnya
            html += `<td><span class="text-sm text-gray-600">${item.id}</span></td>`;
            html += `<td><span class="font-medium text-gray-900">${item.name}</span></td>`;
        }

        html += `<td><div class="flex gap-2">`;
        html += `<button onclick="window.editItem(${item.id})" class="btn btn-sm btn-secondary">Edit</button>`;
        html += `<button onclick="window.deleteItem(${item.id})" class="btn btn-sm btn-danger">Hapus</button>`;
        html += `</div></td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

window.switchTab = async function(tab) {
    currentTab = tab;

    // Update tab styling
    ['jobTitles', 'departments', 'vendors', 'doctors', 'labItems', 'diseases'].forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        if (tabEl) {
            if (t === tab) {
                tabEl.className = 'px-4 py-2 font-medium text-primary-600 border-b-2 border-primary-600';
            } else {
                tabEl.className = 'px-4 py-2 font-medium text-gray-500 hover:text-gray-700';
            }
        }
    });

    document.getElementById('tab-title').textContent = tabConfig[tab].title;
    await loadData();
};

window.openAddModal = function() {
    editingId = null;
    document.getElementById('modal-title').textContent = `Tambah ${tabConfig[currentTab].title}`;
    setupFormFields();
    document.getElementById('crud-form').reset();
    document.getElementById('item-id').value = '';
    openModal('crud-modal');
};

function setupFormFields() {
    const formBody = document.querySelector('.modal-body form');

    // Hide conditional fields by default
    const riskLevelField = document.getElementById('risk-level-field');
    const categoryField = document.getElementById('category-field');
    const icd10Field = document.getElementById('icd10-field');
    const activeField = document.getElementById('active-field');

    if (riskLevelField) riskLevelField.classList.add('hidden');
    if (categoryField) categoryField.classList.add('hidden');
    if (icd10Field) icd10Field.classList.add('hidden');
    if (activeField) activeField.classList.add('hidden');

    // Setup fields untuk jobTitles (show risk_level field)
    if (currentTab === 'jobTitles') {
        if (riskLevelField) {
            riskLevelField.classList.remove('hidden');
        }
        const riskLevelSelect = document.getElementById('item-risk-level');
        if (riskLevelSelect) {
            riskLevelSelect.value = 'moderate';
        }
    }

    // Setup fields untuk diseases (show category, icd10, active fields)
    if (currentTab === 'diseases') {
        if (categoryField) categoryField.classList.remove('hidden');
        if (icd10Field) icd10Field.classList.remove('hidden');
        if (activeField) activeField.classList.remove('hidden');

        const categorySelect = document.getElementById('item-category');
        const activeSelect = document.getElementById('item-active');
        if (categorySelect) categorySelect.value = '';
        if (activeSelect) activeSelect.value = 'true';
    }

    // Setup fields untuk labItems
    if (currentTab === 'labItems') {
        const nameDiv = document.querySelector('#item-name').parentElement;

        // Insert fields setelah nama
        const descDiv = document.createElement('div');
        descDiv.innerHTML = `<label class="label">Deskripsi</label><textarea id="item-description" class="input" rows="2"></textarea>`;
        nameDiv.parentElement.insertBefore(descDiv, nameDiv.nextElementSibling);

        const unitDiv = document.createElement('div');
        unitDiv.innerHTML = `<label class="label">Satuan <span class="text-danger">*</span></label><input type="text" id="item-unit" class="input" required />`;
        descDiv.parentElement.insertBefore(unitDiv, descDiv.nextElementSibling);

        const minDiv = document.createElement('div');
        minDiv.innerHTML = `<label class="label">Rentang Rujukan Min</label><input type="number" id="item-min-range" class="input" step="0.01" />`;
        unitDiv.parentElement.insertBefore(minDiv, unitDiv.nextElementSibling);

        const maxDiv = document.createElement('div');
        maxDiv.innerHTML = `<label class="label">Rentang Rujukan Max</label><input type="number" id="item-max-range" class="input" step="0.01" />`;
        minDiv.parentElement.insertBefore(maxDiv, minDiv.nextElementSibling);

        const statusDiv = document.createElement('div');
        statusDiv.innerHTML = `<label class="label"><input type="checkbox" id="item-is-active" checked class="mr-2" /> Aktif</label>`;
        maxDiv.parentElement.insertBefore(statusDiv, maxDiv.nextElementSibling);
    }
}

window.closeCrudModal = function() {
    closeModal('crud-modal');
};

window.editItem = async function(id) {
    // Supabase master data uses numeric id as primary key
    const item = currentData.find(i => i.id === id);

    if (!item) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }

    editingId = item.id;
    document.getElementById('modal-title').textContent = `Edit ${tabConfig[currentTab].title}`;
    document.getElementById('item-id').value = editingId;

    setupFormFields();

    document.getElementById('item-name').value = item.name;

    // Populate risk_level field untuk jobTitles
    if (currentTab === 'jobTitles') {
        const riskLevelEl = document.getElementById('item-risk-level');
        if (riskLevelEl) {
            riskLevelEl.value = item.risk_level || 'moderate';
        }
    }

    // Populate diseases fields jika ada
    if (currentTab === 'diseases') {
        const categoryEl = document.getElementById('item-category');
        if (categoryEl) categoryEl.value = item.category || '';

        const icd10El = document.getElementById('item-icd10');
        if (icd10El) icd10El.value = item.icd_10_code || '';

        const activeEl = document.getElementById('item-active');
        if (activeEl) activeEl.value = item.is_active ? 'true' : 'false';
    }

    // Populate labItems fields jika ada
    if (currentTab === 'labItems') {
        const descEl = document.getElementById('item-description');
        if (descEl) descEl.value = item.description || '';

        const unitEl = document.getElementById('item-unit');
        if (unitEl) unitEl.value = item.unit || '';

        const minEl = document.getElementById('item-min-range');
        if (minEl) minEl.value = item.min_range_reference || '';

        const maxEl = document.getElementById('item-max-range');
        if (maxEl) maxEl.value = item.max_range_reference || '';

        const statusEl = document.getElementById('item-is-active');
        if (statusEl) statusEl.checked = item.is_active !== false;
    }

    openModal('crud-modal');
};

window.handleSubmit = async function(event) {
    event.preventDefault();

    const config = tabConfig[currentTab];
    let formData = { name: document.getElementById('item-name').value };

    // Special handling untuk jobTitles dengan risk_level
    if (currentTab === 'jobTitles') {
        const riskLevelEl = document.getElementById('item-risk-level');
        formData = {
            name: document.getElementById('item-name').value,
            riskLevel: riskLevelEl?.value || 'moderate'
        };
    }

    // Special handling untuk diseases dengan category, icd10, dan status
    if (currentTab === 'diseases') {
        const categoryEl = document.getElementById('item-category');
        const icd10El = document.getElementById('item-icd10');
        const activeEl = document.getElementById('item-active');

        if (!categoryEl?.value) {
            showToast('Kategori harus dipilih', 'error');
            return;
        }

        formData = {
            name: document.getElementById('item-name').value,
            category: categoryEl.value,
            icd10Code: icd10El?.value || null,
            isActive: activeEl?.value === 'true'
        };
    }

    // Special handling untuk labItems dengan fields tambahan
    if (currentTab === 'labItems') {
        formData = {
            name: document.getElementById('item-name').value,
            description: document.getElementById('item-description')?.value || null,
            unit: document.getElementById('item-unit').value,
            minRangeReference: document.getElementById('item-min-range')?.value || null,
            maxRangeReference: document.getElementById('item-max-range')?.value || null,
            isActive: document.getElementById('item-is-active')?.checked !== false
        };
    }

    try {
        const currentUser = authService.getCurrentUser();
        showUnifiedLoading('Menyimpan data...', 'Mohon tunggu');
        startSaveStep();

        if (editingId) {
            // Update
            await config.update(editingId, formData, currentUser);
            completeSaveStep();
            hideUnifiedLoading();
            showToast('Data berhasil diupdate', 'success');
        } else {
            // Create
            await config.create(formData, currentUser);
            completeSaveStep();
            hideUnifiedLoading();
            showToast('Data berhasil ditambahkan', 'success');
        }

        window.closeCrudModal();
        await loadData();
    } catch (error) {
        hideUnifiedLoading();
        showToast('Gagal menyimpan: ' + error.message, 'error');
    }
};

window.deleteItem = function(id) {
    confirmDialog(
        `Apakah Anda yakin ingin menghapus data ini? Data yang sedang digunakan tidak dapat dihapus.`,
        async () => {
            try {
                const config = tabConfig[currentTab];
                // ✅ FIX: Pass currentUser to delete function for activity logging
                const currentUser = authService.getCurrentUser();
                await config.delete(id, currentUser);
                showToast('Data berhasil dihapus', 'success');
                await loadData();
            } catch (error) {

                showToast('Gagal menghapus: ' + error.message, 'error');
            }
        }
    );
};

window.handleLogout = function() {
    authService.logout();
};

// ✅ FIX: Wait for Supabase to be ready before initializing
supabaseReady.then(() => {
  init();
}).catch(err => {
  init();
});
