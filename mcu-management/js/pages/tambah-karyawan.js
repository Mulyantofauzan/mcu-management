/**
 * Tambah Karyawan Page
 * Add new employee and MCU records
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { labService } from '../services/labService.js';
import { mcuBatchService } from '../services/mcuBatchService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';
import { initSuperSearch } from '../components/superSearch.js';
import FileUploadWidget from '../components/fileUploadWidget.js';
import { generateMCUId } from '../utils/idGenerator.js';
import { tempFileStorage } from '../services/tempFileStorage.js';
import { createLabResultWidget } from '../components/labResultWidget.js';

let searchResults = [];
let jobTitles = [];
let departments = [];
let doctors = [];
let currentEmployee = null;
let fileUploadWidget = null;
let labResultWidget = null;  // Lab result widget instance
let generatedMCUIdForAdd = null;  // Store generated MCU ID for file uploads

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Text to sanitize
 * @returns {string} - Sanitized text safe for database
 */
function sanitizeInput(input) {
    if (!input) return '';
    // Remove potentially dangerous characters while preserving valid input
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .substring(0, 200); // Limit length
}

/**
 * Show unified loading overlay with step tracking
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
 * Reset all loading steps to pending state
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
 * Mark upload step as in progress
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
 * Update upload progress bar
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
 * Mark upload step as completed
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
 * Mark save step as in progress
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
 * Mark save step as completed
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

/**
 * Deprecated: Use showUnifiedLoading instead
 */
function showSaveLoading(message = 'Menyimpan...') {
    showUnifiedLoading('Memproses...', message);
}

/**
 * Deprecated: Use hideUnifiedLoading instead
 */
function hideSaveLoading() {
    hideUnifiedLoading();
}

/**
 * Deprecated: Use showUnifiedLoading and startUploadStep instead
 */
function showUploadLoading(message = 'Mengunggah File...') {
    showUnifiedLoading('Memproses...', message);
    startUploadStep(0);
}

/**
 * Deprecated: Use completeUploadStep instead
 */
function hideUploadLoading() {
    completeUploadStep();
}

async function init() {
    try {
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Wait for sidebar to load before updating user info

        updateUserInfo();
        await loadMasterData();
        populateDropdowns();

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

async function loadMasterData() {
    try {
        jobTitles = await masterDataService.getAllJobTitles();
        departments = await masterDataService.getAllDepartments();
        doctors = await masterDataService.getAllDoctors();
        // ✅ CRITICAL: Load lab items upfront so labResultWidget can use them
        await labService.getAllLabItems();
    } catch (error) {

        showToast('Gagal memuat data master', 'error');
    }
}

// ✅ FIX: Optimized enrichment using Map lookups - O(1) per employee instead of O(n)
function enrichEmployeeWithIds(emp) {
    // Build Maps on demand (for compatibility with one-off calls in this page)
    // Since this page has many one-off enrichment calls instead of batch operations,
    // we build the maps inline to keep the function interface simple
    const jobMap = new Map(jobTitles.map(j => [j.name, j]));
    const deptMap = new Map(departments.map(d => [d.name, d]));
    return enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap);
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

// ✅ NEW: Populate doctor dropdown in MCU forms
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

function populateDropdowns() {
    // Job Titles - Searchable datalist
    const jobDatalist = document.getElementById('job-list');
    const jobInput = document.getElementById('emp-job');
    jobDatalist.innerHTML = ''; // Clear existing

    const jobFragment = document.createDocumentFragment();

    // Add all job titles to datalist
    jobTitles.forEach(job => {
        const option = document.createElement('option');
        option.value = job.name;  // Display name in input
        option.textContent = job.name;  // SAFE: textContent auto-escapes
        jobFragment.appendChild(option);
    });

    jobDatalist.appendChild(jobFragment);  // Single DOM operation

    // Handle job selection - update hidden ID field when user selects from datalist
    jobInput.addEventListener('input', function() {
        const selectedName = this.value;
        const job = jobTitles.find(j => j.name === selectedName);
        if (job) {
            document.getElementById('emp-job-id').value = job.id;  // ✅ FIX: Use job.id not job.jobTitleId
        } else {
            document.getElementById('emp-job-id').value = '';
        }
    });

    // Departments - Same approach
    const deptSelect = document.getElementById('emp-dept');
    deptSelect.innerHTML = '';

    const deptFragment = document.createDocumentFragment();

    const defaultDeptOption = document.createElement('option');
    defaultDeptOption.value = '';
    defaultDeptOption.textContent = 'Pilih...';
    deptFragment.appendChild(defaultDeptOption);

    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;  // ✅ FIX: Use dept.id not dept.departmentId
        option.textContent = dept.name;  // SAFE: textContent auto-escapes
        deptFragment.appendChild(option);
    });

    deptSelect.appendChild(deptFragment);  // Single DOM operation

    // Doctors - MCU form dropdown
    const doctorSelect = document.getElementById('mcu-doctor');
    if (doctorSelect) {
        doctorSelect.innerHTML = '';

        const doctorFragment = document.createDocumentFragment();

        const defaultDoctorOption = document.createElement('option');
        defaultDoctorOption.value = '';
        defaultDoctorOption.textContent = 'Pilih Dokter...';
        doctorFragment.appendChild(defaultDoctorOption);

        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;  // ✅ FIX: Use doctor.id not doctor.doctorId
            option.textContent = doctor.name;  // SAFE: textContent auto-escapes
            doctorFragment.appendChild(option);
        });

        doctorSelect.appendChild(doctorFragment);  // Single DOM operation
    }
}

window.handleSearch = async function() {
    const searchTerm = document.getElementById('search-input').value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (!searchTerm) {
        resultsContainer.innerHTML = '';
        return;
    }

    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Ketik minimal 2 karakter untuk mencari...</p>';
        return;
    }

    try {
        searchResults = await employeeService.search(searchTerm);

        if (searchResults.length === 0) {
            resultsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Tidak ditemukan</p>';
            return;
        }

        // Enrich search results with IDs (for Supabase which only stores names)
        searchResults = searchResults.map(emp => enrichEmployeeWithIds(emp));

        let html = '<div class="table-container"><table class="table"><thead><tr>';
        html += '<th>Nama</th><th>ID</th><th>Tanggal Lahir</th><th>Jabatan</th><th>Departemen</th><th>Aksi</th>';
        html += '</tr></thead><tbody>';

        searchResults.forEach(emp => {
            const job = jobTitles.find(j => j.id === emp.jobTitleId);
            const dept = departments.find(d => d.id === emp.departmentId);

            html += '<tr>';
            html += `<td><span class="font-medium text-gray-900">${emp.name}</span></td>`;
            html += `<td><span class="text-sm text-gray-600">${emp.employeeId}</span></td>`;
            html += `<td>${formatDateDisplay(emp.birthDate)}</td>`;
            html += `<td>${job?.name || '-'}</td>`;
            html += `<td>${dept?.name || '-'}</td>`;
            html += `<td><button onclick="openAddMCUForEmployee('${emp.employeeId}')" class="btn btn-sm btn-primary">+ Tambah MCU</button></td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        resultsContainer.innerHTML = html;

    } catch (error) {

        showToast('Gagal mencari: ' + error.message, 'error');
    }
};

window.openAddEmployeeModal = function() {
    // Reset form
    document.getElementById('employee-form').reset();
    document.getElementById('vendor-field').classList.add('hidden');
    document.getElementById('inactive-reason-field').classList.add('hidden');

    openModal('add-employee-modal');
};

window.closeAddEmployeeModal = function() {
    closeModal('add-employee-modal');
};

window.toggleVendorField = function() {
    const status = document.getElementById('emp-status').value;
    const vendorField = document.getElementById('vendor-field');

    if (status === 'Vendor') {
        vendorField.classList.remove('hidden');
    } else {
        vendorField.classList.add('hidden');
        document.getElementById('emp-vendor').value = '';
    }
};

window.handleAddEmployee = async function(event) {
    event.preventDefault();

    try {
        const currentUser = authService.getCurrentUser();
        showSaveLoading('Menambah karyawan...');

        const employeeData = {
            name: sanitizeInput(document.getElementById('emp-name').value),  // Sanitize critical field
            jobTitleId: document.getElementById('emp-job-id').value,  // Use hidden field with ID
            departmentId: document.getElementById('emp-dept').value,
            birthDate: document.getElementById('emp-birthdate').value,
            jenisKelamin: document.getElementById('emp-gender').value,
            bloodType: document.getElementById('emp-blood').value,
            employmentStatus: document.getElementById('emp-status').value,
            vendorName: sanitizeInput(document.getElementById('emp-vendor').value) || null,  // Sanitize critical field
            activeStatus: document.getElementById('emp-active').value,
            inactiveReason: sanitizeInput(document.getElementById('emp-inactive-reason').value) || null  // Sanitize critical field
        };

        const newEmployee = await employeeService.create(employeeData, currentUser);

        hideSaveLoading();
        showToast('Karyawan berhasil ditambahkan!', 'success');

        // Auto-close modal
        closeAddEmployeeModal();

        // Auto-open MCU modal
        setTimeout(() => {
            openAddMCUForEmployee(newEmployee.employeeId);
        }, 300);

    } catch (error) {
        hideSaveLoading();
        showToast('Gagal menambah karyawan: ' + error.message, 'error');
    }
};

window.openAddMCUForEmployee = async function(employeeId) {
    try {
        // ✅ CRITICAL: Ensure master data is loaded before opening modal
        if (!doctors || doctors.length === 0) {
            doctors = await masterDataService.getAllDoctors();
        }

        currentEmployee = await employeeService.getById(employeeId);

        if (!currentEmployee) {
            showToast('Karyawan tidak ditemukan', 'error');
            return;
        }

        // Enrich employee with IDs (for Supabase which only stores names)
        currentEmployee = enrichEmployeeWithIds(currentEmployee);

        const job = jobTitles.find(j => j.id === currentEmployee.jobTitleId);
        const dept = departments.find(d => d.id === currentEmployee.departmentId);

        // Fill employee summary
        document.getElementById('mcu-emp-name').textContent = currentEmployee.name;
        document.getElementById('mcu-emp-id').textContent = currentEmployee.employeeId;
        document.getElementById('mcu-emp-job').textContent = job?.name || '-';
        document.getElementById('mcu-emp-dept').textContent = dept?.name || '-';
        document.getElementById('mcu-employee-id').value = employeeId;

        // Reset form
        document.getElementById('mcu-form').reset();
        document.getElementById('mcu-employee-id').value = employeeId;

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('mcu-date').value = today;

        // Generate MCU ID upfront for file uploads
        generatedMCUIdForAdd = generateMCUId();
        // ✅ Populate doctor dropdown
        populateDoctorDropdown('mcu-doctor');

        openModal('add-mcu-modal');

        // ✅ CRITICAL: Wait for modal to be fully visible and DOM ready
        // Increased from 100ms to 300ms to ensure Bootstrap modal transition completes
        await new Promise(resolve => setTimeout(resolve, 300));

        // Initialize file upload widget for this MCU
        const currentUser = authService.getCurrentUser();
        fileUploadWidget = new FileUploadWidget('mcu-file-upload-container', {
            employeeId: currentEmployee.employeeId,
            mcuId: generatedMCUIdForAdd,  // Use generated ID for temp file storage
            userId: currentUser.userId || currentUser.user_id,
            onUploadComplete: () => {
                // Refresh file list if needed
            },
            onError: (error) => {
                showToast('Upload gagal: ' + error, 'error');
            }
        });

        // ✅ CRITICAL: Clear old form state before initializing new widget
        const labContainer = document.getElementById('lab-results-container-add-karyawan');
        if (labContainer) {
            labContainer.innerHTML = ''; // Clear old form
        }

        // Initialize lab result widget
        labResultWidget = createLabResultWidget('lab-results-container-add-karyawan');
        if (labResultWidget) {
            const initSuccess = await labResultWidget.init();
            if (!initSuccess) {
                showToast('Gagal memuat form lab results', 'warning');
            }

            // Setup add button handler
            const addLabBtn = document.getElementById('add-lab-result-btn');
            if (addLabBtn) {
                addLabBtn.onclick = () => {
                    labResultWidget.addLabResultForm();
                };
            }
        } else {
            showToast('Gagal menginisialisasi form lab', 'error');
            return;
        }
    } catch (error) {

        showToast('Gagal membuka form MCU: ' + error.message, 'error');
    }
};

window.closeAddMCUModal = function() {
    closeModal('add-mcu-modal');
    currentEmployee = null;

    // ✅ CRITICAL: Clear lab widget state to prevent residual data
    if (labResultWidget) {
        labResultWidget.clear();
        labResultWidget = null;
    }

    // Clear container
    const labContainer = document.getElementById('lab-results-container-add-karyawan');
    if (labContainer) {
        labContainer.innerHTML = '';
    }

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

        // ✅ CRITICAL: Validate lab results BEFORE saving MCU
        // Lab inputs are generated via JavaScript, not HTML form, so required attribute doesn't work
        if (labResultWidget) {
            const labValidationErrors = labResultWidget.validateAllFieldsFilled();
            if (labValidationErrors.length > 0) {
                const errorMsg = 'Semua pemeriksaan lab harus diisi:\n' + labValidationErrors.join('\n');
                showToast(errorMsg, 'error');
                return; // Stop form submission if lab validation fails
            }
        }

        // ✅ FIX: Get doctor ID and convert to integer
        const doctorSelect = document.getElementById('mcu-doctor');
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

        const mcuData = {
            mcuId: generatedMCUIdForAdd,  // Use pre-generated ID
            employeeId: document.getElementById('mcu-employee-id').value,
            mcuType: document.getElementById('mcu-type').value,
            mcuDate: document.getElementById('mcu-date').value,
            bmi: document.getElementById('mcu-bmi').value || null,
            bloodPressure: document.getElementById('mcu-bp').value || null,
            respiratoryRate: document.getElementById('mcu-rr').value || null,
            pulse: document.getElementById('mcu-pulse').value || null,
            temperature: document.getElementById('mcu-temp').value || null,
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
            initialNotes: document.getElementById('mcu-notes').value
        };

        // Show unified loading with step tracking
        const tempFiles = tempFileStorage.getFiles(mcuData.mcuId);
        showUnifiedLoading('Memproses...', 'Mengunggah file dan menyimpan data');

        // ✅ CRITICAL: Upload temporary files to Cloudflare R2 BEFORE saving MCU
        if (tempFiles && tempFiles.length > 0) {
            startUploadStep(tempFiles.length);
            try {
                const { uploadBatchFiles } = await import('../services/supabaseStorageService.js');
                const uploadResult = await uploadBatchFiles(
                    tempFiles,
                    mcuData.employeeId,
                    mcuData.mcuId,
                    currentUser.id,
                    (current, total, message) => {
                        updateUploadProgress(current, total);
                    }
                );

                if (!uploadResult.success && uploadResult.uploadedCount === 0) {
                    // All uploads failed - don't proceed with MCU creation
                    showToast(`❌ File upload ke R2 gagal: ${uploadResult.error}`, 'error');
                    hideUnifiedLoading();
                    return;
                } else if (uploadResult.failedCount > 0) {
                    // Some uploads failed - warn user but continue
                    showToast(`⚠️ ${uploadResult.failedCount} file gagal diunggah, tapi MCU akan disimpan`, 'warning');
                }
            } catch (uploadError) {
                hideUnifiedLoading();
                showToast(`❌ Error upload: ${uploadError.message}`, 'error');
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
        if (labResultWidget) {
            labResults = labResultWidget.getAllLabResults() || [];
        }

        // ✅ BATCH SAVE: Use MCU batch service to atomically save MCU + lab results
        // This prevents race conditions and orphaned records on sequential MCU operations
        const batchResult = await mcuBatchService.saveMCUWithLabResults(mcuData, labResults, currentUser);

        if (!batchResult.success) {
            hideUnifiedLoading();

            // Build detailed error message
            const errorDetails = batchResult.errors.map(e => `• ${e}`).join('\n');
            const mcuInfo = batchResult.data.mcu ? `\n\nMCU ID: ${batchResult.data.mcu.mcuId}` : '';
            const errorMsg = `⚠️ GAGAL MENYIMPAN DATA:\n${errorDetails}${mcuInfo}\n\nHubungi support jika diperlukan.`;

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

        // Make form read-only after successful save
        disableMCUForm();

        // Show MCU ID in read-only format
        if (createdMCU && createdMCU.mcuId) {
            const form = document.getElementById('mcu-form');
            const mcuIdDiv = document.createElement('div');
            mcuIdDiv.className = 'mb-4 p-3 bg-green-50 border border-green-200 rounded-lg';
            mcuIdDiv.innerHTML = `
                <p class="text-sm text-gray-600">MCU ID (Copy untuk referensi):</p>
                <p class="text-lg font-semibold text-green-700 cursor-pointer select-all" id="mcu-id-display">${createdMCU.mcuId}</p>
            `;
            form.insertBefore(mcuIdDiv, form.querySelector('.modal-footer'));
        }

    } catch (error) {
        hideUnifiedLoading();
        showToast('Gagal menambah MCU: ' + error.message, 'error');
    }
};

/**
 * Disable all MCU form inputs to make it read-only
 */
function disableMCUForm() {
    const form = document.getElementById('mcu-form');
    if (!form) return;

    // Disable all inputs, selects, textareas
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.disabled = true;
        input.classList.add('opacity-75', 'cursor-not-allowed');
    });

    // Change submit button to close button
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Tutup Form';
        submitBtn.type = 'button';
        submitBtn.onclick = function() {
            window.closeAddMCUModal();
        };
    }
}

window.handleLogout = function() {
    authService.logout();
};

// Initialize
// ✅ FIX: Wait for Supabase to be ready before initializing
supabaseReady.then(() => {
  init();
}).catch(err => {
  init();
});
