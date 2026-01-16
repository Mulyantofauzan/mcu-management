/**
 * Kelola Karyawan Page
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { labService } from '../services/labService.js';
import { mcuBatchService } from '../services/mcuBatchService.js';
import { masterDataService } from '../services/masterDataService.js';
import database from '../services/databaseAdapter.js';
import { generateMCUId } from '../utils/idGenerator.js';
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
import FileListViewer from '../components/fileListViewer.js';
import { deleteOrphanedFiles } from '../services/supabaseStorageService.js';
import { tempFileStorage } from '../services/tempFileStorage.js';
import { StaticLabForm } from '../components/staticLabForm.js';
import { LAB_ITEMS_MAPPING, sortLabResultsByDisplayOrder } from '../data/labItemsMapping.js';

let employees = [];
let filteredEmployees = [];
let jobTitles = [];
let departments = [];
let doctors = [];
let currentPage = 1;
const itemsPerPage = UI.ITEMS_PER_PAGE;
let showInactiveEmployees = false;
let fileUploadWidget = null;
let addFileUploadWidget = null;
let generatedMCUIdForAdd = null;  // Store generated MCU ID for the add modal

// Lab form instances - initialized once on page load
let labResultWidgetEdit = null;
let labResultWidgetAdd = null;

// Unified loading overlay functions
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

function hideUnifiedLoading() {
  const overlay = document.getElementById('unified-loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

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

// Deprecated functions - for backward compatibility
function showSaveLoading(message = 'Menyimpan Data...') {
  showUnifiedLoading('Memproses...', message);
}

function hideSaveLoading() {
  hideUnifiedLoading();
}

function showUploadLoading(message = 'Mengunggah File...') {
  showUnifiedLoading('Memproses...', message);
  startUploadStep(0);
}

function hideUploadLoading() {
  completeUploadStep();
}

async function initLabForms() {
    /**
     * Initialize all lab forms ONCE on page load
     * Forms are permanent like other form fields - no re-rendering needed
     */
    try {
        // Edit modal lab form (lab-results-container-edit)
        if (!labResultWidgetEdit) {
            labResultWidgetEdit = new StaticLabForm('lab-results-container-edit');
        }

        // Add modal lab form (lab-results-container-add-karyawan)
        if (!labResultWidgetAdd) {
            labResultWidgetAdd = new StaticLabForm('lab-results-container-add-karyawan');
        }
    } catch (error) {
    }
}

async function init() {
    try {
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Wait for sidebar to load before updating user info

        updateUserInfo();

        // ✅ Initialize lab forms ONCE on page load (truly permanent, like other form fields)
        await initLabForms();

        await loadData();

        // ✅ NEW: Setup toggle for inactive employees (if button exists)
        setupInactiveToggle();

        // ✅ NEW: Initialize Super Search (Cmd+K global search)
        try {
            await initSuperSearch();
        } catch (error) {
        }

        // ✅ NEW: Add event delegation for dynamically generated Detail buttons
        setupDetailButtonDelegation();

        // Show page content after initialization complete
        document.body.classList.add('initialized');
    } catch (error) {
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

// ✅ NEW: Setup event delegation for Detail buttons in MCU history table
function setupDetailButtonDelegation() {
    // Use event delegation on document level for dynamically added buttons
    document.addEventListener('click', async (e) => {
        // Check if the clicked element is a Detail button (matches onclick attribute pattern)
        if (e.target && e.target.tagName === 'BUTTON' && e.target.classList.contains('btn-secondary')) {
            // Extract mcuId from the button's onclick attribute
            const onClickAttr = e.target.getAttribute('onclick');
            if (onClickAttr && onClickAttr.includes('viewMCUDetail')) {
                // Let the onclick handler take care of it
                // This just ensures the button is clickable
            }
        }
    }, true); // Use capture phase to ensure we get clicks even if prevented
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

        // Show save loading overlay to prevent double-submit
        showSaveLoading('Menyimpan data karyawan...');

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

        hideSaveLoading();
        showToast('Data karyawan berhasil diupdate', 'success');
        closeEditEmployeeModal();
        await loadData();
    } catch (error) {
        hideSaveLoading();
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

    // Debug: Check if doctors array is populated
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

        // ✅ CRITICAL: Clear lab widget state before opening modal
        // This ensures fresh lab data collection for each new MCU
        if (labResultWidgetAdd) {
            labResultWidgetAdd.clear();
        }

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('mcu-date').value = today;

        // Populate doctor dropdown
        populateDoctorDropdown('mcu-doctor');

        // Generate MCU ID at the start (but don't save to DB yet)
        generatedMCUIdForAdd = generateMCUId();

        // Initialize file upload widget with the generated MCU ID
        // skipDBInsert=true: File only saved to storage, metadata saved when MCU is created
        const addFileContainer = document.getElementById('add-file-upload-container');
        if (addFileContainer) {
            addFileContainer.innerHTML = '';
            const currentUser = authService.getCurrentUser();
            addFileUploadWidget = new FileUploadWidget('add-file-upload-container', {
                employeeId: employeeId,
                mcuId: generatedMCUIdForAdd, // Use generated ID (not yet saved to DB)
                userId: currentUser.userId || currentUser.user_id,
                skipDBInsert: true, // File uploaded to storage only, DB insert happens on MCU save
                onUploadComplete: (result) => {
                    showToast('File berhasil diunggah', 'success');
                }
            });
        }

        openModal('add-mcu-modal');

        // ✅ Setup custom disease handlers for medical/family history
        setupCustomDiseaseHandlersForAdd();

        // ✅ CRITICAL: Reinitialize lab widget when modal opens to ensure fresh state
        // This prevents stale data from previous modal sessions
        if (!labResultWidgetAdd || !labResultWidgetAdd.container) {
            const { StaticLabForm } = await import('../components/staticLabForm.js');
            labResultWidgetAdd = new StaticLabForm('lab-results-container-add-karyawan');
        }
    } catch (error) {

        showToast('Gagal membuka form MCU: ' + error.message, 'error');
    }
};

window.closeAddMCUModal = function() {
    closeModal('add-mcu-modal');

    // ✅ Clear lab widget state to prevent residual data
    if (labResultWidgetAdd) {
        labResultWidgetAdd.clear();
    }

    // ✅ Clear medical and family history lists
    const medicalHistoryList = document.getElementById('mcu-medical-history-list');
    if (medicalHistoryList) {
        medicalHistoryList.innerHTML = '';
    }
    const familyHistoryList = document.getElementById('mcu-family-history-list');
    if (familyHistoryList) {
        familyHistoryList.innerHTML = '';
    }

    // ✅ NOTE: Do NOT clear container innerHTML - static form HTML is permanent in the modal
    // Just clear the input values via the widget.clear() call above

    // Reset form elements
    const mcuForm = document.getElementById('mcu-form');
    if (mcuForm) {
        mcuForm.reset();
        // Remove MCU ID display div if it exists
        const mcuIdDiv = mcuForm.querySelector('.bg-green-50');
        if (mcuIdDiv) {
            mcuIdDiv.remove();
        }
    }
};

window.handleAddMCU = async function(event) {
    event.preventDefault();

    try {
        const currentUser = authService.getCurrentUser();

        // ✅ FIX: Get doctor ID and convert to number (matching handleEditMCU logic)
        const doctorSelect = document.getElementById('mcu-doctor');
        const doctorValue = doctorSelect.value;
        const doctorId = doctorValue ? parseInt(doctorValue, 10) : null;

        /**
         * Helper function to get field value or "Lainnya" custom input
         */
        const getFieldValue = (fieldId, otherFieldId) => {
            const value = document.getElementById(fieldId).value;
            if (value === 'Lainnya') {
                const otherValue = document.getElementById(otherFieldId).value;
                return otherValue || null;
            }
            return value || null;
        };

        const mcuData = {
            mcuId: generatedMCUIdForAdd, // Use the ID generated when modal opened
            employeeId: document.getElementById('mcu-employee-id').value,
            mcuType: document.getElementById('mcu-type').value,
            mcuDate: document.getElementById('mcu-date').value,
            bmi: document.getElementById('mcu-bmi').value ? parseFloat(document.getElementById('mcu-bmi').value) : null,
            bloodPressure: document.getElementById('mcu-bp').value || null,
            respiratoryRate: document.getElementById('mcu-rr').value || null,
            pulse: document.getElementById('mcu-pulse').value || null,
            temperature: document.getElementById('mcu-temp').value || null,
            chestCircumference: document.getElementById('mcu-chest-circumference').value ? parseFloat(document.getElementById('mcu-chest-circumference').value) : null,
            // 8-field vision structure with "Lainnya" support
            visionDistantUnaideLeft: getFieldValue('mcu-vision-distant-unaided-left', 'mcu-vision-distant-unaided-left-other'),
            visionDistantUnaideRight: getFieldValue('mcu-vision-distant-unaided-right', 'mcu-vision-distant-unaided-right-other'),
            visionDistantSpectaclesLeft: getFieldValue('mcu-vision-distant-spectacles-left', 'mcu-vision-distant-spectacles-left-other'),
            visionDistantSpectaclesRight: getFieldValue('mcu-vision-distant-spectacles-right', 'mcu-vision-distant-spectacles-right-other'),
            visionNearUnaideLeft: getFieldValue('mcu-vision-near-unaided-left', 'mcu-vision-near-unaided-left-other'),
            visionNearUnaideRight: getFieldValue('mcu-vision-near-unaided-right', 'mcu-vision-near-unaided-right-other'),
            visionNearSpectaclesLeft: getFieldValue('mcu-vision-near-spectacles-left', 'mcu-vision-near-spectacles-left-other'),
            visionNearSpectaclesRight: getFieldValue('mcu-vision-near-spectacles-right', 'mcu-vision-near-spectacles-right-other'),
            audiometry: getFieldValue('mcu-audio', 'mcu-audio-other'),
            spirometry: getFieldValue('mcu-spiro', 'mcu-spiro-other'),
            xray: getFieldValue('mcu-xray', 'mcu-xray-other'),
            ekg: getFieldValue('mcu-ekg', 'mcu-ekg-other'),
            treadmill: getFieldValue('mcu-treadmill', 'mcu-treadmill-other'),
            hbsag: document.getElementById('mcu-hbsag').value || null,
            napza: getFieldValue('mcu-napza', 'mcu-napza-other'),
            colorblind: getFieldValue('mcu-colorblind', 'mcu-colorblind-other'),
            smokingStatus: document.getElementById('mcu-smoking-status').value || null,
            exerciseFrequency: document.getElementById('mcu-exercise-frequency').value || null,
            doctor: doctorId,
            recipient: document.getElementById('mcu-recipient').value || null,
            keluhanUtama: document.getElementById('mcu-keluhan').value || null,
            diagnosisKerja: document.getElementById('mcu-diagnosis').value || null,
            alasanRujuk: document.getElementById('mcu-alasan').value || null,
            initialResult: document.getElementById('mcu-result').value,
            initialNotes: document.getElementById('mcu-notes').value,
            // ✅ Collect medical and family histories from Riwayat Kesehatan section
            medicalHistories: getMedicalHistoryData(),
            familyHistories: getFamilyHistoryData()
        };

        // 🔍 DEBUG: Log the collected data BEFORE passing to batch service
        // Validate form data
        const validation = validateMCUForm(mcuData);
        if (!validation.isValid) {
            displayValidationErrors(validation.errors, showToast);
            return;
        }

        // Show unified loading with step tracking
        const tempFiles = tempFileStorage.getFiles(mcuData.mcuId);
        showUnifiedLoading('Memproses...', 'Mengunggah file dan menyimpan data');

        // ✅ FIX: Upload temporary files to Cloudflare R2 BEFORE saving MCU data
        if (tempFiles && tempFiles.length > 0) {
            startUploadStep(tempFiles.length);

            try {
                const { uploadBatchFiles } = await import('../services/supabaseStorageService.js');
                const uploadResult = await uploadBatchFiles(
                    tempFiles,
                    mcuData.employeeId,
                    mcuData.mcuId,
                    currentUser.id,
                    // Progress callback
                    (current, total) => {
                        updateUploadProgress(current, total);
                    }
                );

                if (!uploadResult.success && uploadResult.uploadedCount === 0) {
                    // All uploads failed - don't proceed with MCU creation
                    hideUnifiedLoading();
                    showToast(`❌ File upload ke R2 gagal: ${uploadResult.error}`, 'error');
                    return;
                } else if (uploadResult.failedCount > 0) {
                    // Some uploads failed - warn user but continue
                    showToast(`⚠️ ${uploadResult.failedCount} file gagal diunggah, tapi MCU akan disimpan`, 'warning');
                }
            } catch (error) {
                hideUnifiedLoading();
                showToast(`❌ Upload error: ${error.message}`, 'error');
                return;
            }

            completeUploadStep();
        } else {
            // No files to upload, skip upload step
            completeUploadStep();
        }

        // ✅ CRITICAL: Clear temporary files ONLY after successful R2 upload
        tempFileStorage.clearFiles(mcuData.mcuId);

        // Start save step
        startSaveStep();

        // ✅ CRITICAL: Collect lab results for batch processing
        let labResults = [];
        if (labResultWidgetAdd) {
            labResults = labResultWidgetAdd.getAllLabResults() || [];
        }

        // Validate that we have data to save
        if (!mcuData || !mcuData.employeeId) {
            throw new Error('MCU data incomplete - missing required fields');
        }

        // ✅ BATCH SAVE: Use MCU batch service to atomically save MCU + lab results
        // This prevents race conditions and orphaned records on sequential MCU operations
        const batchResult = await mcuBatchService.saveMCUWithLabResults(mcuData, labResults, currentUser);

        if (!batchResult.success) {
            hideUnifiedLoading();
            const errorMsg = `⚠️ SEBAGIAN GAGAL atau ERROR:\n${batchResult.errors.join('\n')}\n\nMCU ID: ${batchResult.data.mcu?.mcuId || 'Unknown'}. Hubungi support!`;
            showToast(errorMsg, 'error');
            throw new Error(batchResult.errors[0] || 'Batch save failed');
        }

        completeSaveStep();

        // Success - show detailed result
        const createdMCU = batchResult.data.mcu;
        const labSaved = batchResult.data.labSaved.length;
        const labFailed = batchResult.data.labFailed.length;

        if (labFailed > 0) {
            showToast(`✅ MCU berhasil! Lab: ${labSaved}/${labSaved + labFailed} tersimpan (${labFailed} gagal).`, 'warning');
        } else {
            const labMsg = labSaved > 0 ? ` & ${labSaved} hasil lab` : '';
            showToast(`✅ MCU${labMsg} berhasil disimpan!`, 'success');
        }

        // Hide loading after a brief delay to show completion
        setTimeout(() => {
            hideUnifiedLoading();
        }, 500);

        // Close modal and reload data
        closeAddMCUModal();
        await loadData();

    } catch (error) {
        hideUnifiedLoading();
        showToast('Gagal menambah MCU: ' + error.message, 'error');
        // Note: Temporary files are kept in memory and will be cleared when user reopens the modal or reloads page
    }
};

window.viewMCUDetail = async function(mcuId) {
    try {
        // ✅ FIX: Ensure master data is loaded (including doctors) before displaying
        if (!doctors || doctors.length === 0) {
            doctors = await masterDataService.getAllDoctors();
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

        // Fill employee info with null checks
        const empNameEl = document.getElementById('mcu-detail-emp-name');
        if (empNameEl) empNameEl.textContent = emp?.name || '-';

        const empIdEl = document.getElementById('mcu-detail-emp-id');
        if (empIdEl) empIdEl.textContent = emp?.employeeId || '-';

        const empJobEl = document.getElementById('mcu-detail-emp-job');
        // Show job title: prefer matched master data name, fall back to raw employee job_title value
        if (empJobEl) empJobEl.textContent = empJobTitle || '-';

        const empDeptEl = document.getElementById('mcu-detail-emp-dept');
        if (empDeptEl) empDeptEl.textContent = dept?.name || empDept || '-';

        // Fill MCU info with null checks
        const mcuDetailEl = document.getElementById('mcu-detail-id');
        if (mcuDetailEl) mcuDetailEl.textContent = mcu.mcuId || '-';

        const mcuDateEl = document.getElementById('mcu-detail-date');
        if (mcuDateEl) mcuDateEl.textContent = formatDateDisplay(mcu.mcuDate) || '-';

        const mcuTypeEl = document.getElementById('mcu-detail-type');
        if (mcuTypeEl) mcuTypeEl.textContent = mcu.mcuType || '-';

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

        // Fill examination results with null checks
        const examFields = {
            'mcu-detail-bmi': mcu.bmi,
            'mcu-detail-bp': mcu.bloodPressure,
            'mcu-detail-rr': mcu.respiratoryRate,
            'mcu-detail-pulse': mcu.pulse,
            'mcu-detail-temp': mcu.temperature,
            'mcu-detail-chest-circumference': mcu.chestCircumference,
            'mcu-detail-audio': mcu.audiometry,
            'mcu-detail-spiro': mcu.spirometry,
            'mcu-detail-hbsag': mcu.hbsag,
            'mcu-detail-smoking-status': mcu.smokingStatus,
            'mcu-detail-exercise-frequency': mcu.exerciseFrequency,
            'mcu-detail-xray': mcu.xray,
            'mcu-detail-ekg': mcu.ekg,
            'mcu-detail-treadmill': mcu.treadmill,
            'mcu-detail-napza': mcu.napza,
            'mcu-detail-colorblind': mcu.colorblind
        };
        Object.entries(examFields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value || '-';
            }
        });

        // Fill 8-field vision details with null check
        const visionFields = [
            { id: 'mcu-detail-vision-distant-unaided-left', value: mcu.visionDistantUnaideLeft },
            { id: 'mcu-detail-vision-distant-unaided-right', value: mcu.visionDistantUnaideRight },
            { id: 'mcu-detail-vision-distant-spectacles-left', value: mcu.visionDistantSpectaclesLeft },
            { id: 'mcu-detail-vision-distant-spectacles-right', value: mcu.visionDistantSpectaclesRight },
            { id: 'mcu-detail-vision-near-unaided-left', value: mcu.visionNearUnaideLeft },
            { id: 'mcu-detail-vision-near-unaided-right', value: mcu.visionNearUnaideRight },
            { id: 'mcu-detail-vision-near-spectacles-left', value: mcu.visionNearSpectaclesLeft },
            { id: 'mcu-detail-vision-near-spectacles-right', value: mcu.visionNearSpectaclesRight }
        ];
        visionFields.forEach(field => {
            const el = document.getElementById(field.id);
            if (el) {
                el.textContent = field.value || '-';
            }
        });

        // Fill doctor data - compare as numbers to handle Supabase numeric IDs
        let doctor = null;

        if (mcu.doctor) {
            // Handle different ID formats: numeric, string, doctorId field
            const doctorId = String(mcu.doctor).trim();
            const mcuDoctorInt = parseInt(mcu.doctor);

            if (doctors.length > 0) {
            }

            doctor = doctors.find(d => {
                const match = String(d.id).trim() === doctorId ||
                       String(d.doctorId).trim() === doctorId ||
                       parseInt(d.id) === mcuDoctorInt ||
                       parseInt(d.doctorId) === mcuDoctorInt;

                if (match && d.name) {
                }
                return match;
            });
        }

        const doctorEl = document.getElementById('mcu-detail-doctor');
        if (doctorEl) {
            if (doctor && doctor.name) {
                doctorEl.textContent = doctor.name;
            } else if (mcu.doctor) {
                // Doctor ID is set but not found in list - show ID as fallback
                if (doctors.length > 0) {
                    const doctorIds = doctors.map(d => `${d.name}(id:${d.id},docId:${d.doctorId})`).join(', ');
                }
                doctorEl.textContent = `ID: ${mcu.doctor}`;
            } else {
                // No doctor assigned
                doctorEl.textContent = '-';
            }
        }

        // Fill referral data with null checks
        const referralFields = {
            'mcu-detail-recipient': mcu.recipient,
            'mcu-detail-keluhan': mcu.keluhanUtama,
            'mcu-detail-diagnosis': mcu.diagnosisKerja,
            'mcu-detail-alasan': mcu.alasanRujuk
        };
        Object.entries(referralFields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value || '-';
            }
        });

        // Fill results with null checks
        const initialResultEl = document.getElementById('mcu-detail-initial-result');
        if (initialResultEl) {
            initialResultEl.innerHTML = getStatusBadge(mcu.initialResult);
        }

        const initialNotesEl = document.getElementById('mcu-detail-initial-notes');
        if (initialNotesEl) {
            initialNotesEl.textContent = mcu.initialNotes || '-';
        }

        const finalResultSection = document.getElementById('final-result-section');
        if (finalResultSection) {
            if (mcu.finalResult) {
                const finalResultEl = document.getElementById('mcu-detail-final-result');
                if (finalResultEl) {
                    finalResultEl.innerHTML = getStatusBadge(mcu.finalResult);
                }
                const finalNotesEl = document.getElementById('mcu-detail-final-notes');
                if (finalNotesEl) {
                    finalNotesEl.textContent = mcu.finalNotes || '-';
                }
                finalResultSection.classList.remove('hidden');
            } else {
                finalResultSection.classList.add('hidden');
            }
        }

        // Load change history
        const changes = await mcuService.getChangeHistory(mcuId);

        if (changes && changes.length > 0) {
            const fieldLabels = {
                'mcuDate': 'Tanggal MCU',
                'mcuType': 'Jenis MCU',
                'bmi': 'BMI',
                'bloodPressure': 'Tekanan Darah',
                'respiratoryRate': 'RR (Frekuensi Nafas)',
                'pulse': 'Nadi',
                'temperature': 'Suhu',
                'chestCircumference': 'Lingkar Dada',
                'vision': 'Penglihatan',
                'audiometry': 'Audiometri',
                'spirometry': 'Spirometri',
                'xray': 'X-Ray',
                'ekg': 'EKG',
                'treadmill': 'Treadmill',
                'hbsag': 'HBsAg',
                'sgot': 'SGOT',
                'sgpt': 'SGPT',
                'cbc': 'CBC',
                'napza': 'NAPZA',
                'colorblind': 'Buta Warna',
                'doctor': 'Dokter',
                'recipient': 'Penerima Rujukan',
                'keluhanUtama': 'Keluhan Utama',
                'diagnosisKerja': 'Diagnosis Kerja',
                'alasanRujuk': 'Alasan Rujuk',
                'initialResult': 'Hasil Awal',
                'initialNotes': 'Catatan Awal',
                'finalResult': 'Hasil Akhir',
                'finalNotes': 'Catatan Akhir',
                'status': 'Status',
                'labResult': 'Hasil Lab'
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

        // Load and display lab results
        try {
            let labResults = await labService.getPemeriksaanLabByMcuId(mcuId);
            const labResultsBody = document.getElementById('mcu-detail-lab-results-body');

            if (labResults && labResults.length > 0) {
                // Sort lab results by desired display order (Asam Urat → Glukosa Puasa → ... → Ureum)
                labResults = sortLabResultsByDisplayOrder(labResults);

                let html = '';
                labResults.forEach(result => {
                    // Determine status based on value and range
                    let status = '-';
                    let statusClass = 'text-gray-500';
                    if (result.min_range_reference !== null && result.max_range_reference !== null) {
                        const value = parseFloat(result.value);
                        const minRange = parseFloat(result.min_range_reference);
                        const maxRange = parseFloat(result.max_range_reference);
                        if (!isNaN(value)) {
                            if (value < minRange) {
                                status = 'Low';
                                statusClass = 'text-blue-600 font-semibold';
                            } else if (value > maxRange) {
                                status = 'High';
                                statusClass = 'text-red-600 font-semibold';
                            } else {
                                status = 'Normal';
                                statusClass = 'text-green-600 font-semibold';
                            }
                        }
                    }

                    const rangeText = (result.min_range_reference !== null && result.max_range_reference !== null)
                        ? `${result.min_range_reference} - ${result.max_range_reference}`
                        : '-';

                    html += `<tr class="border-b hover:bg-white">
                        <td class="py-2 pr-3">${result.lab_items?.name || 'N/A'}</td>
                        <td class="py-2 pr-3 font-medium">${result.value || '-'}</td>
                        <td class="py-2 pr-3">${result.unit || '-'}</td>
                        <td class="py-2 pr-3 text-xs">${rangeText}</td>
                        <td class="py-2 pr-3"><span class="${statusClass}">${status}</span></td>
                    </tr>`;
                });

                labResultsBody.innerHTML = html;
            } else {
                labResultsBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-3">Tidak ada hasil lab</td></tr>';
            }
        } catch (error) {
            document.getElementById('mcu-detail-lab-results-body').innerHTML = '<tr><td colspan="5" class="text-center text-red-500 py-3">Gagal memuat hasil lab</td></tr>';
        }

        // Load and display medical and family histories
        try {
            const { MedicalHistories, FamilyHistories } = database;
            const medicalHistories = await MedicalHistories.getByMcuId(mcuId);
            const familyHistories = await FamilyHistories.getByMcuId(mcuId);

            const medicalHistoryEl = document.getElementById('mcu-detail-medical-history');
            const familyHistoryEl = document.getElementById('mcu-detail-family-history');

            // Display medical histories
            if (medicalHistories && medicalHistories.length > 0) {
                let medicalHtml = '';
                medicalHistories.forEach(record => {
                    const diseaseInfo = `<div class="bg-blue-50 p-2 rounded border border-blue-200 text-sm">
                        <span class="font-medium">${record.disease_name || record.diseaseName}</span>
                        ${record.year_diagnosed ? `<span class="text-gray-600 ml-2">(${record.year_diagnosed})</span>` : ''}
                    </div>`;
                    medicalHtml += diseaseInfo;
                });
                medicalHistoryEl.innerHTML = medicalHtml;
            } else {
                medicalHistoryEl.innerHTML = '<p class="text-sm text-gray-500">Tidak ada riwayat penyakit</p>';
            }

            // Display family histories
            if (familyHistories && familyHistories.length > 0) {
                let familyHtml = '';
                familyHistories.forEach(record => {
                    const diseaseInfo = `<div class="bg-green-50 p-2 rounded border border-green-200 text-sm">
                        <span class="font-medium">${record.family_member || record.familyMember}:</span>
                        <span class="ml-1">${record.disease_name || record.diseaseName}</span>
                    </div>`;
                    familyHtml += diseaseInfo;
                });
                familyHistoryEl.innerHTML = familyHtml;
            } else {
                familyHistoryEl.innerHTML = '<p class="text-sm text-gray-500">Tidak ada riwayat penyakit keluarga</p>';
            }
        } catch (error) {
            console.warn('Warning: Failed to load medical/family histories:', error);
            document.getElementById('mcu-detail-medical-history').innerHTML = '<p class="text-sm text-gray-500">-</p>';
            document.getElementById('mcu-detail-family-history').innerHTML = '<p class="text-sm text-gray-500">-</p>';
        }

        // Initialize file list viewer for MCU documents
        const filesContainer = document.getElementById('mcu-detail-files-container');
        if (filesContainer) {
            new FileListViewer('mcu-detail-files-container', {
                mcuId: mcuId,
                employeeId: mcu.employeeId,
                readOnly: true, // View only in detail modal
                compact: false  // Standard detailed layout
            });
        }

        openModal('mcu-detail-modal');
    } catch (error) {

        showToast('Gagal memuat detail MCU: ' + error.message, 'error');
    }
};

window.closeMCUDetailModal = function() {
    closeModal('mcu-detail-modal');
};

/**
 * Add Medical History Entry in Edit Modal
 */
window.editAddMedicalHistory = function() {
    const diseaseSelect = document.getElementById('edit-mcu-medical-history-disease');
    const customInput = document.getElementById('edit-mcu-medical-history-custom');
    const listContainer = document.getElementById('edit-mcu-medical-history-list');

    let diseaseName = diseaseSelect.value;
    if (!diseaseName) {
        showToast('Pilih penyakit terlebih dahulu', 'warning');
        return;
    }

    // Handle custom disease entry
    if (diseaseName === 'custom') {
        diseaseName = customInput.value.trim();
        if (!diseaseName) {
            showToast('Sebutkan nama penyakit', 'warning');
            return;
        }
        customInput.value = '';
        customInput.classList.add('hidden');
    }

    // Prevent duplicates
    const existingItems = Array.from(listContainer.children).map(el => el.dataset.disease);
    if (existingItems.includes(diseaseName)) {
        showToast('Penyakit sudah ditambahkan', 'warning');
        return;
    }

    // Create and add item
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200 text-sm';
    item.dataset.disease = diseaseName;
    item.innerHTML = `
        <span class="font-medium">${diseaseName}</span>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 font-semibold">×</button>
    `;
    listContainer.appendChild(item);

    // Reset select
    diseaseSelect.value = '';
};

/**
 * Add Family History Entry in Edit Modal
 */
window.editAddFamilyHistory = function() {
    const diseaseSelect = document.getElementById('edit-mcu-family-history-disease');
    const memberSelect = document.getElementById('edit-mcu-family-history-member');
    const customInput = document.getElementById('edit-mcu-family-history-custom');
    const listContainer = document.getElementById('edit-mcu-family-history-list');

    let diseaseName = diseaseSelect.value;
    const familyMember = memberSelect.value;

    if (!diseaseName || !familyMember) {
        showToast('Pilih penyakit dan anggota keluarga', 'warning');
        return;
    }

    // Handle custom disease entry
    if (diseaseName === 'custom') {
        diseaseName = customInput.value.trim();
        if (!diseaseName) {
            showToast('Sebutkan nama penyakit', 'warning');
            return;
        }
        customInput.value = '';
        customInput.classList.add('hidden');
    }

    // Prevent exact duplicates
    const existingItems = Array.from(listContainer.children).map(el =>
        `${el.dataset.disease}:${el.dataset.member}`
    );
    if (existingItems.includes(`${diseaseName}:${familyMember}`)) {
        showToast('Kombinasi penyakit dan anggota keluarga sudah ditambahkan', 'warning');
        return;
    }

    // Create and add item
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between bg-green-50 p-2 rounded border border-green-200 text-sm';
    item.dataset.disease = diseaseName;
    item.dataset.member = familyMember;
    item.innerHTML = `
        <span class="font-medium">${familyMember}: ${diseaseName}</span>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 font-semibold">×</button>
    `;
    listContainer.appendChild(item);

    // Reset selects
    diseaseSelect.value = '';
    memberSelect.value = '';
};

window.editMCU = async function() {
    if (!window.currentMCUId) return;

    try {
        // ✅ CRITICAL: Ensure master data is loaded before opening edit modal
        if (!doctors || doctors.length === 0) {
            doctors = await masterDataService.getAllDoctors();
        }

        const mcu = await mcuService.getById(window.currentMCUId);
        if (!mcu) {
            showToast('MCU tidak ditemukan', 'error');
            return;
        }

        // Close detail modal first
        closeMCUDetailModal();

        // Open the modal FIRST so DOM elements are visible
        openModal('edit-mcu-modal');

        // ✅ Use pre-initialized lab form (initialized once on page load)
        // No need to reinit - form is permanent like other form fields

        // Initialize file upload widget for edit modal
        const currentUser = authService.getCurrentUser();
        fileUploadWidget = new FileUploadWidget('file-upload-container-edit', {
            employeeId: mcu.employeeId,
            mcuId: window.currentMCUId,
            userId: currentUser?.userId || currentUser?.user_id,
            onUploadComplete: () => {
                showToast('File berhasil ditambahkan ke antrian upload', 'success');
            },
            onError: (error) => {
                showToast('Upload gagal: ' + error, 'error');
            }
        });

        // Use setTimeout to ensure DOM is ready before setting values
        setTimeout(async () => {
            try {
                // ✅ FIX: Don't reset form (would clear lab-results-container)
                // Instead, only clear specific input fields manually
                const fieldsToClear = [
                    'edit-mcu-id', 'edit-mcu-type', 'edit-mcu-date',
                    'edit-mcu-bmi', 'edit-mcu-bp', 'edit-mcu-rr', 'edit-mcu-pulse',
                    'edit-mcu-temp', 'edit-mcu-smoking-status', 'edit-mcu-exercise-frequency',
                    'edit-mcu-vision-distant', 'edit-mcu-vision-near', 'edit-mcu-audio', 'edit-mcu-spiro',
                    'edit-mcu-xray', 'edit-mcu-ekg', 'edit-mcu-treadmill',
                    'edit-mcu-napza', 'edit-mcu-colorblind', 'edit-mcu-recipient',
                    'edit-mcu-keluhan', 'edit-mcu-diagnosis', 'edit-mcu-alasan',
                    'edit-mcu-hbsag', 'edit-mcu-initial-result', 'edit-mcu-initial-notes',
                    'edit-mcu-final-result', 'edit-mcu-final-notes'
                ];
                fieldsToClear.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });

                // ✅ CRITICAL FIX: Load existing lab results using relaxed validation
                // Use getPemeriksaanLabByMcuIdForEdit to show ALL data even if values are invalid/outside range
                if (labResultWidgetEdit) {
                    try {
                        const existingLabResults = await labService.getPemeriksaanLabByMcuIdForEdit(window.currentMCUId);
                        labResultWidgetEdit.loadExistingResults(existingLabResults);
                    } catch (labError) {
                        // Continue even if lab results fail to load
                    }
                }

                // Fill edit MCU form with current values
                document.getElementById('edit-mcu-id').value = mcu.mcuId || '';
                // ✅ CRITICAL: Store employeeId for use in handleEditMCU (needed for lab results)
                document.getElementById('edit-mcu-id').dataset.employeeId = mcu.employeeId || '';
                document.getElementById('edit-mcu-type').value = mcu.mcuType || '';
                document.getElementById('edit-mcu-date').value = mcu.mcuDate || '';

                // Fill examination fields - use explicit value assignment
                const bioFields = {
                    'edit-mcu-bmi': mcu.bmi,
                    'edit-mcu-bp': mcu.bloodPressure,
                    'edit-mcu-rr': mcu.respiratoryRate,
                    'edit-mcu-pulse': mcu.pulse,
                    'edit-mcu-temp': mcu.temperature,
                    'edit-mcu-chest-circumference': mcu.chestCircumference,
                    'edit-mcu-smoking-status': mcu.smokingStatus,
                    'edit-mcu-exercise-frequency': mcu.exerciseFrequency,
                    'edit-mcu-vision-distant': mcu.visionDistant,
                    'edit-mcu-vision-near': mcu.visionNear,
                    'edit-mcu-audio': mcu.audiometry,
                    'edit-mcu-spiro': mcu.spirometry,
                    'edit-mcu-xray': mcu.xray,
                    'edit-mcu-ekg': mcu.ekg,
                    'edit-mcu-treadmill': mcu.treadmill,
                    'edit-mcu-napza': mcu.napza,
                    'edit-mcu-colorblind': mcu.colorblind,
                    'edit-mcu-recipient': mcu.recipient,
                    'edit-mcu-keluhan': mcu.keluhanUtama,
                    'edit-mcu-diagnosis': mcu.diagnosisKerja,
                    'edit-mcu-alasan': mcu.alasanRujuk
                };

                // ✅ CRITICAL FIX: Handle examination fields with "Lainnya" support
                // If value doesn't match standard options, set as "Lainnya" and show custom field
                const examinationFields = {
                    'edit-mcu-audio': { value: mcu.audiometry, otherId: 'edit-mcu-audio-other', options: ['Normal', 'Gangguan Ringan', 'Lainnya'] },
                    'edit-mcu-spiro': { value: mcu.spirometry, otherId: 'edit-mcu-spiro-other', options: ['Normal', 'Restriktif', 'Obstruktif', 'Lainnya'] },
                    'edit-mcu-xray': { value: mcu.xray, otherId: 'edit-mcu-xray-other', options: ['Normal', 'Lainnya'] },
                    'edit-mcu-ekg': { value: mcu.ekg, otherId: 'edit-mcu-ekg-other', options: ['Normal', 'Normal Resting ECG', 'Lainnya'] },
                    'edit-mcu-treadmill': { value: mcu.treadmill, otherId: 'edit-mcu-treadmill-other', options: ['Normal', 'Tidak diperiksa', 'Lainnya'] },
                    'edit-mcu-napza': { value: mcu.napza, otherId: 'edit-mcu-napza-other', options: ['Negatif', 'Lainnya'] },
                    'edit-mcu-colorblind': { value: mcu.colorblind, otherId: 'edit-mcu-colorblind-other', options: ['Normal', 'Buta Warna Parsial', 'Lainnya'] }
                };

                // Set examination fields with smart "Lainnya" handling
                Object.entries(examinationFields).forEach(([id, config]) => {
                    const selectEl = document.getElementById(id);
                    const otherEl = document.getElementById(config.otherId);

                    if (config.value) {
                        // Check if value matches any standard option
                        if (config.options.includes(config.value) || config.value === '') {
                            // Standard option - set directly
                            if (selectEl) selectEl.value = config.value;
                            // Hide the "Lainnya" field
                            if (otherEl) otherEl.classList.add('hidden');
                        } else {
                            // Custom value - set as "Lainnya"
                            if (selectEl) selectEl.value = 'Lainnya';
                            // Show and populate the "Lainnya" field
                            if (otherEl) {
                                otherEl.classList.remove('hidden');
                                otherEl.value = config.value;
                            }
                        }
                    } else {
                        // No value - clear and hide Lainnya field
                        if (selectEl) selectEl.value = '';
                        if (otherEl) otherEl.classList.add('hidden');
                    }

                    // Trigger change event
                    if (selectEl) selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                });

                // Set all other bio fields (non-examination)
                Object.entries(bioFields).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (el && !examinationFields[id]) {
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

                // Handle vision fields with "Lainnya" support
                const visionFields = [
                    { id: 'edit-mcu-vision-distant-unaided-left', value: mcu.visionDistantUnaideLeft, otherId: 'edit-mcu-vision-distant-unaided-left-other' },
                    { id: 'edit-mcu-vision-distant-unaided-right', value: mcu.visionDistantUnaideRight, otherId: 'edit-mcu-vision-distant-unaided-right-other' },
                    { id: 'edit-mcu-vision-distant-spectacles-left', value: mcu.visionDistantSpectaclesLeft, otherId: 'edit-mcu-vision-distant-spectacles-left-other' },
                    { id: 'edit-mcu-vision-distant-spectacles-right', value: mcu.visionDistantSpectaclesRight, otherId: 'edit-mcu-vision-distant-spectacles-right-other' },
                    { id: 'edit-mcu-vision-near-unaided-left', value: mcu.visionNearUnaideLeft, otherId: 'edit-mcu-vision-near-unaided-left-other' },
                    { id: 'edit-mcu-vision-near-unaided-right', value: mcu.visionNearUnaideRight, otherId: 'edit-mcu-vision-near-unaided-right-other' },
                    { id: 'edit-mcu-vision-near-spectacles-left', value: mcu.visionNearSpectaclesLeft, otherId: 'edit-mcu-vision-near-spectacles-left-other' },
                    { id: 'edit-mcu-vision-near-spectacles-right', value: mcu.visionNearSpectaclesRight, otherId: 'edit-mcu-vision-near-spectacles-right-other' }
                ];

                visionFields.forEach(field => {
                    if (field.value) {
                        const selectEl = document.getElementById(field.id);
                        const otherEl = document.getElementById(field.otherId);

                        // Check if value matches any standard option
                        const standardOptions = ['', '-', '6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'];
                        if (standardOptions.includes(field.value)) {
                            // Set the standard option
                            if (selectEl) selectEl.value = field.value;
                            // Hide the "Lainnya" field
                            if (otherEl) otherEl.classList.add('hidden');
                        } else {
                            // Custom value - set as "Lainnya"
                            if (selectEl) selectEl.value = 'Lainnya';
                            // Show and populate the "Lainnya" field
                            if (otherEl) {
                                otherEl.classList.remove('hidden');
                                otherEl.value = field.value;
                            }
                        }
                    }
                });

                // ✅ Load existing medical and family histories
                try {
                    const medicalHistories = await database.MedicalHistories.getByMcuId(window.currentMCUId);
                    const familyHistories = await database.FamilyHistories.getByMcuId(window.currentMCUId);

                    // Populate medical history list
                    const medicalHistoryList = document.getElementById('edit-mcu-medical-history-list');
                    if (medicalHistoryList && medicalHistories.length > 0) {
                        medicalHistoryList.innerHTML = '';
                        medicalHistories.forEach(history => {
                            const item = document.createElement('div');
                            item.className = 'flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200 text-sm';
                            item.dataset.disease = history.disease_name || history.diseaseName;
                            item.innerHTML = `
                                <span class="font-medium">${history.disease_name || history.diseaseName}</span>
                                <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 font-semibold">×</button>
                            `;
                            medicalHistoryList.appendChild(item);
                        });
                    }

                    // Populate family history list
                    const familyHistoryList = document.getElementById('edit-mcu-family-history-list');
                    if (familyHistoryList && familyHistories.length > 0) {
                        familyHistoryList.innerHTML = '';
                        familyHistories.forEach(history => {
                            const item = document.createElement('div');
                            item.className = 'flex items-center justify-between bg-green-50 p-2 rounded border border-green-200 text-sm';
                            item.dataset.disease = history.disease_name || history.diseaseName;
                            item.dataset.member = history.family_member || history.familyMember;
                            item.innerHTML = `
                                <span class="font-medium">${history.family_member || history.familyMember}: ${history.disease_name || history.diseaseName}</span>
                                <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 font-semibold">×</button>
                            `;
                            familyHistoryList.appendChild(item);
                        });
                    }
                } catch (historyError) {
                    // Continue even if history loading fails
                    console.warn('Warning: Failed to load medical/family history:', historyError);
                }

            } catch (error) {
            }
        }, 50);

    } catch (error) {
        showToast('Gagal membuka form edit: ' + error.message, 'error');
    }
};

window.closeEditMCUModal = function() {
    closeModal('edit-mcu-modal');

    // ✅ Clear lab widget state to prevent residual data
    if (labResultWidgetEdit) {
        labResultWidgetEdit.clear();
    }

    // ✅ Clear medical and family history lists
    const medicalHistoryList = document.getElementById('edit-mcu-medical-history-list');
    if (medicalHistoryList) {
        medicalHistoryList.innerHTML = '';
    }
    const familyHistoryList = document.getElementById('edit-mcu-family-history-list');
    if (familyHistoryList) {
        familyHistoryList.innerHTML = '';
    }

    // ✅ NOTE: Do NOT clear container innerHTML - static form HTML is permanent in the modal
    // Just clear the input values via the widget.clear() call above
};

window.handleEditMCU = async function(event) {
    event.preventDefault();

    const mcuId = document.getElementById('edit-mcu-id').value;

    try {
        const currentUser = authService.getCurrentUser();

        // ✅ FIX: Get doctor ID and convert to number
        const doctorSelect = document.getElementById('edit-mcu-doctor');
        const doctorValue = doctorSelect.value;
        const doctorId = doctorValue ? parseInt(doctorValue, 10) : null;

        // Debug: Log doctor selection
        if (!doctorValue) {
            showToast('❌ Harap pilih dokter pemeriksa sebelum menyimpan', 'error');
            return; // Stop form submission if doctor is not selected
        }

        /**
         * Helper function to get field value or "Lainnya" custom input
         */
        const getFieldValue = (fieldId, otherFieldId) => {
            const value = document.getElementById(fieldId).value;
            if (value === 'Lainnya') {
                const otherValue = document.getElementById(otherFieldId).value;
                return otherValue || null;
            }
            return value || null;
        };

        const updateData = {
            mcuType: document.getElementById('edit-mcu-type').value,
            mcuDate: document.getElementById('edit-mcu-date').value,
            bmi: document.getElementById('edit-mcu-bmi').value ? parseFloat(document.getElementById('edit-mcu-bmi').value) : null,
            bloodPressure: document.getElementById('edit-mcu-bp').value || null,
            respiratoryRate: document.getElementById('edit-mcu-rr').value || null,
            pulse: document.getElementById('edit-mcu-pulse').value || null,
            temperature: document.getElementById('edit-mcu-temp').value || null,
            chestCircumference: document.getElementById('edit-mcu-chest-circumference').value ? parseFloat(document.getElementById('edit-mcu-chest-circumference').value) : null,
            smokingStatus: document.getElementById('edit-mcu-smoking-status').value || null,
            exerciseFrequency: document.getElementById('edit-mcu-exercise-frequency').value || null,
            // 8-field vision structure with "Lainnya" support
            visionDistantUnaideLeft: getFieldValue('edit-mcu-vision-distant-unaided-left', 'edit-mcu-vision-distant-unaided-left-other'),
            visionDistantUnaideRight: getFieldValue('edit-mcu-vision-distant-unaided-right', 'edit-mcu-vision-distant-unaided-right-other'),
            visionDistantSpectaclesLeft: getFieldValue('edit-mcu-vision-distant-spectacles-left', 'edit-mcu-vision-distant-spectacles-left-other'),
            visionDistantSpectaclesRight: getFieldValue('edit-mcu-vision-distant-spectacles-right', 'edit-mcu-vision-distant-spectacles-right-other'),
            visionNearUnaideLeft: getFieldValue('edit-mcu-vision-near-unaided-left', 'edit-mcu-vision-near-unaided-left-other'),
            visionNearUnaideRight: getFieldValue('edit-mcu-vision-near-unaided-right', 'edit-mcu-vision-near-unaided-right-other'),
            visionNearSpectaclesLeft: getFieldValue('edit-mcu-vision-near-spectacles-left', 'edit-mcu-vision-near-spectacles-left-other'),
            visionNearSpectaclesRight: getFieldValue('edit-mcu-vision-near-spectacles-right', 'edit-mcu-vision-near-spectacles-right-other'),
            audiometry: getFieldValue('edit-mcu-audio', 'edit-mcu-audio-other'),
            spirometry: getFieldValue('edit-mcu-spiro', 'edit-mcu-spiro-other'),
            hbsag: document.getElementById('edit-mcu-hbsag').value || null,
            xray: getFieldValue('edit-mcu-xray', 'edit-mcu-xray-other'),
            ekg: getFieldValue('edit-mcu-ekg', 'edit-mcu-ekg-other'),
            treadmill: getFieldValue('edit-mcu-treadmill', 'edit-mcu-treadmill-other'),
            napza: getFieldValue('edit-mcu-napza', 'edit-mcu-napza-other'),
            colorblind: getFieldValue('edit-mcu-colorblind', 'edit-mcu-colorblind-other'),
            doctor: doctorId,
            recipient: document.getElementById('edit-mcu-recipient').value || null,
            keluhanUtama: document.getElementById('edit-mcu-keluhan').value || null,
            diagnosisKerja: document.getElementById('edit-mcu-diagnosis').value || null,
            alasanRujuk: document.getElementById('edit-mcu-alasan').value || null,
            initialResult: document.getElementById('edit-mcu-initial-result').value,
            initialNotes: document.getElementById('edit-mcu-initial-notes').value
        };

        // Add final result if filled
        const finalResult = document.getElementById('edit-mcu-final-result').value;
        if (finalResult) {
            updateData.finalResult = finalResult;
            updateData.finalNotes = document.getElementById('edit-mcu-final-notes').value || null;
        }

        // Show unified loading with step tracking
        const tempFiles = tempFileStorage.getFiles(mcuId);
        showUnifiedLoading('Memproses...', 'Mengunggah file dan menyimpan data');

        // ✅ FIX: Upload temporary files to Cloudflare R2 BEFORE clearing from storage
        if (tempFiles && tempFiles.length > 0) {
            startUploadStep(tempFiles.length);

            try {
                const { uploadBatchFiles } = await import('../services/supabaseStorageService.js');
                const uploadResult = await uploadBatchFiles(
                    tempFiles,
                    updateData.employeeId || (await mcuService.getById(mcuId)).employeeId,
                    mcuId,
                    currentUser.id,
                    // Progress callback
                    (current, total) => {
                        updateUploadProgress(current, total);
                    }
                );

                if (!uploadResult.success && uploadResult.uploadedCount === 0) {
                    // All uploads failed - warn but continue with MCU update
                    showToast(`⚠️ File upload ke R2 gagal: ${uploadResult.error}`, 'warning');
                } else if (uploadResult.failedCount > 0) {
                    // Some uploads failed
                    showToast(`⚠️ ${uploadResult.failedCount} file gagal diunggah`, 'warning');
                }
            } catch (error) {
                hideUnifiedLoading();
                showToast(`❌ Upload error: ${error.message}`, 'error');
                return;
            }

            completeUploadStep();
        } else {
            // No files to upload, skip upload step
            completeUploadStep();
        }

        // ✅ CRITICAL: Clear temporary files ONLY after upload attempt
        tempFileStorage.clearFiles(mcuId);

        // Start save step
        startSaveStep();

        // ✅ CRITICAL FIX: Get employeeId from hidden data attribute (stored when modal was populated)
        const employeeIdElement = document.getElementById('edit-mcu-id');
        const employeeId = employeeIdElement?.dataset?.employeeId;
        if (!employeeId) {
            hideUnifiedLoading();
            showToast('Employee ID tidak ditemukan. Silakan reload halaman.', 'error');
            throw new Error('Employee ID not found in edit form');
        }

        // Collect lab results if widget exists
        let labResults = [];
        if (labResultWidgetEdit) {
            // VALIDATION: Only validate if user has made changes to lab items
            if (labResultWidgetEdit.hasChanges()) {
                const validationErrors = labResultWidgetEdit.validateAllFieldsFilled();
                if (validationErrors.length > 0) {
                    hideUnifiedLoading();
                    const errorMsg = 'Semua pemeriksaan lab harus diisi:\n' + validationErrors.join('\n');
                    showToast(errorMsg, 'error');
                    throw new Error(errorMsg);
                }
            }

            const rawLabResults = labResultWidgetEdit.getAllLabResults();

            // ✅ CRITICAL: Add employeeId to each lab result (required for database INSERT)
            labResults = rawLabResults.map(lab => ({
                ...lab,
                employeeId: employeeId
            }));

        }

        // ✅ Handle medical and family history updates
        try {
            // Delete existing histories
            await database.MedicalHistories.deleteByMcuId(mcuId);
            await database.FamilyHistories.deleteByMcuId(mcuId);

            // Collect updated histories from form
            const medicalHistories = getMedicalHistoryData();
            const familyHistories = getFamilyHistoryData();

            // Save new histories
            if (medicalHistories.length > 0) {
                const medicalHistoriesWithMcuId = medicalHistories.map(history => ({
                    ...history,
                    mcu_id: mcuId,
                    mcuId: mcuId
                }));
                await database.MedicalHistories.create(medicalHistoriesWithMcuId);
            }

            if (familyHistories.length > 0) {
                const familyHistoriesWithMcuId = familyHistories.map(history => ({
                    ...history,
                    mcu_id: mcuId,
                    mcuId: mcuId
                }));
                await database.FamilyHistories.create(familyHistoriesWithMcuId);
            }
        } catch (historyError) {
            console.warn('Warning: Failed to update medical/family history:', historyError);
            // Continue with MCU update even if history save fails
        }

        // ✅ BATCH UPDATE: Use batch service for atomic MCU + lab update
        const batchResult = await mcuBatchService.updateMCUWithLabResults(mcuId, updateData, labResults, currentUser);

        // ✅ IMPORTANT: Save lab changes to mcuChanges table so they appear in change history
        try {
            const { database } = await import('../services/database.js');
            let labChanges = [];

            // Helper to get lab item name from ID
            const getLabItemName = (labItemId) => {
                const item = LAB_ITEMS_MAPPING[labItemId];
                return item ? item.name : `Item ${labItemId}`;
            };

            if (batchResult.data.labSaved.length > 0) {
                for (const saved of batchResult.data.labSaved) {
                    labChanges.push({
                        fieldLabel: `Hasil Lab (Baru): ${getLabItemName(saved.labItemId)}`,
                        fieldChanged: 'labResults',
                        oldValue: '-',
                        newValue: `${saved.value}`
                    });
                }
            }

            if (batchResult.data.labUpdated.length > 0) {
                for (const updated of batchResult.data.labUpdated) {
                    // ✅ ONLY record if value actually changed (not identical)
                    if (updated.oldValue !== updated.newValue) {
                        labChanges.push({
                            fieldLabel: `Hasil Lab (Update): ${getLabItemName(updated.labItemId)}`,
                            fieldChanged: 'labResults',
                            oldValue: `${updated.oldValue}`,
                            newValue: `${updated.newValue}`
                        });
                    }
                }
            }

            if (batchResult.data.labDeleted.length > 0) {
                for (const deleted of batchResult.data.labDeleted) {
                    labChanges.push({
                        fieldLabel: `Hasil Lab (Dihapus): ${getLabItemName(deleted.labItemId)}`,
                        fieldChanged: 'labResults',
                        oldValue: `${deleted.oldValue}`,
                        newValue: '-'
                    });
                }
            }

            for (const labChange of labChanges) {
                await database.add('mcuChanges', {
                    mcuId: mcuId,
                    fieldName: labChange.fieldLabel,
                    fieldChanged: labChange.fieldChanged,
                    oldValue: labChange.oldValue,
                    newValue: labChange.newValue,
                    changedBy: currentUser?.userId || currentUser?.id,
                    changedAt: new Date().toISOString()
                });
            }
        } catch (labChangeError) {
            // Silently fail - lab save succeeded but change tracking failed (non-critical)
        }

        completeSaveStep();

        // Show errors if any occurred
        if (batchResult.errors.length > 0) {
            const errorMsg = `⚠️ Beberapa operasi gagal:\n${batchResult.errors.join('\n')}`;
            showToast(errorMsg, 'warning');
        }

        // Hide loading after a brief delay to show completion
        setTimeout(() => {
            hideUnifiedLoading();
        }, 500);

        showToast('Data MCU berhasil diupdate', 'success');
        closeEditMCUModal();

        // Reload if viewing from detail
        if (window.currentMCUId === mcuId) {
            await viewMCUDetail(mcuId);
        }
    } catch (error) {
        hideUnifiedLoading();
        showToast('Gagal mengupdate MCU: ' + error.message, 'error');
    }
};

/**
 * Delete MCU with soft delete
 * Also handles file cleanup in Cloudflare and Supabase
 */
window.handleDeleteMCU = async function() {
    const mcuId = window.currentMCUId;
    if (!mcuId) {
        showToast('MCU ID tidak ditemukan', 'error');
        return;
    }

    confirmDialog(
        'Apakah Anda yakin ingin menghapus MCU ini? Data dapat di-restore dari "Data Terhapus".',
        async () => {
            showUnifiedLoading('Menghapus MCU...', 'Mohon tunggu');

            try {
                // Wait for Supabase to be ready
                await supabaseReady;


                // Step 1: Soft delete MCU record (move to trash)
                showUnifiedLoading('Menghapus MCU...', 'Memindahkan ke Data Terhapus', 1, 2);

                // Get current user from auth (already imported at top)
                const currentUser = await authService.getCurrentUser();

                // Use mcuService.softDelete (soft delete - moves to trash/Data Terhapus)
                const result = await mcuService.softDelete(mcuId, currentUser);

                if (!result) {
                    throw new Error('Gagal menghapus MCU - softDelete returned false');
                }

                // Verify MCU was actually soft-deleted
                const deletedMCU = await mcuService.getById(mcuId);

                if (!deletedMCU?.deletedAt) {
                    throw new Error('MCU tidak berhasil dipindahkan ke Data Terhapus');
                }

                // Step 2: Complete
                showUnifiedLoading('Menghapus MCU...', 'Selesai', 2, 2);

                hideUnifiedLoading();
                showToast('MCU berhasil dihapus', 'success');

                // Close detail modal and reload data
                window.closeMCUDetailModal();
                await loadData();

            } catch (error) {
                hideUnifiedLoading();
                showToast('Gagal menghapus MCU: ' + error.message, 'error');
            }
        }
    );
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

/**
 * Add Medical History Entry (for Tambah MCU modal)
 */
window.addMedicalHistory = function() {
    const diseaseSelect = document.getElementById('mcu-medical-history-disease');
    const customInput = document.getElementById('mcu-medical-history-custom');
    const listContainer = document.getElementById('mcu-medical-history-list');

    let diseaseName = diseaseSelect.value;
    if (!diseaseName) {
        showToast('Pilih penyakit terlebih dahulu', 'warning');
        return;
    }

    // Handle custom disease entry
    if (diseaseName === 'custom') {
        diseaseName = customInput.value.trim();
        if (!diseaseName) {
            showToast('Sebutkan nama penyakit', 'warning');
            return;
        }
        customInput.value = '';
        customInput.classList.add('hidden');
    }

    // Prevent duplicates
    const existingItems = Array.from(listContainer.children).map(el => el.dataset.disease);
    if (existingItems.includes(diseaseName)) {
        showToast('Penyakit sudah ditambahkan', 'warning');
        return;
    }

    // Create and add item
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200 text-sm';
    item.dataset.disease = diseaseName;
    item.innerHTML = `
        <span class="font-medium">${diseaseName}</span>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 font-semibold">×</button>
    `;
    listContainer.appendChild(item);

    // Reset select
    diseaseSelect.value = '';
};

/**
 * Add Family History Entry (for Tambah MCU modal)
 */
window.addFamilyHistory = function() {
    const diseaseSelect = document.getElementById('mcu-family-history-disease');
    const memberSelect = document.getElementById('mcu-family-history-member');
    const customInput = document.getElementById('mcu-family-history-custom');
    const listContainer = document.getElementById('mcu-family-history-list');

    let diseaseName = diseaseSelect.value;
    const familyMember = memberSelect.value;

    if (!diseaseName || !familyMember) {
        showToast('Pilih penyakit dan anggota keluarga', 'warning');
        return;
    }

    // Handle custom disease entry
    if (diseaseName === 'custom') {
        diseaseName = customInput.value.trim();
        if (!diseaseName) {
            showToast('Sebutkan nama penyakit', 'warning');
            return;
        }
        customInput.value = '';
        customInput.classList.add('hidden');
    }

    // Prevent exact duplicates
    const existingItems = Array.from(listContainer.children).map(el =>
        `${el.dataset.disease}:${el.dataset.member}`
    );
    if (existingItems.includes(`${diseaseName}:${familyMember}`)) {
        showToast('Kombinasi penyakit dan anggota keluarga sudah ditambahkan', 'warning');
        return;
    }

    // Create and add item
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between bg-green-50 p-2 rounded border border-green-200 text-sm';
    item.dataset.disease = diseaseName;
    item.dataset.member = familyMember;
    item.innerHTML = `
        <span class="font-medium">${familyMember}: ${diseaseName}</span>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800 font-semibold">×</button>
    `;
    listContainer.appendChild(item);

    // Reset selects
    diseaseSelect.value = '';
    memberSelect.value = '';
};

/**
 * Collect Medical History from form (for Tambah MCU modal)
 */
function getMedicalHistoryData() {
    const listContainer = document.getElementById('mcu-medical-history-list');
    const items = Array.from(listContainer.children).map(el => ({
        disease_name: el.dataset.disease,
        year_diagnosed: null
    }));
    return items;
}

/**
 * Collect Family History from form (for Tambah MCU modal)
 */
function getFamilyHistoryData() {
    const listContainer = document.getElementById('mcu-family-history-list');
    const items = Array.from(listContainer.children).map(el => ({
        disease_name: el.dataset.disease,
        family_member: el.dataset.member,
        status: 'current'
    }));
    return items;
}

/**
 * Handle custom disease input visibility (for Tambah MCU modal)
 */
function setupCustomDiseaseHandlersForAdd() {
    const medicalDiseaseSelect = document.getElementById('mcu-medical-history-disease');
    const medicalCustomInput = document.getElementById('mcu-medical-history-custom');
    const familyDiseaseSelect = document.getElementById('mcu-family-history-disease');
    const familyCustomInput = document.getElementById('mcu-family-history-custom');

    if (medicalDiseaseSelect) {
        medicalDiseaseSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                medicalCustomInput.classList.remove('hidden');
            } else {
                medicalCustomInput.classList.add('hidden');
            }
        });
    }

    if (familyDiseaseSelect) {
        familyDiseaseSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                familyCustomInput.classList.remove('hidden');
            } else {
                familyCustomInput.classList.add('hidden');
            }
        });
    }
}

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
  init();
});
