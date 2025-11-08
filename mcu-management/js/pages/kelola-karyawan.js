/**
 * Kelola Karyawan Page
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal, confirmDialog, getStatusBadge } from '../utils/uiHelpers.js';
import { exportEmployeeData } from '../utils/exportHelpers.js';
import { validateEmployeeForm, validateMCUForm, displayValidationErrors } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { debounce } from '../utils/debounce.js';
import { UI } from '../config/constants.js';
import { safeGet, safeArray, isEmpty } from '../utils/nullSafety.js';
import { supabaseReady } from '../config/supabase.js';
import { initSuperSearch } from '../components/superSearch.js';
import FileUploadWidget from '../components/fileUploadWidget.js';

let employees = [];
let filteredEmployees = [];
let jobTitles = [];
let departments = [];
let doctors = [];
let currentPage = 1;
const itemsPerPage = UI.ITEMS_PER_PAGE;
let showInactiveEmployees = false;
let fileUploadWidget = null;
let editFileUploadWidget = null;

async function init() {
    try {
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Wait for sidebar to load before updating user info

        updateUserInfo();
        await loadData();

        // ✅ NEW: Setup toggle for inactive employees (if button exists)
        setupInactiveToggle();

        // ✅ NEW: Initialize Super Search (Cmd+K global search)
        try {
            await initSuperSearch();
        } catch (error) {
            console.warn('Failed to initialize Super Search:', error);
        }

        // Show page content after initialization complete
        document.body.classList.add('initialized');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error initializing page: ' + error.message, 'error');
        // Still show page even on error
        document.body.classList.add('initialized');
    }
}

// ✅ NEW: Setup toggle button for showing/hiding inactive employees
function setupInactiveToggle() {
    // Find all cards (filter card is first, employee table card is second)
    const cards = document.querySelectorAll('.card');
    if (cards.length < 2) return;

    const filterCard = cards[0];  // Filter section card
    const tableCard = cards[1];   // Employee table card

    let toggleBtn = document.getElementById('toggle-inactive-btn');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-inactive-btn';
        toggleBtn.type = 'button';
        toggleBtn.className = 'px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium mb-4';
        toggleBtn.textContent = 'Tampilkan Inactive';

        // Insert between filter section and table
        filterCard.parentNode.insertBefore(toggleBtn, tableCard);
    }

    // Update button text and listen for clicks
    updateInactiveToggleButton();
    toggleBtn.addEventListener('click', async () => {
        showInactiveEmployees = !showInactiveEmployees;
        updateInactiveToggleButton();
        currentPage = 1;  // Reset pagination
        await loadData();
    });
}

// ✅ NEW: Update toggle button appearance
function updateInactiveToggleButton() {
    const toggleBtn = document.getElementById('toggle-inactive-btn');
    if (!toggleBtn) return;

    if (showInactiveEmployees) {
        toggleBtn.textContent = '✓ Tampilkan Inactive';
        toggleBtn.className = 'px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium';
    } else {
        toggleBtn.textContent = 'Tampilkan Inactive';
        toggleBtn.className = 'px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors';
    }
}

function updateUserInfo() {
    const user = authService.getCurrentUser();
    if (!user) {
        console.debug('No user available in updateUserInfo');
        return;
    }

    // Get display name with fallbacks
    const displayName = user?.displayName || user?.name || user?.username || 'User';
    const role = user?.role || 'Petugas';
    const initial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';

    // Safely update user info elements if they exist
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userInitialEl = document.getElementById('user-initial');

    if (userNameEl) {
        userNameEl.textContent = displayName;
    }
    if (userRoleEl) {
        userRoleEl.textContent = role;
    }
    if (userInitialEl) {
        userInitialEl.textContent = initial;
    }

    // Store user globally for sidebar to use
    window.currentUser = user;

    // Initialize sidebar - handles permission checks internally
    if (typeof initializeSidebar === 'function') {
        initializeSidebar(user);
    }
    // Apply permission checks to show/hide admin menus
    if (typeof hideAdminMenus === 'function') {
        hideAdminMenus(user);
    }
}

async function loadData() {
    try {
        logger.info('Loading employee data...');

        // IMPORTANT: Load master data FIRST before employees
        jobTitles = await masterDataService.getAllJobTitles();
        logger.database('select', 'jobTitles', jobTitles.length);

        departments = await masterDataService.getAllDepartments();
        logger.database('select', 'departments', departments.length);

        doctors = await masterDataService.getAllDoctors();
        logger.database('select', 'doctors', doctors.length);

        // ✅ FIX: Load employees (active by default, but can show inactive)
        if (showInactiveEmployees) {
            // Load ALL employees including inactive
            employees = await employeeService.getAll();
            logger.database('select', 'employees (active + inactive)', employees.length);
        } else {
            // Load ONLY active employees (default view)
            employees = await employeeService.getActive();
            logger.database('select', 'employees (active only)', employees.length);
        }

        // ✅ FIX: Build lookup Maps once for O(1) enrichment (performance optimization)
        const jobMap = new Map(jobTitles.map(j => [j.name, j]));
        const deptMap = new Map(departments.map(d => [d.name, d]));

        // Enrich employee data with IDs using O(1) Map lookups (O(n) total instead of O(n²))
        employees = employees.map(emp => enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap));
        filteredEmployees = [...employees];

        // ✅ FIX: Populate filter dropdowns
        populateFilterDropdowns();

        updateStats();
        renderTable();
        logger.info('Employee data loaded successfully');
    } catch (error) {
        logger.error('Error loading employee data:', error);
        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

// ✅ FIX: Populate department filter dropdown
function populateFilterDropdowns() {
    const deptSelect = document.getElementById('filter-department');
    const uniqueDepts = [...new Set(employees.map(e => e.department).filter(Boolean))];

    // Get department names from master data
    uniqueDepts.forEach(deptName => {
        const option = document.createElement('option');
        option.value = deptName;
        option.textContent = deptName;
        deptSelect.appendChild(option);
    });
}

// ✅ FIX: Optimized enrichment using Map lookups - O(1) per employee instead of O(n)
function enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap) {
    // Match job title by name to get ID using O(1) Map lookup
    if (emp.jobTitle && !emp.jobTitleId) {
        const job = jobMap.get(emp.jobTitle);
        if (job) {
            emp.jobTitleId = job.id;
        }
    }

    // Match department by name to get ID using O(1) Map lookup
    if (emp.department && !emp.departmentId) {
        const dept = deptMap.get(emp.department);
        if (dept) {
            emp.departmentId = dept.id;
        }
    }

    return emp;
}

// ✅ Simple wrapper for detail views (uses global jobTitles & departments)
function enrichEmployeeWithIds(emp) {
    // Match job title by name to get ID
    if (emp.jobTitle && !emp.jobTitleId) {
        const job = jobTitles.find(j => j.name === emp.jobTitle);
        if (job) {
            emp.jobTitleId = job.id;
        }
    }

    // Match department by name to get ID
    if (emp.department && !emp.departmentId) {
        const dept = departments.find(d => d.name === emp.department);
        if (dept) {
            emp.departmentId = dept.id;
        }
    }

    return emp;
}

// ✅ DEPRECATED: Old O(n²) function kept for reference only
// function enrichEmployeeWithIds_OLD(emp) {
//     // Match job title by name to get ID
//     if (emp.jobTitle && !emp.jobTitleId) {
//         const job = jobTitles.find(j => j.name === emp.jobTitle);
//         if (job) {
//             emp.jobTitleId = job.id;
//         }
//     }
//
//     // Match department by name to get ID
//     if (emp.department && !emp.departmentId) {
//         const dept = departments.find(d => d.name === emp.department);
//         if (dept) {
//             emp.departmentId = dept.id;
//         }
//     }
//
//     return emp;
// }

function updateStats() {
    document.getElementById('stat-total').textContent = employees.length;

    const active = employees.filter(e => e.activeStatus === 'Active').length;
    document.getElementById('stat-active').textContent = active;

    // ✅ FIX: Add inactive employee count
    const inactive = employees.filter(e => e.activeStatus === 'Inactive').length;
    document.getElementById('stat-inactive').textContent = inactive;

    const company = employees.filter(e => e.employmentStatus === 'Karyawan PST').length;
    document.getElementById('stat-company').textContent = company;

    const vendor = employees.filter(e => e.employmentStatus === 'Vendor').length;
    document.getElementById('stat-vendor').textContent = vendor;
}

function renderTable() {
    const container = document.getElementById('employee-table');

    if (filteredEmployees.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada data</p>';
        return;
    }

    // PERFORMANCE FIX: Build lookup Maps ONCE - O(n) instead of O(n*m)
    // Supabase master data uses numeric id as primary key
    const jobMap = new Map(jobTitles.map(j => [j.id, j]));
    const deptMap = new Map(departments.map(d => [d.id, d]));

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIdx, endIdx);

    // PERFORMANCE FIX: Build complete HTML string ONCE, then assign
    // Instead of concatenating in loop (causes multiple DOM reflows)
    const htmlParts = [];
    htmlParts.push('<div class="table-container"><table class="table"><thead><tr>');
    htmlParts.push('<th>Nama</th><th>ID</th><th>Jabatan</th><th>Departemen</th><th>Status</th><th>Aksi</th>');
    htmlParts.push('</tr></thead><tbody>');

    paginatedEmployees.forEach(emp => {
        // PERFORMANCE: O(1) Map lookup instead of O(n) array.find()
        const job = jobMap.get(emp.jobTitleId);
        const dept = deptMap.get(emp.departmentId);

        // SECURITY: Use escapeHtml for user data to prevent XSS
        const safeName = escapeHtml(emp.name);
        const safeEmployeeId = escapeHtml(emp.employeeId);
        const safeJobName = escapeHtml(job?.name || '-');
        const safeDeptName = escapeHtml(dept?.name || '-');

        htmlParts.push('<tr>');
        htmlParts.push(`<td><span class="font-medium text-gray-900">${safeName}</span></td>`);
        htmlParts.push(`<td><span class="text-sm text-gray-600">${safeEmployeeId}</span></td>`);
        htmlParts.push(`<td>${safeJobName}</td>`);
        htmlParts.push(`<td>${safeDeptName}</td>`);
        htmlParts.push(`<td>${getStatusBadge(emp.activeStatus)}</td>`);
        htmlParts.push(`<td>
            <div class="flex gap-2">
                <button onclick="window.viewEmployee('${safeEmployeeId}')" class="btn btn-sm btn-primary" title="Detail" aria-label="Lihat detail ${safeName}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </button>
                <button onclick="window.editEmployee('${safeEmployeeId}')" class="btn btn-sm btn-secondary" title="Edit" aria-label="Edit ${safeName}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button onclick="window.addMCUForEmployee('${safeEmployeeId}')" class="btn btn-sm btn-success" title="Tambah MCU" aria-label="Tambah MCU untuk ${safeName}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
                <button onclick="window.deleteEmployee('${safeEmployeeId}')" class="btn btn-sm btn-danger" title="Hapus" aria-label="Hapus ${safeName}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </td>`);
        htmlParts.push('</tr>');
    });

    htmlParts.push('</tbody></table></div>');

    // Pagination controls
    if (totalPages > 1) {
        htmlParts.push('<div class="flex items-center justify-between mt-4">');
        htmlParts.push(`<p class="text-sm text-gray-600">Menampilkan ${startIdx + 1}-${Math.min(endIdx, filteredEmployees.length)} dari ${filteredEmployees.length} data</p>`);
        htmlParts.push('<div class="flex gap-2">');

        // Previous button
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        htmlParts.push(`<button onclick="window.changePage(${currentPage - 1})" class="btn btn-sm btn-secondary" ${prevDisabled} aria-label="Halaman sebelumnya">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>`);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const pageClass = i === currentPage ? 'btn-primary' : 'btn-secondary';
                htmlParts.push(`<button onclick="window.changePage(${i})" class="btn btn-sm ${pageClass}" aria-label="Halaman ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>`);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                htmlParts.push('<span class="px-2" aria-hidden="true">...</span>');
            }
        }

        // Next button
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        htmlParts.push(`<button onclick="window.changePage(${currentPage + 1})" class="btn btn-sm btn-secondary" ${nextDisabled} aria-label="Halaman selanjutnya">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>`);

        htmlParts.push('</div></div>');
    }

    // PERFORMANCE: Single DOM operation instead of concatenation in loop
    container.innerHTML = htmlParts.join('');
}

// Helper function for XSS protection
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

window.changePage = function(page) {
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
    }
};

// ✅ FIX: Create debounced filter function to prevent excessive filtering
const debouncedSearch = debounce(() => {
    window.applyFilters();
}, UI.SEARCH_DEBOUNCE_DELAY);

// ✅ FIX: Apply filters
window.applyFilters = function() {
    const deptFilter = document.getElementById('filter-department').value;
    const statusFilter = document.getElementById('filter-active-status').value;
    const employmentFilter = document.getElementById('filter-employment-type').value;
    const searchFilter = document.getElementById('search').value.toLowerCase();

    filteredEmployees = employees.filter(emp => {
        // Apply department filter
        if (deptFilter && emp.department !== deptFilter) {
            return false;
        }

        // Apply active status filter
        if (statusFilter && emp.activeStatus !== statusFilter) {
            return false;
        }

        // Apply employment type filter
        if (employmentFilter && emp.employmentStatus !== employmentFilter) {
            return false;
        }

        // Apply search filter
        if (searchFilter) {
            const name = (emp.name || '').toLowerCase();
            const employeeId = (emp.employeeId || '').toLowerCase();
            if (!name.includes(searchFilter) && !employeeId.includes(searchFilter)) {
                return false;
            }
        }

        return true;
    });

    currentPage = 1; // Reset to first page
    renderTable();
};

// ✅ FIX: Clear all filters
window.clearFilters = function() {
    document.getElementById('filter-department').value = '';
    document.getElementById('filter-active-status').value = '';
    document.getElementById('filter-employment-type').value = '';
    document.getElementById('search').value = '';

    filteredEmployees = [...employees];
    currentPage = 1;
    renderTable();
};

window.handleSearch = function() {
    // Use debounced applyFilters for search + other filters combined
    debouncedSearch();
};

window.viewEmployee = async function(employeeId) {
    try {
        const emp = await employeeService.getById(employeeId);
        if (!emp) {
            showToast('Karyawan tidak ditemukan', 'error');
            return;
        }

        // Enrich employee with IDs (for Supabase which only stores names)
        const enrichedEmp = enrichEmployeeWithIds(emp);

        const job = jobTitles.find(j => j.id === enrichedEmp.jobTitleId);
        const dept = departments.find(d => d.id === enrichedEmp.departmentId);
        const age = calculateAge(emp.birthDate);

        // Employee info - 2 columns
        let infoHtml = `
            <div><span class="text-gray-600">Nama:</span> <span class="font-medium">${escapeHtml(emp.name)}</span></div>
            <div><span class="text-gray-600">ID:</span> <span class="font-medium">${escapeHtml(emp.employeeId)}</span></div>
            <div><span class="text-gray-600">Jabatan:</span> <span class="font-medium">${escapeHtml(job?.name || '-')}</span></div>
            <div><span class="text-gray-600">Departemen:</span> <span class="font-medium">${escapeHtml(dept?.name || '-')}</span></div>
            <div><span class="text-gray-600">Tanggal Lahir:</span> <span class="font-medium">${formatDateDisplay(emp.birthDate)} (${age} tahun)</span></div>
            <div><span class="text-gray-600">Golongan Darah:</span> <span class="font-medium">${escapeHtml(emp.bloodType)}</span></div>
            <div><span class="text-gray-600">Status Karyawan:</span> <span class="font-medium">${escapeHtml(emp.employmentStatus)}</span></div>
            <div><span class="text-gray-600">Status Aktif:</span> ${getStatusBadge(emp.activeStatus)}</div>
        `;
        if (emp.vendorName) {
            infoHtml += `<div class="col-span-2"><span class="text-gray-600">Vendor:</span> <span class="font-medium">${escapeHtml(emp.vendorName)}</span></div>`;
        }
        document.getElementById('employee-info').innerHTML = infoHtml;

        // MCU History
        const mcus = await mcuService.getByEmployee(employeeId);
        let mcuHtml = '';

        if (mcus.length === 0) {
            mcuHtml = '<p class="text-center text-gray-500 py-4">Belum ada riwayat MCU</p>';
        } else {
            mcuHtml = '<div class="table-container"><table class="table"><thead><tr>';
            mcuHtml += '<th>ID MCU</th><th>Tanggal</th><th>Jenis</th><th>Hasil</th><th>Status</th><th></th>';
            mcuHtml += '</tr></thead><tbody>';

            mcus.forEach((mcu, index) => {
                const isLatest = index === 0;
                mcuHtml += '<tr>';
                mcuHtml += `<td>${escapeHtml(mcu.mcuId)} ${isLatest ? '<span class="badge badge-primary ml-2">Terbaru</span>' : ''}</td>`;
                mcuHtml += `<td>${formatDateDisplay(mcu.mcuDate)}</td>`;
                mcuHtml += `<td>${escapeHtml(mcu.mcuType)}</td>`;
                mcuHtml += `<td><span class="text-sm">${escapeHtml(mcu.initialResult)}</span></td>`;
                mcuHtml += `<td>${getStatusBadge(mcu.status)}</td>`;
                mcuHtml += `<td><button onclick="window.viewMCUDetail('${escapeHtml(mcu.mcuId)}')" class="btn btn-sm btn-secondary">Detail</button></td>`;
                mcuHtml += '</tr>';
            });

            mcuHtml += '</tbody></table></div>';
        }

        document.getElementById('mcu-history-table').innerHTML = mcuHtml;

        openModal('detail-modal');
    } catch (error) {

        showToast('Gagal memuat detail: ' + error.message, 'error');
    }
};

window.closeDetailModal = function() {
    closeModal('detail-modal');
};

window.editEmployee = async function(employeeId) {
    try {
        const emp = await employeeService.getById(employeeId);
        if (!emp) {
            showToast('Karyawan tidak ditemukan', 'error');
            return;
        }

        // Enrich employee with IDs (for Supabase which only stores names)
        const enrichedEmp = enrichEmployeeWithIds(emp);

        // Populate dropdowns
        const jobSelect = document.getElementById('edit-emp-job');
        const deptSelect = document.getElementById('edit-emp-dept');

        jobSelect.innerHTML = '<option value="">Pilih...</option>';
        jobTitles.forEach(job => {
            const selected = job.id === enrichedEmp.jobTitleId ? 'selected' : '';
            jobSelect.innerHTML += `<option value="${job.id}" ${selected}>${job.name}</option>`;
        });

        deptSelect.innerHTML = '<option value="">Pilih...</option>';
        departments.forEach(dept => {
            const selected = dept.id === enrichedEmp.departmentId ? 'selected' : '';
            deptSelect.innerHTML += `<option value="${dept.id}" ${selected}>${dept.name}</option>`;
        });

        // Fill form with employee data
        document.getElementById('edit-emp-id').value = emp.employeeId;
        document.getElementById('edit-emp-name').value = emp.name;
        document.getElementById('edit-emp-job').value = enrichedEmp.jobTitleId || '';
        document.getElementById('edit-emp-dept').value = enrichedEmp.departmentId || '';
        document.getElementById('edit-emp-birthdate').value = emp.birthDate;
        document.getElementById('edit-emp-blood').value = emp.bloodType;
        document.getElementById('edit-emp-gender').value = emp.jenisKelamin || 'Laki-laki';
        document.getElementById('edit-emp-status').value = emp.employmentStatus;
        document.getElementById('edit-emp-active').value = emp.activeStatus;

        // Handle vendor field
        if (emp.employmentStatus === 'Vendor') {
            document.getElementById('edit-vendor-field').classList.remove('hidden');
            document.getElementById('edit-emp-vendor').value = emp.vendorName || '';
        } else {
            document.getElementById('edit-vendor-field').classList.add('hidden');
        }

        // Handle inactive reason field
        if (emp.activeStatus === 'Inactive') {
            document.getElementById('edit-inactive-reason-field').classList.remove('hidden');
            document.getElementById('edit-emp-inactive-reason').value = emp.inactiveReason || '';
        } else {
            document.getElementById('edit-inactive-reason-field').classList.add('hidden');
        }

        openModal('edit-employee-modal');
    } catch (error) {

        showToast('Gagal membuka form edit: ' + error.message, 'error');
    }
};

window.closeEditEmployeeModal = function() {
    closeModal('edit-employee-modal');
};

window.toggleEditVendorField = function() {
    const status = document.getElementById('edit-emp-status').value;
    const field = document.getElementById('edit-vendor-field');
    if (status === 'Vendor') {
        field.classList.remove('hidden');
    } else {
        field.classList.add('hidden');
        document.getElementById('edit-emp-vendor').value = '';
    }
};

window.toggleEditInactiveField = function() {
    const status = document.getElementById('edit-emp-active').value;
    const field = document.getElementById('edit-inactive-reason-field');
    if (status === 'Inactive') {
        field.classList.remove('hidden');
    } else {
        field.classList.add('hidden');
        document.getElementById('edit-emp-inactive-reason').value = '';
    }
};

window.handleEditEmployee = async function(event) {
    event.preventDefault();

    try {
        const employeeId = document.getElementById('edit-emp-id').value;
        const currentUser = authService.getCurrentUser();

        const updateData = {
            name: document.getElementById('edit-emp-name').value,
            jobTitleId: document.getElementById('edit-emp-job').value,
            departmentId: document.getElementById('edit-emp-dept').value,
            birthDate: document.getElementById('edit-emp-birthdate').value,
            bloodType: document.getElementById('edit-emp-blood').value,
            jenisKelamin: document.getElementById('edit-emp-gender').value,
            employmentStatus: document.getElementById('edit-emp-status').value,
            vendorName: document.getElementById('edit-emp-vendor').value || null,
            activeStatus: document.getElementById('edit-emp-active').value,
            inactiveReason: document.getElementById('edit-emp-inactive-reason').value || null
        };

        // Validate form data
        const validation = validateEmployeeForm(updateData);
        if (!validation.isValid) {
            displayValidationErrors(validation.errors, showToast);
            return;
        }

        await employeeService.update(employeeId, updateData);

        showToast('Data karyawan berhasil diupdate', 'success');
        closeEditEmployeeModal();
        await loadData();
    } catch (error) {

        showToast('Gagal mengupdate karyawan: ' + error.message, 'error');
    }
};

// Populate doctor dropdown in both add and edit forms
function populateDoctorDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Keep the placeholder option
    const placeholder = select.querySelector('option[value=""]');

    // Clear existing options except placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add doctor options
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.name;
        select.appendChild(option);
    });
}

window.addMCUForEmployee = async function(employeeId) {
    try {
        // Find employee data
        const employee = employees.find(e => e.employeeId === employeeId);
        if (!employee) {
            showToast('Karyawan tidak ditemukan', 'error');
            return;
        }

        // Get job title and department
        // ✅ FIX: employees table stores names, not IDs! Match by name not ID
        // Normalize comparison: trim whitespace and case-insensitive as fallback
        const empJobTitle = (employee.job_title || '').trim();
        const jobTitle = jobTitles.find(j =>
            j.name === empJobTitle ||
            (j.name && j.name.trim().toLowerCase() === empJobTitle.toLowerCase())
        );
        const empDept = (employee.department || '').trim();
        const department = departments.find(d =>
            d.name === empDept ||
            (d.name && d.name.trim().toLowerCase() === empDept.toLowerCase())
        );

        // Fill employee summary
        document.getElementById('mcu-emp-name').textContent = employee.name;
        document.getElementById('mcu-emp-id').textContent = employee.employeeId;
        document.getElementById('mcu-emp-job').textContent = jobTitle?.name || empJobTitle || '-';
        document.getElementById('mcu-emp-dept').textContent = department?.name || empDept || '-';
        document.getElementById('mcu-employee-id').value = employeeId;

        // Reset form
        document.getElementById('mcu-form').reset();
        document.getElementById('mcu-employee-id').value = employeeId;

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('mcu-date').value = today;

        // Populate doctor dropdown
        populateDoctorDropdown('mcu-doctor');

        openModal('add-mcu-modal');
    } catch (error) {

        showToast('Gagal membuka form MCU: ' + error.message, 'error');
    }
};

window.closeAddMCUModal = function() {
    closeModal('add-mcu-modal');
};

window.handleAddMCU = async function(event) {
    event.preventDefault();

    try {
        const currentUser = authService.getCurrentUser();

        const mcuData = {
            employeeId: document.getElementById('mcu-employee-id').value,
            mcuType: document.getElementById('mcu-type').value,
            mcuDate: document.getElementById('mcu-date').value,
            bmi: document.getElementById('mcu-bmi').value || null,
            bloodPressure: document.getElementById('mcu-bp').value || null,
            respiratoryRate: document.getElementById('mcu-rr').value || null,
            pulse: document.getElementById('mcu-pulse').value || null,
            temperature: document.getElementById('mcu-temp').value || null,
            vision: document.getElementById('mcu-vision').value || null,
            audiometry: document.getElementById('mcu-audio').value || null,
            spirometry: document.getElementById('mcu-spiro').value || null,
            xray: document.getElementById('mcu-xray').value || null,
            ekg: document.getElementById('mcu-ekg').value || null,
            treadmill: document.getElementById('mcu-treadmill').value || null,
            kidneyLiverFunction: document.getElementById('mcu-kidney').value || null,
            hbsag: document.getElementById('mcu-hbsag').value || null,
            sgot: document.getElementById('mcu-sgot').value || null,
            sgpt: document.getElementById('mcu-sgpt').value || null,
            cbc: document.getElementById('mcu-cbc').value || null,
            napza: document.getElementById('mcu-napza').value || null,
            // ✅ FIX: Convert doctor ID to number (doctors.id is INTEGER)
            doctor: (() => {
                const val = document.getElementById('mcu-doctor').value;
                return val ? parseInt(val, 10) : null;
            })(),
            recipient: document.getElementById('mcu-recipient').value || null,
            keluhanUtama: document.getElementById('mcu-keluhan').value || null,
            diagnosisKerja: document.getElementById('mcu-diagnosis').value || null,
            alasanRujuk: document.getElementById('mcu-alasan').value || null,
            initialResult: document.getElementById('mcu-result').value,
            initialNotes: document.getElementById('mcu-notes').value
        };

        // Validate form data
        const validation = validateMCUForm(mcuData);
        if (!validation.isValid) {
            displayValidationErrors(validation.errors, showToast);
            return;
        }

        await mcuService.create(mcuData, currentUser);

        showToast('MCU berhasil ditambahkan!', 'success');

        // Close modal and reload data
        closeAddMCUModal();
        await loadData();

    } catch (error) {

        showToast('Gagal menambah MCU: ' + error.message, 'error');
    }
};

window.viewMCUDetail = async function(mcuId) {
    try {
        // Pastikan master data sudah loaded (termasuk doctors)
        if (!doctors || doctors.length === 0) {
            await loadMasterData();
        }

        const mcu = await mcuService.getById(mcuId);
        if (!mcu) {
            showToast('MCU tidak ditemukan', 'error');
            return;
        }

        const emp = employees.find(e => e.employeeId === mcu.employeeId);
        // ✅ FIX: Match by NAME not ID (employees stores names, not IDs!)
        // Normalize comparison: trim whitespace and case-insensitive as fallback
        const empJobTitle = (emp?.job_title || '').trim();
        const job = jobTitles.find(j =>
            j.name === empJobTitle ||
            (j.name && j.name.trim().toLowerCase() === empJobTitle.toLowerCase())
        );
        const empDept = (emp?.department || '').trim();
        const dept = departments.find(d =>
            d.name === empDept ||
            (d.name && d.name.trim().toLowerCase() === empDept.toLowerCase())
        );

        // Fill employee info
        document.getElementById('mcu-detail-emp-name').textContent = emp?.name || '-';
        document.getElementById('mcu-detail-emp-id').textContent = emp?.employeeId || '-';
        document.getElementById('mcu-detail-emp-job').textContent = job?.name || empJobTitle || '-';
        document.getElementById('mcu-detail-emp-dept').textContent = dept?.name || empDept || '-';

        // Fill MCU info
        document.getElementById('mcu-detail-id').textContent = mcu.mcuId;
        document.getElementById('mcu-detail-date').textContent = formatDateDisplay(mcu.mcuDate);
        document.getElementById('mcu-detail-type').textContent = mcu.mcuType;

        // Format updatedAt
        if (mcu.updatedAt) {
            const updatedDate = new Date(mcu.updatedAt);
            const formattedDate = updatedDate.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const formattedTime = updatedDate.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('mcu-detail-updated').textContent = `${formattedDate}, ${formattedTime}`;
        } else {
            document.getElementById('mcu-detail-updated').textContent = '-';
        }

        // Fill examination results
        document.getElementById('mcu-detail-bmi').textContent = mcu.bmi || '-';
        document.getElementById('mcu-detail-bp').textContent = mcu.bloodPressure || '-';
        document.getElementById('mcu-detail-vision').textContent = mcu.vision || '-';
        document.getElementById('mcu-detail-audio').textContent = mcu.audiometry || '-';
        document.getElementById('mcu-detail-spiro').textContent = mcu.spirometry || '-';
        document.getElementById('mcu-detail-hbsag').textContent = mcu.hbsag || '-';
        document.getElementById('mcu-detail-sgot').textContent = mcu.sgot || '-';
        document.getElementById('mcu-detail-sgpt').textContent = mcu.sgpt || '-';
        document.getElementById('mcu-detail-cbc').textContent = mcu.cbc || '-';
        document.getElementById('mcu-detail-xray').textContent = mcu.xray || '-';
        document.getElementById('mcu-detail-ekg').textContent = mcu.ekg || '-';
        document.getElementById('mcu-detail-treadmill').textContent = mcu.treadmill || '-';
        document.getElementById('mcu-detail-kidney').textContent = mcu.kidneyLiverFunction || '-';
        document.getElementById('mcu-detail-napza').textContent = mcu.napza || '-';

        // Fill additional data
        document.getElementById('mcu-detail-rr').textContent = mcu.respiratoryRate || '-';
        document.getElementById('mcu-detail-pulse').textContent = mcu.pulse || '-';
        document.getElementById('mcu-detail-temp').textContent = mcu.temperature || '-';

        // Fill doctor data - compare as numbers to handle Supabase numeric IDs
        const doctor = doctors.find(d => {
            // Handle numeric and string ID comparison for Supabase/IndexedDB compatibility
            return String(d.id) === String(mcu.doctor) || d.id === mcu.doctor || d.doctorId === mcu.doctor;
        });

        document.getElementById('mcu-detail-doctor').textContent = doctor?.name || '-';

        // Fill referral data
        document.getElementById('mcu-detail-recipient').textContent = mcu.recipient || '-';
        document.getElementById('mcu-detail-keluhan').textContent = mcu.keluhanUtama || '-';
        document.getElementById('mcu-detail-diagnosis').textContent = mcu.diagnosisKerja || '-';
        document.getElementById('mcu-detail-alasan').textContent = mcu.alasanRujuk || '-';

        // Fill results
        document.getElementById('mcu-detail-initial-result').innerHTML = getStatusBadge(mcu.initialResult);
        document.getElementById('mcu-detail-initial-notes').textContent = mcu.initialNotes || '-';

        if (mcu.finalResult) {
            document.getElementById('mcu-detail-final-result').innerHTML = getStatusBadge(mcu.finalResult);
            document.getElementById('mcu-detail-final-notes').textContent = mcu.finalNotes || '-';
            document.getElementById('final-result-section').classList.remove('hidden');
        } else {
            document.getElementById('final-result-section').classList.add('hidden');
        }

        // Load change history
        const changes = await mcuService.getChangeHistory(mcuId);

        if (changes && changes.length > 0) {
            const fieldLabels = {
                'bmi': 'BMI',
                'bloodPressure': 'Tekanan Darah',
                'vision': 'Penglihatan',
                'audiometry': 'Audiometri',
                'spirometry': 'Spirometri',
                'xray': 'X-Ray',
                'ekg': 'EKG',
                'treadmill': 'Treadmill',
                'kidneyLiverFunction': 'Fungsi Ginjal & Hati',
                'hbsag': 'HBsAg',
                'sgot': 'SGOT',
                'sgpt': 'SGPT',
                'cbc': 'CBC',
                'napza': 'NAPZA',
                'finalResult': 'Hasil Akhir',
                'finalNotes': 'Catatan Akhir'
            };

            let changeHtml = '<div class="table-container"><table class="table"><thead><tr>';
            changeHtml += '<th>Item MCU</th><th>Hasil Awal</th><th>Hasil Akhir</th><th>Status</th>';
            changeHtml += '</tr></thead><tbody>';

            changes.forEach(change => {
                // Use fieldChanged or fieldName (fieldChanged is the correct one from diffHelpers.js)
                const fieldKey = change.fieldChanged || change.fieldName;
                const label = fieldLabels[fieldKey] || change.fieldLabel || fieldKey;
                const oldVal = change.oldValue || '-';
                const newVal = change.newValue || '-';
                const status = oldVal !== newVal ? 'Diubah' : 'Tidak diubah';
                const statusClass = oldVal !== newVal ? 'badge badge-warning' : 'badge badge-secondary';

                changeHtml += '<tr>';
                changeHtml += `<td><span class="font-medium">${label}</span></td>`;
                changeHtml += `<td><span class="text-sm text-gray-600">${oldVal}</span></td>`;
                changeHtml += `<td><span class="text-sm text-gray-900">${newVal}</span></td>`;
                changeHtml += `<td><span class="${statusClass}">${status}</span></td>`;
                changeHtml += '</tr>';
            });

            changeHtml += '</tbody></table></div>';
            document.getElementById('change-history-table').innerHTML = changeHtml;
            document.getElementById('change-history-section').classList.remove('hidden');
        } else {
            document.getElementById('change-history-section').classList.add('hidden');
        }

        // Store current MCU ID for edit
        window.currentMCUId = mcuId;

        openModal('mcu-detail-modal');
    } catch (error) {

        showToast('Gagal memuat detail MCU: ' + error.message, 'error');
    }
};

window.closeMCUDetailModal = function() {
    closeModal('mcu-detail-modal');
};

window.editMCU = async function() {
    if (!window.currentMCUId) return;

    try {
        const mcu = await mcuService.getById(window.currentMCUId);
        if (!mcu) {
            showToast('MCU tidak ditemukan', 'error');
            return;
        }

        // Close detail modal first
        closeMCUDetailModal();

        // Open the modal FIRST so DOM elements are visible
        openModal('edit-mcu-modal');

        // Use setTimeout to ensure DOM is ready before setting values
        setTimeout(() => {
            try {
                // Reset form first
                const form = document.getElementById('edit-mcu-form');
                if (form) form.reset();

                // Fill edit MCU form with current values
                document.getElementById('edit-mcu-id').value = mcu.mcuId || '';
                document.getElementById('edit-mcu-type').value = mcu.mcuType || '';
                document.getElementById('edit-mcu-date').value = mcu.mcuDate || '';

                // Fill examination fields - use explicit value assignment
                const bioFields = {
                    'edit-mcu-bmi': mcu.bmi,
                    'edit-mcu-bp': mcu.bloodPressure,
                    'edit-mcu-rr': mcu.respiratoryRate,
                    'edit-mcu-pulse': mcu.pulse,
                    'edit-mcu-temp': mcu.temperature,
                    'edit-mcu-vision': mcu.vision,
                    'edit-mcu-audio': mcu.audiometry,
                    'edit-mcu-spiro': mcu.spirometry,
                    'edit-mcu-sgot': mcu.sgot,
                    'edit-mcu-sgpt': mcu.sgpt,
                    'edit-mcu-cbc': mcu.cbc,
                    'edit-mcu-xray': mcu.xray,
                    'edit-mcu-ekg': mcu.ekg,
                    'edit-mcu-treadmill': mcu.treadmill,
                    'edit-mcu-kidney': mcu.kidneyLiverFunction,
                    'edit-mcu-napza': mcu.napza,
                    'edit-mcu-recipient': mcu.recipient,
                    'edit-mcu-keluhan': mcu.keluhanUtama,
                    'edit-mcu-diagnosis': mcu.diagnosisKerja,
                    'edit-mcu-alasan': mcu.alasanRujuk
                };

                // Set all bio fields
                Object.entries(bioFields).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = value || '';
                        // Trigger change event for any dependent fields
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // Set HBSAG dropdown value
                const hbsagEl = document.getElementById('edit-mcu-hbsag');
                if (hbsagEl) {
                    hbsagEl.value = mcu.hbsag || '';
                }

                // Populate doctor dropdown and set value
                populateDoctorDropdown('edit-mcu-doctor');
                // Set doctor after dropdown is populated
                setTimeout(() => {
                    const doctorEl = document.getElementById('edit-mcu-doctor');
                    if (doctorEl && mcu.doctor) {
                        doctorEl.value = mcu.doctor;
                    }
                }, 50);

                // Fill results
                const initialResultEl = document.getElementById('edit-mcu-initial-result');
                const initialNotesEl = document.getElementById('edit-mcu-initial-notes');
                if (initialResultEl) initialResultEl.value = mcu.initialResult || '';
                if (initialNotesEl) initialNotesEl.value = mcu.initialNotes || '';

                // Show/hide final result section
                if (mcu.finalResult) {
                    const finalResultEl = document.getElementById('edit-mcu-final-result');
                    const finalNotesEl = document.getElementById('edit-mcu-final-notes');
                    if (finalResultEl) finalResultEl.value = mcu.finalResult;
                    if (finalNotesEl) finalNotesEl.value = mcu.finalNotes || '';
                    document.getElementById('edit-final-result-section').classList.remove('hidden');
                } else {
                    document.getElementById('edit-final-result-section').classList.add('hidden');
                }

                // ✅ NEW: Initialize file upload widget for adding more documents
                const editFileContainer = document.getElementById('edit-file-upload-container');
                if (editFileContainer) {
                    editFileContainer.innerHTML = '';  // Clear previous widget
                    try {
                        const currentUser = authService.getCurrentUser();
                        editFileUploadWidget = new FileUploadWidget('edit-file-upload-container', {
                            employeeId: mcu.employeeId,
                            mcuId: mcu.mcuId,
                            userId: currentUser.userId || currentUser.user_id,
                            onUploadComplete: (result) => {
                                logger.info('✅ Additional MCU file uploaded:', result);
                                showToast('File berhasil diunggah', 'success');
                            }
                        });
                        logger.info('✓ File upload widget initialized successfully');
                    } catch (widgetError) {
                        logger.error('✗ Failed to initialize file upload widget:', widgetError?.message || widgetError);
                        console.error('Widget initialization error details:', widgetError);
                    }
                } else {
                    logger.warn('⚠️ File upload container not found in DOM');
                }

            } catch (error) {
                console.error('Error filling form fields:', error);
            }
        }, 50);

    } catch (error) {
        console.error('Edit MCU error:', error);
        showToast('Gagal membuka form edit: ' + error.message, 'error');
    }
};

window.closeEditMCUModal = function() {
    closeModal('edit-mcu-modal');
};

window.handleEditMCU = async function(event) {
    event.preventDefault();

    const mcuId = document.getElementById('edit-mcu-id').value;

    try {
        const currentUser = authService.getCurrentUser();

        // ✅ NEW: Get newly uploaded files from widget
        const newlyUploadedFiles = editFileUploadWidget ? editFileUploadWidget.getUploadedFiles() : [];

        const updateData = {
            mcuType: document.getElementById('edit-mcu-type').value,
            mcuDate: document.getElementById('edit-mcu-date').value,
            bmi: document.getElementById('edit-mcu-bmi').value || null,
            bloodPressure: document.getElementById('edit-mcu-bp').value || null,
            respiratoryRate: document.getElementById('edit-mcu-rr').value || null,
            pulse: document.getElementById('edit-mcu-pulse').value || null,
            temperature: document.getElementById('edit-mcu-temp').value || null,
            vision: document.getElementById('edit-mcu-vision').value || null,
            audiometry: document.getElementById('edit-mcu-audio').value || null,
            spirometry: document.getElementById('edit-mcu-spiro').value || null,
            hbsag: document.getElementById('edit-mcu-hbsag').value || null,
            sgot: document.getElementById('edit-mcu-sgot').value || null,
            sgpt: document.getElementById('edit-mcu-sgpt').value || null,
            cbc: document.getElementById('edit-mcu-cbc').value || null,
            xray: document.getElementById('edit-mcu-xray').value || null,
            ekg: document.getElementById('edit-mcu-ekg').value || null,
            treadmill: document.getElementById('edit-mcu-treadmill').value || null,
            kidneyLiverFunction: document.getElementById('edit-mcu-kidney').value || null,
            napza: document.getElementById('edit-mcu-napza').value || null,
            // ✅ FIX: Convert doctor ID to number (doctors.id is INTEGER)
            doctor: (() => {
                const val = document.getElementById('edit-mcu-doctor').value;
                return val ? parseInt(val, 10) : null;
            })(),
            recipient: document.getElementById('edit-mcu-recipient').value || null,
            keluhanUtama: document.getElementById('edit-mcu-keluhan').value || null,
            diagnosisKerja: document.getElementById('edit-mcu-diagnosis').value || null,
            alasanRujuk: document.getElementById('edit-mcu-alasan').value || null,
            initialResult: document.getElementById('edit-mcu-initial-result').value,
            initialNotes: document.getElementById('edit-mcu-initial-notes').value,
            newlyUploadedFiles: newlyUploadedFiles  // ✅ NEW: Include newly uploaded files
        };

        // Add final result if filled
        const finalResult = document.getElementById('edit-mcu-final-result').value;
        if (finalResult) {
            updateData.finalResult = finalResult;
            updateData.finalNotes = document.getElementById('edit-mcu-final-notes').value || null;
        }

        await mcuService.updateFollowUp(mcuId, updateData, currentUser);

        // ✅ NEW: Clear file upload widget after successful save
        if (editFileUploadWidget) {
            editFileUploadWidget.clear();
        }

        showToast('Data MCU berhasil diupdate', 'success');
        closeEditMCUModal();

        // Reload if viewing from detail
        if (window.currentMCUId === mcuId) {
            await viewMCUDetail(mcuId);
        }
    } catch (error) {

        showToast('Gagal mengupdate MCU: ' + error.message, 'error');
    }
};

window.deleteEmployee = function(employeeId) {
    confirmDialog(
        'Apakah Anda yakin ingin menghapus karyawan ini? Data akan dipindahkan ke Data Terhapus.',
        async () => {
            try {
                await employeeService.softDelete(employeeId);
                showToast('Karyawan berhasil dihapus', 'success');
                await loadData();
            } catch (error) {

                showToast('Gagal menghapus: ' + error.message, 'error');
            }
        }
    );
};

window.exportData = function() {
    exportEmployeeData(filteredEmployees, jobTitles, departments, 'data_karyawan');
};

window.handleLogout = function() {
    authService.logout();
};

// ✅ FIX: Wait for Supabase to be ready before initializing
supabaseReady.then(() => {
  init();
}).catch(err => {
  console.error('Failed to wait for Supabase:', err);
  init();
});
