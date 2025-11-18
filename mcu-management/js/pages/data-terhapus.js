/**
 * Data Terhapus Page - Restore cascade & permanent delete
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay } from '../utils/dateHelpers.js';
import { showToast, confirmDialog } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';  // ✅ FIX: Wait for Supabase initialization
import { initSuperSearch } from '../components/superSearch.js';  // ✅ NEW: Global search

let deletedEmployees = [];
let jobTitles = [];
let departments = [];
let selectedEmployees = new Set();

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
        jobTitles = await masterDataService.getAllJobTitles();
        departments = await masterDataService.getAllDepartments();

        // ✅ FIX: Build lookup Maps once for O(1) enrichment (performance optimization)
        const jobMap = new Map(jobTitles.map(j => [j.name, j]));
        const deptMap = new Map(departments.map(d => [d.name, d]));

        // Enrich employee data with IDs using O(1) Map lookups (O(n) total instead of O(n²))
        deletedEmployees = deletedEmployees.map(emp => enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap));

        document.getElementById('total-count').textContent = deletedEmployees.length;
        renderTable();
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
    // Future: add MCU tab if needed
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

window.handleLogout = function() {
    authService.logout();
};

// ✅ FIX: Wait for Supabase to be ready before initializing
supabaseReady.then(() => {
  init();
}).catch(err => {
  init();
});
