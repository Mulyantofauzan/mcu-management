/**
 * Data Terhapus Page - Restore cascade & permanent delete
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay } from '../utils/dateHelpers.js';
import { showToast, confirmDialog } from '../utils/uiHelpers.js';
import { initializeSidebar, hideAdminMenus } from '../sidebar-manager.js';

let deletedEmployees = [];
let jobTitles = [];
let departments = [];
let selectedEmployees = new Set();

async function init() {
    if (!authService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    updateUserInfo();
    await loadData();
}

function updateUserInfo() {
    const user = authService.getCurrentUser();
    if (user) {
        // Safely access user properties with fallbacks
        const displayName = user?.displayName || 'User';
        const role = user?.role || 'Petugas';
        const initial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';

        document.getElementById('user-name').textContent = displayName;
        document.getElementById('user-role').textContent = role;
        document.getElementById('user-initial').textContent = initial;
        // Initialize sidebar - handles permission checks internally
        initializeSidebar(user);
            // Apply permission checks to show/hide admin menus
            hideAdminMenus(user);
    }
}

async function loadData() {
    try {
        deletedEmployees = await employeeService.getDeleted();
        jobTitles = await masterDataService.getAllJobTitles();
        departments = await masterDataService.getAllDepartments();

        // Enrich employee data with IDs (for Supabase which only stores names)
        deletedEmployees = deletedEmployees.map(emp => enrichEmployeeWithIds(emp));

        document.getElementById('total-count').textContent = deletedEmployees.length;
        renderTable();
    } catch (error) {

        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

// Helper: Add jobTitleId and departmentId based on names (for Supabase compatibility)
function enrichEmployeeWithIds(emp) {
    if (!emp.jobTitleId && emp.jobTitle) {
        const job = jobTitles.find(j => j.name === emp.jobTitle);
        if (job) emp.jobTitleId = job.id;  // Use 'id' not 'jobTitleId' - Supabase format
    }
    if (!emp.departmentId && emp.department) {
        const dept = departments.find(d => d.name === emp.department);
        if (dept) emp.departmentId = dept.id;  // Use 'id' not 'departmentId' - Supabase format
    }
    return emp;
}

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
                        await employeeService.permanentDelete(employeeId);
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

                        for (const employeeId of selectedEmployees) {
                            try {
                                await employeeService.permanentDelete(employeeId);
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

init();
