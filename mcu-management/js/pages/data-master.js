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
 * Show save loading overlay
 */
function showSaveLoading(message = 'Menyimpan...') {
    const overlay = document.getElementById('save-loading-overlay');
    const title = document.getElementById('save-loading-title');
    if (overlay) {
        overlay.classList.remove('hidden');
        if (title) title.textContent = message;
    }
}

/**
 * Hide save loading overlay
 */
function hideSaveLoading() {
    const overlay = document.getElementById('save-loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

const tabConfig = {
    jobTitles: { title: 'Jabatan', getAll: () => masterDataService.getAllJobTitles(), create: (d) => masterDataService.createJobTitle(d), update: (id, d) => masterDataService.updateJobTitle(id, d), delete: (id) => masterDataService.deleteJobTitle(id) },
    departments: { title: 'Departemen', getAll: () => masterDataService.getAllDepartments(), create: (d) => masterDataService.createDepartment(d), update: (id, d) => masterDataService.updateDepartment(id, d), delete: (id) => masterDataService.deleteDepartment(id) },
    vendors: { title: 'Vendor', getAll: () => masterDataService.getAllVendors(), create: (d) => masterDataService.createVendor(d), update: (id, d) => masterDataService.updateVendor(id, d), delete: (id) => masterDataService.deleteVendor(id) },
    doctors: { title: 'Dokter', getAll: () => masterDataService.getAllDoctors(), create: (d) => masterDataService.createDoctor(d), update: (id, d) => masterDataService.updateDoctor(id, d), delete: (id) => masterDataService.deleteDoctor(id) },
    labItems: { title: 'Item Pemeriksaan Lab', getAll: () => labService.getAllLabItems(), create: (d) => labService.createLabItem(d), update: (id, d) => labService.updateLabItem(id, d), delete: (id) => labService.deleteLabItem(id) }
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
    ['jobTitles', 'departments', 'vendors', 'doctors', 'labItems'].forEach(t => {
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

    // Clear all field containers except item-name
    const existingFields = formBody.querySelectorAll('div:not(:has(#item-name))');
    existingFields.forEach(field => {
        if (!field.classList.contains('modal-footer')) {
            field.remove();
        }
    });

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
        showSaveLoading('Menyimpan data...');

        if (editingId) {
            // Update
            await config.update(editingId, formData, currentUser);
            hideSaveLoading();
            showToast('Data berhasil diupdate', 'success');
        } else {
            // Create
            await config.create(formData, currentUser);
            hideSaveLoading();
            showToast('Data berhasil ditambahkan', 'success');
        }

        window.closeCrudModal();
        await loadData();
    } catch (error) {
        hideSaveLoading();
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
