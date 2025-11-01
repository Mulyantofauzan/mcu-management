/**
 * Data Master Page - CRUD for Job Titles, Departments, Vendors, Doctors
 */

import { authService } from '../services/authService.js';
import { masterDataService } from '../services/masterDataService.js';
import { showToast, openModal, closeModal, confirmDialog } from '../utils/uiHelpers.js';

let currentTab = 'jobTitles';
let currentData = [];
let editingId = null;

const tabConfig = {
    jobTitles: { title: 'Jabatan', getAll: () => masterDataService.getAllJobTitles(), create: (d) => masterDataService.createJobTitle(d), update: (id, d) => masterDataService.updateJobTitle(id, d), delete: (id) => masterDataService.deleteJobTitle(id) },
    departments: { title: 'Departemen', getAll: () => masterDataService.getAllDepartments(), create: (d) => masterDataService.createDepartment(d), update: (id, d) => masterDataService.updateDepartment(id, d), delete: (id) => masterDataService.deleteDepartment(id) },
    vendors: { title: 'Vendor', getAll: () => masterDataService.getAllVendors(), create: (d) => masterDataService.createVendor(d), update: (id, d) => masterDataService.updateVendor(id, d), delete: (id) => masterDataService.deleteVendor(id) },
    doctors: { title: 'Dokter', getAll: () => masterDataService.getAllDoctors(), create: (d) => masterDataService.createDoctor(d), update: (id, d) => masterDataService.updateDoctor(id, d), delete: (id) => masterDataService.deleteDoctor(id) }
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

        // Show page content after initialization complete
        document.body.classList.add('initialized');
    } catch (error) {
        console.error('Initialization error:', error);
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

        // Debug log loaded data
        console.log(`📥 Loaded ${currentTab}:`, {
            count: currentData.length,
            sample: currentData[0],
            allIds: currentData.map(item => ({
                id: item.id,
                jobTitleId: item.jobTitleId,
                departmentId: item.departmentId,
                vendorId: item.vendorId,
                name: item.name
            }))
        });

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

    let html = '<div class="table-container"><table class="table"><thead><tr><th>ID</th><th>Nama</th><th>Aksi</th></tr></thead><tbody>';

    currentData.forEach(item => {
        // Supabase master data uses numeric id as primary key
        html += '<tr>';
        html += `<td><span class="text-sm text-gray-600">${item.id}</span></td>`;
        html += `<td><span class="font-medium text-gray-900">${item.name}</span></td>`;
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
    ['jobTitles', 'departments', 'vendors'].forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        if (t === tab) {
            tabEl.className = 'px-4 py-2 font-medium text-primary-600 border-b-2 border-primary-600';
        } else {
            tabEl.className = 'px-4 py-2 font-medium text-gray-500 hover:text-gray-700';
        }
    });

    document.getElementById('tab-title').textContent = tabConfig[tab].title;
    await loadData();
};

window.openAddModal = function() {
    editingId = null;
    document.getElementById('modal-title').textContent = `Tambah ${tabConfig[currentTab].title}`;
    document.getElementById('crud-form').reset();
    document.getElementById('item-id').value = '';
    openModal('crud-modal');
};

window.closeCrudModal = function() {
    closeModal('crud-modal');
};

window.editItem = async function(id) {
    // Supabase master data uses numeric id as primary key
    const item = currentData.find(i => i.id === id);

    if (!item) {
        console.error('❌ Item NOT FOUND:', {
            searchId: id,
            currentTab: currentTab,
            allItems: currentData.map(i => ({ id: i.id, name: i.name }))
        });
        showToast('Data tidak ditemukan', 'error');
        return;
    }

    editingId = item.id;
    document.getElementById('modal-title').textContent = `Edit ${tabConfig[currentTab].title}`;
    document.getElementById('item-id').value = editingId;
    document.getElementById('item-name').value = item.name;

    openModal('crud-modal');
};

window.handleSubmit = async function(event) {
    event.preventDefault();

    const name = document.getElementById('item-name').value;
    const config = tabConfig[currentTab];

    try {
        if (editingId) {
            // Update
            await config.update(editingId, { name });
            showToast('Data berhasil diupdate', 'success');
        } else {
            // Create
            await config.create({ name });
            showToast('Data berhasil ditambahkan', 'success');
        }

        closeCrudModal();
        await loadData();
    } catch (error) {

        showToast('Gagal menyimpan: ' + error.message, 'error');
    }
};

window.deleteItem = function(id) {
    confirmDialog(
        `Apakah Anda yakin ingin menghapus data ini? Data yang sedang digunakan tidak dapat dihapus.`,
        async () => {
            try {
                const config = tabConfig[currentTab];
                await config.delete(id);
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

init();
