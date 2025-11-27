/**
 * Data Terhapus Page - Restore cascade & permanent delete
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';  // ✅ NEW: MCU service for deleted MCU
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay } from '../utils/dateHelpers.js';
import { showToast, confirmDialog } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';  // ✅ FIX: Wait for Supabase initialization
import { initSuperSearch } from '../components/superSearch.js';  // ✅ NEW: Global search

let deletedEmployees = [];
let deletedMCU = [];  // ✅ NEW: Deleted MCU records
let jobTitles = [];
let departments = [];
let selectedEmployees = new Set();
let selectedMCU = new Set();  // ✅ NEW: Selected deleted MCU

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
        deletedEmployees = await employeeService.getDeleted();
        deletedMCU = await mcuService.getDeleted();  // ✅ NEW: Load deleted MCU
        jobTitles = await masterDataService.getAllJobTitles();
        departments = await masterDataService.getAllDepartments();

        // ✅ FIX: Build lookup Maps once for O(1) enrichment (performance optimization)
        const jobMap = new Map(jobTitles.map(j => [j.name, j]));
        const deptMap = new Map(departments.map(d => [d.name, d]));

        // Enrich employee data with IDs using O(1) Map lookups (O(n) total instead of O(n²))
        deletedEmployees = deletedEmployees.map(emp => enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap));

        // ✅ NEW: Enrich MCU data with employee names
        // Load ALL employees (active + deleted) for proper lookup since deleted MCU might belong to active employee
        const allEmployees = await employeeService.getAll();
        const employeeMap = new Map(allEmployees.map(emp => [emp.employeeId, emp]));
        deletedMCU = deletedMCU.map(mcu => ({
            ...mcu,
            employeeName: employeeMap.get(mcu.employeeId)?.name || 'Unknown'
        }));

        document.getElementById('total-count').textContent = deletedEmployees.length;
        document.getElementById('mcu-total-count').textContent = deletedMCU.length;  // ✅ NEW: Update MCU count
        renderTable();
        renderMCUTable();  // ✅ NEW: Also render MCU table after loading data
    } catch (error) {

        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

// ✅ FIX: Optimized enrichment using Map lookups - O(1) per employee instead of O(n)
function enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap) {
    if (!emp.jobTitleId && emp.jobTitle) {
        const job = jobMap.get(emp.jobTitle);
        if (job) emp.jobTitleId = job.id;  // Use 'id' not 'jobTitleId' - Supabase format
    }
    if (!emp.departmentId && emp.department) {
        const dept = deptMap.get(emp.department);
        if (dept) emp.departmentId = dept.id;  // Use 'id' not 'departmentId' - Supabase format
    }
    return emp;
}

// ✅ DEPRECATED: Old O(n²) function kept for reference only
// function enrichEmployeeWithIds(emp) {
//     if (!emp.jobTitleId && emp.jobTitle) {
//         const job = jobTitles.find(j => j.name === emp.jobTitle);
//         if (job) emp.jobTitleId = job.id;
//     }
//     if (!emp.departmentId && emp.department) {
//         const dept = departments.find(d => d.name === emp.department);
//         if (dept) emp.departmentId = dept.id;
//     }
//     return emp;
// }

function renderTable() {
    const container = document.getElementById('deleted-table');

    if (deletedEmployees.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada data terhapus</p>';
        updateBulkButtons();
        return;
    }

    let html = '<div class="table-container"><table class="table"><thead><tr>';
    html += '<th><input type="checkbox" id="select-all" onchange="toggleSelectAll()" /></th>';
    html += '<th>Nama</th><th>ID</th><th>Jabatan</th><th>Departemen</th><th>Dihapus</th><th>Aksi</th></tr></thead><tbody>';

    deletedEmployees.forEach(emp => {
        const job = jobTitles.find(j => j.id === emp.jobTitleId);
        const dept = departments.find(d => d.id === emp.departmentId);
        const isChecked = selectedEmployees.has(emp.employeeId);

        html += '<tr>';
        html += `<td><input type="checkbox" class="row-checkbox" data-id="${emp.employeeId}" ${isChecked ? 'checked' : ''} onchange="toggleSelect('${emp.employeeId}')" /></td>`;
        html += `<td><span class="font-medium text-gray-900">${emp.name}</span></td>`;
        html += `<td><span class="text-sm text-gray-600">${emp.employeeId}</span></td>`;
        html += `<td>${job?.name || '-'}</td>`;
        html += `<td>${dept?.name || '-'}</td>`;
        html += `<td>${formatDateDisplay(emp.deletedAt)}</td>`;
        html += `<td><div class="flex gap-2">
            <button onclick="restoreEmployee('${emp.employeeId}')" class="btn btn-sm btn-success">↻ Restore</button>
            <button onclick="permanentDelete('${emp.employeeId}')" class="btn btn-sm btn-danger">🗑 Hapus Permanen</button>
        </div></td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
    updateBulkButtons();
}

window.toggleSelectAll = function() {
    const selectAllCheckbox = document.getElementById('select-all');
    const isChecked = selectAllCheckbox.checked;

    if (isChecked) {
        deletedEmployees.forEach(emp => selectedEmployees.add(emp.employeeId));
    } else {
        selectedEmployees.clear();
    }

    renderTable();
};

window.toggleSelect = function(employeeId) {
    if (selectedEmployees.has(employeeId)) {
        selectedEmployees.delete(employeeId);
    } else {
        selectedEmployees.add(employeeId);
    }

    updateBulkButtons();
};

function updateBulkButtons() {
    const count = selectedEmployees.size;
    document.getElementById('selected-count').textContent = count;

    const restoreBtn = document.getElementById('bulk-restore-btn');
    const deleteBtn = document.getElementById('bulk-delete-btn');

    if (count > 0) {
        restoreBtn.disabled = false;
        deleteBtn.disabled = false;
    } else {
        restoreBtn.disabled = true;
        deleteBtn.disabled = true;
    }

    // Update select-all checkbox state
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        if (count === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (count === deletedEmployees.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

window.switchTab = function(tab) {
    // ✅ NEW: Handle tab switching between employees and MCU
    const employeeTab = document.getElementById('employees-tab');
    const mcuTab = document.getElementById('mcu-tab');
    const tabEmployeesBtn = document.getElementById('tab-employees');
    const tabMcuBtn = document.getElementById('tab-mcu');

    if (tab === 'employees') {
        employeeTab.classList.remove('hidden');
        mcuTab.classList.add('hidden');
        tabEmployeesBtn.classList.add('text-primary-600', 'border-b-2', 'border-primary-600');
        tabEmployeesBtn.classList.remove('text-gray-600', 'border-transparent');
        tabMcuBtn.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600');
        tabMcuBtn.classList.add('text-gray-600', 'border-transparent');
        selectedEmployees.clear();
    } else if (tab === 'mcu') {
        employeeTab.classList.add('hidden');
        mcuTab.classList.remove('hidden');
        tabEmployeesBtn.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600');
        tabEmployeesBtn.classList.add('text-gray-600', 'border-transparent');
        tabMcuBtn.classList.add('text-primary-600', 'border-b-2', 'border-primary-600');
        tabMcuBtn.classList.remove('text-gray-600', 'border-transparent');
        renderMCUTable();
        selectedMCU.clear();
    }
};

window.restoreEmployee = function(employeeId) {
    confirmDialog(
        'Restore karyawan ini? Semua data MCU terkait juga akan di-restore (cascade).',
        async () => {
            try {
                await employeeService.restore(employeeId);
                showToast('Karyawan berhasil di-restore (termasuk MCU)', 'success');
                await loadData();
            } catch (error) {

                showToast('Gagal restore: ' + error.message, 'error');
            }
        }
    );
};

window.permanentDelete = function(employeeId) {
    confirmDialog(
        '⚠️ PERINGATAN: Hapus permanen tidak dapat dibatalkan! Semua data akan hilang selamanya. Lanjutkan?',
        () => {
            confirmDialog(
                '⚠️ Konfirmasi kedua: Anda yakin ingin menghapus permanen?',
                async () => {
                    try {
                        // ✅ FIX: Pass currentUser to permanentDelete for activity logging
                        const currentUser = authService.getCurrentUser();
                        await employeeService.permanentDelete(employeeId, currentUser);
                        showToast('Data berhasil dihapus permanen', 'success');
                        await loadData();
                    } catch (error) {

                        showToast('Gagal menghapus: ' + error.message, 'error');
                    }
                }
            );
        }
    );
};

window.bulkRestore = function() {
    const count = selectedEmployees.size;
    if (count === 0) return;

    confirmDialog(
        `Restore ${count} karyawan terpilih? Semua data MCU terkait juga akan di-restore (cascade).`,
        async () => {
            try {
                let successCount = 0;
                let failCount = 0;

                for (const employeeId of selectedEmployees) {
                    try {
                        await employeeService.restore(employeeId);
                        successCount++;
                    } catch (error) {

                        failCount++;
                    }
                }

                selectedEmployees.clear();
                await loadData();

                if (failCount === 0) {
                    showToast(`${successCount} karyawan berhasil di-restore`, 'success');
                } else {
                    showToast(`${successCount} berhasil, ${failCount} gagal di-restore`, 'warning');
                }
            } catch (error) {

                showToast('Gagal restore: ' + error.message, 'error');
            }
        }
    );
};

window.bulkDelete = function() {
    const count = selectedEmployees.size;
    if (count === 0) return;

    confirmDialog(
        `⚠️ PERINGATAN: Hapus permanen ${count} karyawan terpilih? Semua data akan hilang selamanya! Lanjutkan?`,
        () => {
            confirmDialog(
                `⚠️ Konfirmasi kedua: Anda yakin ingin menghapus permanen ${count} karyawan?`,
                async () => {
                    try {
                        let successCount = 0;
                        let failCount = 0;
                        // ✅ FIX: Get currentUser once before loop for activity logging
                        const currentUser = authService.getCurrentUser();

                        for (const employeeId of selectedEmployees) {
                            try {
                                await employeeService.permanentDelete(employeeId, currentUser);
                                successCount++;
                            } catch (error) {

                                failCount++;
                            }
                        }

                        selectedEmployees.clear();
                        await loadData();

                        if (failCount === 0) {
                            showToast(`${successCount} karyawan berhasil dihapus permanen`, 'success');
                        } else {
                            showToast(`${successCount} berhasil, ${failCount} gagal dihapus`, 'warning');
                        }
                    } catch (error) {

                        showToast('Gagal menghapus: ' + error.message, 'error');
                    }
                }
            );
        }
    );
};

/**
 * ✅ NEW: Render MCU table
 */
function renderMCUTable() {
    if (!deletedMCU || deletedMCU.length === 0) {
        document.getElementById('mcu-table').innerHTML = '<p class="text-gray-500 py-4">Tidak ada MCU terhapus</p>';
        return;
    }

    let html = '<table class="w-full"><thead><tr class="border-b border-gray-200"><th class="text-left p-3"><input type="checkbox" id="mcu-select-all" onchange="window.toggleMCUSelectAll()"></th><th class="text-left p-3">MCU ID</th><th class="text-left p-3">Karyawan</th><th class="text-left p-3">Tanggal</th><th class="text-left p-3">Tipe</th><th class="text-left p-3">Tanggal Hapus</th><th class="text-right p-3">Aksi</th></tr></thead><tbody>';

    deletedMCU.forEach(mcu => {
        const mcuDate = mcu.mcuDate ? formatDateDisplay(mcu.mcuDate) : '-';
        const deletedAt = mcu.deletedAt ? formatDateDisplay(mcu.deletedAt) : '-';
        const isChecked = selectedMCU.has(mcu.mcuId) ? 'checked' : '';

        html += `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="p-3"><input type="checkbox" value="${mcu.mcuId}" ${isChecked} onchange="window.toggleMCUSelect(this)"></td>
                <td class="p-3 font-mono text-sm">${mcu.mcuId}</td>
                <td class="p-3">${mcu.employeeName || 'Unknown'}</td>
                <td class="p-3">${mcuDate}</td>
                <td class="p-3">${mcu.mcuType || '-'}</td>
                <td class="p-3 text-gray-500 text-sm">${deletedAt}</td>
                <td class="p-3 text-right">
                    <button onclick="window.restoreMCU('${mcu.mcuId}')" class="text-blue-600 hover:text-blue-700 font-medium text-sm">Restore</button>
                    <button onclick="window.deleteMCUPermanent('${mcu.mcuId}')" class="text-red-600 hover:text-red-700 font-medium text-sm ml-2">Hapus</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('mcu-table').innerHTML = html;
}

/**
 * ✅ NEW: Toggle MCU selection
 */
window.toggleMCUSelect = function(checkbox) {
    const mcuId = checkbox.value;
    if (checkbox.checked) {
        selectedMCU.add(mcuId);
    } else {
        selectedMCU.delete(mcuId);
    }
    updateMCUButtonStates();
};

/**
 * ✅ NEW: Toggle select all MCU
 */
window.toggleMCUSelectAll = function() {
    const selectAll = document.getElementById('mcu-select-all');
    const checkboxes = document.querySelectorAll('#mcu-table input[type="checkbox"][value]');

    if (selectAll.checked) {
        checkboxes.forEach(cb => {
            cb.checked = true;
            selectedMCU.add(cb.value);
        });
    } else {
        checkboxes.forEach(cb => {
            cb.checked = false;
            selectedMCU.delete(cb.value);
        });
    }
    updateMCUButtonStates();
};

/**
 * ✅ NEW: Update MCU button states
 */
function updateMCUButtonStates() {
    const bulkRestoreBtn = document.getElementById('mcu-bulk-restore-btn');
    const bulkDeleteBtn = document.getElementById('mcu-bulk-delete-btn');
    const selectedCountEl = document.getElementById('mcu-selected-count');

    const hasSelected = selectedMCU.size > 0;
    bulkRestoreBtn.disabled = !hasSelected;
    bulkDeleteBtn.disabled = !hasSelected;
    selectedCountEl.textContent = selectedMCU.size;
}

/**
 * ✅ NEW: Restore single MCU
 */
window.restoreMCU = function(mcuId) {
    confirmDialog(
        'Restore MCU ini? Semua data terkait akan di-restore.',
        async () => {
            try {
                await mcuService.restore(mcuId);
                showToast('MCU berhasil di-restore', 'success');
                await loadData();
                window.switchTab('mcu');
            } catch (error) {
                showToast('Gagal restore: ' + error.message, 'error');
            }
        }
    );
};

/**
 * ✅ NEW: Delete MCU permanently
 */
window.deleteMCUPermanent = function(mcuId) {
    confirmDialog(
        '⚠️ PERINGATAN: Hapus permanen tidak dapat dibatalkan! MCU dan semua datanya akan hilang selamanya. Lanjutkan?',
        () => {
            confirmDialog(
                '⚠️ Konfirmasi kedua: Anda yakin ingin menghapus permanen?',
                async () => {
                    try {
                        const currentUser = authService.getCurrentUser();
                        await mcuService.permanentDelete(mcuId, currentUser);
                        showToast('MCU berhasil dihapus permanen', 'success');
                        await loadData();
                        window.switchTab('mcu');
                    } catch (error) {
                        showToast('Gagal menghapus: ' + error.message, 'error');
                    }
                }
            );
        }
    );
};

/**
 * ✅ NEW: Bulk restore MCU
 */
window.bulkRestoreMCU = function() {
    const count = selectedMCU.size;
    if (count === 0) return;

    confirmDialog(
        `Restore ${count} MCU terpilih?`,
        async () => {
            try {
                let successCount = 0;
                let failCount = 0;

                for (const mcuId of selectedMCU) {
                    try {
                        await mcuService.restore(mcuId);
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                }

                selectedMCU.clear();
                await loadData();

                if (failCount === 0) {
                    showToast(`${successCount} MCU berhasil di-restore`, 'success');
                } else {
                    showToast(`${successCount} berhasil, ${failCount} gagal di-restore`, 'warning');
                }
            } catch (error) {
                showToast('Gagal restore: ' + error.message, 'error');
            }
        }
    );
};

/**
 * ✅ NEW: Bulk delete MCU permanently
 */
window.bulkDeleteMCU = function() {
    const count = selectedMCU.size;
    if (count === 0) return;

    confirmDialog(
        `⚠️ PERINGATAN: Hapus permanen ${count} MCU tidak dapat dibatalkan! Lanjutkan?`,
        () => {
            confirmDialog(
                '⚠️ Konfirmasi kedua: Anda yakin?',
                async () => {
                    try {
                        const currentUser = authService.getCurrentUser();
                        let successCount = 0;
                        let failCount = 0;

                        for (const mcuId of selectedMCU) {
                            try {
                                await mcuService.permanentDelete(mcuId, currentUser);
                                successCount++;
                            } catch (error) {
                                failCount++;
                            }
                        }

                        selectedMCU.clear();
                        await loadData();

                        if (failCount === 0) {
                            showToast(`${successCount} MCU berhasil dihapus permanen`, 'success');
                        } else {
                            showToast(`${successCount} berhasil, ${failCount} gagal dihapus`, 'warning');
                        }
                    } catch (error) {
                        showToast('Gagal menghapus: ' + error.message, 'error');
                    }
                }
            );
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
