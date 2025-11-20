/**
 * Follow-Up Page
 * List and update MCU records that need follow-up
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { masterDataService } from '../services/masterDataService.js';
import { labService } from '../services/labService.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal } from '../utils/uiHelpers.js';
import { generateRujukanPDF, generateRujukanBalikPDF } from '../utils/rujukanPDFGenerator.js';
import { supabaseReady } from '../config/supabase.js';  // ✅ FIX: Wait for Supabase initialization
import { initSuperSearch } from '../components/superSearch.js';  // ✅ NEW: Global search
import FileUploadWidget from '../components/fileUploadWidget.js';
import { uploadBatchFiles } from '../services/supabaseStorageService.js';  // ✅ NEW: File upload to Supabase
import { tempFileStorage } from '../services/tempFileStorage.js';  // ✅ NEW: Temp file management
import { createLabResultWidget } from '../components/labResultWidget.js';  // ✅ NEW: Lab result widget

let followUpList = [];
let filteredList = [];
let employees = [];
let departments = [];
let jobTitles = [];
let followupFileUploadWidget = null;
let doctors = [];
let currentMCU = null;
let currentPage = 1;
const itemsPerPage = 10;
let labResultWidgetUpdate = null;  // Lab result widget for update modal

// Upload loading overlay functions
function showUploadLoading(message = 'Mengunggah File...') {
  const overlay = document.getElementById('upload-loading-overlay');
  const title = document.getElementById('upload-loading-title');
  if (overlay) {
    overlay.classList.remove('hidden');
    if (title) title.textContent = message;
  }
}

function updateUploadProgress(current, total) {
  const progressFill = document.getElementById('upload-progress-fill');
  const message = document.getElementById('upload-loading-message');
  if (progressFill) {
    const percentage = (current / total) * 100;
    progressFill.style.width = percentage + '%';
  }
  if (message) {
    message.textContent = `${current} dari ${total} file`;
  }
}

function hideUploadLoading() {
  const overlay = document.getElementById('upload-loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// Download Surat Rujukan PDF from table action button
window.downloadRujukanPDFAction = async function(mcuId) {
  try {
    // Pastikan master data sudah loaded (termasuk doctors)
    if (!doctors || doctors.length === 0) {
      await loadMasterData();
    }

    const mcu = await mcuService.getById(mcuId);
    if (!mcu) {
      showToast('MCU data tidak ditemukan', 'error');
      return;
    }

    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (!employee) {
      showToast('Data karyawan tidak ditemukan', 'error');
      return;
    }

    // Get doctor name from MCU data
    let doctorName = 'Dr. -';
    if (mcu.doctor) {
      // Find doctor by ID - handle numeric and string comparison
      const doctor = doctors.find(d => {
        return String(d.id) === String(mcu.doctor) || d.id === mcu.doctor;
      });
      if (doctor) {
        doctorName = doctor.name;
      }
    }

    // Prepare data untuk PDF
    const employeeData = {
      name: employee.name,
      age: calculateAge(employee.birthDate),
      jenisKelamin: employee.jenisKelamin || 'Laki-laki',
      jobTitle: employee.jobTitle,
      department: employee.department,
      employmentStatus: employee.employmentStatus,
      vendorName: employee.vendorName,
      doctorName: doctorName  // Pass actual doctor name from MCU data
    };

    generateRujukanPDF(employeeData, mcu);
    showToast('Surat Rujukan siap dicetak. Gunakan Ctrl+S atau Simpan PDF di print dialog.', 'success');
  } catch (error) {
    showToast('Gagal membuat surat rujukan: ' + error.message, 'error');
  }
};

// Download Surat Rujukan Balik (Return Referral) from table action button
window.downloadRujukanBalikAction = function(employeeId) {
  const employee = employees.find(e => e.employeeId === employeeId);
  if (!employee) {
    showToast('Data karyawan tidak ditemukan', 'error');
    return;
  }

  try {
    generateRujukanBalikPDF(employee);
    showToast('Surat Rujukan Balik siap dicetak. Gunakan Ctrl+S atau Simpan PDF di print dialog.', 'success');
  } catch (error) {

    showToast('Gagal membuat surat rujukan balik: ' + error.message, 'error');
  }
};

async function init() {
  try {
    // Check auth
    if (!authService.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    // Wait for sidebar to load before updating user info

    updateUserInfo();
    await loadMasterData();
    await loadFollowUpList();

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
    // ✅ FIX: Load ALL employees (including inactive) for follow-up list
    // Follow-up MCUs might exist for inactive employees too
    employees = await employeeService.getAll();
    departments = await masterDataService.getAllDepartments();
    jobTitles = await masterDataService.getAllJobTitles();
    doctors = await masterDataService.getAllDoctors();

    // ✅ FIX: Build lookup Maps once for O(1) enrichment (performance optimization)
    const jobMap = new Map(jobTitles.map(j => [j.name, j]));
    const deptMap = new Map(departments.map(d => [d.name, d]));

    // Enrich employees with IDs using O(1) Map lookups (O(n) total instead of O(n²))
    employees = employees.map(emp => enrichEmployeeWithIdsOptimized(emp, jobMap, deptMap));
  } catch (error) {
    // Silent fail - master data load error will be handled gracefully
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
//   if (!emp.jobTitleId && emp.jobTitle) {
//     const job = jobTitles.find(j => j.name === emp.jobTitle);
//     if (job) emp.jobTitleId = job.id;
//   }
//   if (!emp.departmentId && emp.department) {
//     const dept = departments.find(d => d.name === emp.department);
//     if (dept) emp.departmentId = dept.id;
//   }
//   return emp;
// }

window.loadFollowUpList = async function() {
  try {
    // Get all MCUs that need follow-up
    followUpList = await mcuService.getFollowUpList();
    filteredList = [...followUpList];

    updateStats();
    renderTable();

    showToast('Data berhasil dimuat', 'success');
  } catch (error) {

    showToast('Gagal memuat data: ' + error.message, 'error');
  }
};

function updateStats() {
  // Total follow-up - all MCUs marked for follow-up
  document.getElementById('stat-total').textContent = followUpList.length;

  // Completed this month - MCUs with finalResult !== 'Follow-Up' and finalResult !== null in current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedCount = followUpList.filter(mcu => {
    const mcuDate = new Date(mcu.mcuDate);
    // Check if MCU has been completed (has final result other than Follow-Up)
    const isCompleted = mcu.finalResult && mcu.finalResult !== 'Follow-Up';
    const isThisMonth = mcuDate >= firstDay && mcuDate <= now;
    return isCompleted && isThisMonth;
  }).length;
  document.getElementById('stat-completed').textContent = completedCount;

  // Urgent/Critical - MCUs more than 14 days old (follow-ups that need urgent attention)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const criticalCount = followUpList.filter(mcu => {
    const mcuDate = new Date(mcu.mcuDate);
    return mcuDate < fourteenDaysAgo; // Older than 14 days = needs urgent attention
  }).length;
  document.getElementById('stat-critical').textContent = criticalCount;
}

function renderTable() {
  const container = document.getElementById('followup-table-container');

  if (filteredList.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada data follow-up</p>';
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  if (currentPage > totalPages) {
    currentPage = totalPages; // Reset if current page exceeds total
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, endIndex);

  let html = '<div class="table-container"><table class="table"><thead><tr>';
  html += '<th>Nama Karyawan</th>';
  html += '<th>ID Karyawan</th>';
  html += '<th>Departemen</th>';
  html += '<th>Tanggal MCU</th>';
  html += '<th>Hasil Awal</th>';
  html += '<th>Catatan</th>';
  html += '<th>Aksi</th>';
  html += '</tr></thead><tbody>';

  paginatedList.forEach(mcu => {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (!employee) return;

    const dept = departments.find(d => d.id === employee.departmentId);

    // Get initial notes and truncate if too long
    const notes = (mcu.initialNotes || '');
    const displayNotes = notes.length > 100 ? notes.substring(0, 100) + '...' : notes || '-';

    html += '<tr>';
    html += `<td><span class="font-medium text-gray-900">${employee.name}</span></td>`;
    html += `<td><span class="text-sm text-gray-600">${employee.employeeId}</span></td>`;
    html += `<td>${dept?.name || '-'}</td>`;
    html += `<td>${formatDateDisplay(mcu.mcuDate)}</td>`;
    html += `<td><span class="badge badge-warning">${mcu.initialResult}</span></td>`;
    html += `<td title="${notes}"><span class="text-xs text-gray-600" style="display: block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayNotes}</span></td>`;
    html += `<td>
      <div class="flex gap-2">
        <button onclick="downloadRujukanPDFAction('${mcu.mcuId}')" class="btn btn-sm btn-secondary" title="Download Surat Rujukan (dengan Rujukan Balik)" style="padding: 0.375rem 0.75rem; background-color: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
          📄 Rujukan
        </button>
        <button onclick="openFollowUpModal('${mcu.mcuId}')" class="btn btn-sm btn-primary">
          Update
        </button>
      </div>
    </td>`;
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  // Add pagination controls
  if (totalPages > 1) {
    html += `<div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 16px;">`;
    html += `<button onclick="goToPage(1)" class="btn btn-sm" style="background: ${currentPage === 1 ? '#e5e7eb' : '#fff'}; border: 1px solid #d1d5db;">◀◀</button>`;
    html += `<button onclick="goToPage(${Math.max(1, currentPage - 1)})" class="btn btn-sm" style="background: ${currentPage === 1 ? '#e5e7eb' : '#fff'}; border: 1px solid #d1d5db;">◀</button>`;

    for (let i = 1; i <= totalPages; i++) {
      const isActive = i === currentPage;
      html += `<button onclick="goToPage(${i})" class="btn btn-sm" style="background: ${isActive ? '#3b82f6' : '#fff'}; color: ${isActive ? '#fff' : '#000'}; border: 1px solid #d1d5db; min-width: 32px;">${i}</button>`;
    }

    html += `<button onclick="goToPage(${Math.min(totalPages, currentPage + 1)})" class="btn btn-sm" style="background: ${currentPage === totalPages ? '#e5e7eb' : '#fff'}; border: 1px solid #d1d5db;">▶</button>`;
    html += `<button onclick="goToPage(${totalPages})" class="btn btn-sm" style="background: ${currentPage === totalPages ? '#e5e7eb' : '#fff'}; border: 1px solid #d1d5db;">▶▶</button>`;
    html += `<span style="margin-left: 16px; font-size: 14px; color: #666;">Halaman ${currentPage} dari ${totalPages} (Total: ${filteredList.length})</span>`;
    html += `</div>`;
  }

  container.innerHTML = html;
}

window.goToPage = function(pageNum) {
  currentPage = pageNum;
  renderTable();
  // Scroll to table
  document.getElementById('followup-table-container').scrollIntoView({ behavior: 'smooth' });
}

window.handleSearch = function() {
  const search = document.getElementById('search').value.toLowerCase();

  filteredList = followUpList.filter(mcu => {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (!employee) return false;

    return employee.name.toLowerCase().includes(search) ||
           employee.employeeId.toLowerCase().includes(search);
  });

  renderTable();
};

window.openFollowUpModal = async function(mcuId) {
  try {
    currentMCU = await mcuService.getById(mcuId);
    if (!currentMCU) {
      showToast('MCU record tidak ditemukan', 'error');
      return;
    }

    const employee = employees.find(e => e.employeeId === currentMCU.employeeId);
    const dept = departments.find(d => d.id === employee?.departmentId);
    const job = jobTitles.find(j => j.id === employee?.jobTitleId);

    // Fill employee info
    document.getElementById('modal-emp-name').textContent = employee?.name || '-';
    document.getElementById('modal-emp-id').textContent = employee?.employeeId || '-';
    document.getElementById('modal-emp-dept').textContent = dept?.name || '-';
    document.getElementById('modal-emp-job').textContent = job?.name || '-';

    // Fill previous values (read-only for comparison)
    document.getElementById('prev-bp').textContent = currentMCU.bloodPressure || '-';
    document.getElementById('prev-bmi').textContent = currentMCU.bmi || '-';
    document.getElementById('prev-hbsag').textContent = currentMCU.hbsag || '-';
    document.getElementById('prev-result').textContent = currentMCU.initialResult || '-';

    // Fill initial result & notes (read-only)
    document.getElementById('initial-result-display').textContent = currentMCU.initialResult || '-';
    document.getElementById('initial-notes-display').textContent = currentMCU.initialNotes || 'Tidak ada catatan';

    // Set form mcuId
    document.getElementById('followup-mcu-id').value = mcuId;

    // Clear form inputs (don't pre-fill, let user enter new values)
    document.getElementById('fu-result').value = '';
    document.getElementById('fu-notes').value = '';

    // Initialize file upload widget for follow-up modal
    const followupFileContainer = document.getElementById('followup-file-upload-container');
    if (followupFileContainer) {
        followupFileContainer.innerHTML = '';
        const currentUser = authService.getCurrentUser();
        followupFileUploadWidget = new FileUploadWidget('followup-file-upload-container', {
            employeeId: currentMCU.employeeId,
            mcuId: mcuId,
            userId: currentUser.userId || currentUser.user_id,
            onUploadComplete: (result) => {
                showToast('File berhasil diunggah', 'success');
            }
        });
    }

    openModal('followup-modal');
  } catch (error) {

    showToast('Gagal membuka modal: ' + error.message, 'error');
  }
};

window.closeFollowUpModal = function() {
  closeModal('followup-modal');
  currentMCU = null;
};

window.handleFollowUpSubmit = async function(event) {
  event.preventDefault();

  const mcuId = document.getElementById('followup-mcu-id').value;
  const finalResult = document.getElementById('fu-result').value;
  const finalNotes = document.getElementById('fu-notes').value;

  if (!finalResult || !finalNotes) {
    showToast('Hasil akhir dan catatan wajib diisi', 'warning');
    return;
  }

  try {
    const currentUser = authService.getCurrentUser();

    // Prepare update data (hanya final result dan notes dulu)
    const updateData = {
      finalResult: finalResult,
      finalNotes: finalNotes
    };

    // Update follow-up (IMPORTANT: this updates existing MCU, does NOT create new one)
    await mcuService.updateFollowUp(mcuId, updateData, currentUser);

    showToast('Hasil akhir berhasil disimpan', 'success');

    // ✅ NEW: Upload files if any are pending
    const pendingFiles = tempFileStorage.getFiles(mcuId);
    if (pendingFiles && pendingFiles.length > 0) {

      // Show loading overlay
      showUploadLoading(`Mengunggah ${pendingFiles.length} file...`);

      try {
        const uploadResult = await uploadBatchFiles(
          pendingFiles,
          currentMCU.employeeId,
          mcuId,
          currentUser.userId || currentUser.user_id,
          // Progress callback
          (current, total, message) => {
            updateUploadProgress(current, total);
          }
        );

        if (uploadResult.success) {
          if (uploadResult.uploadedCount > 0) {
          }
          // Clear temporary files after successful upload
          tempFileStorage.clearFiles(mcuId);
        } else {
          hideUploadLoading();
          showToast(`❌ File upload error: ${uploadResult.error}`, 'error');
          return; // Don't proceed if file upload failed
        }
      } catch (error) {
        hideUploadLoading();
        showToast(`❌ Upload error: ${error.message}`, 'error');
        return;
      }

      hideUploadLoading();
    }

    // Close first modal
    closeFollowUpModal();

    // TAMBAHAN: Buka modal untuk update detail MCU dengan placeholder values
    setTimeout(() => {
      openMCUUpdateModal(mcuId);
    }, 500);

  } catch (error) {

    showToast('Gagal menyimpan follow-up: ' + error.message, 'error');
  }
};

window.openMCUUpdateModal = async function(mcuId) {
  try {
    currentMCU = await mcuService.getById(mcuId);
    if (!currentMCU) {
      showToast('MCU record tidak ditemukan', 'error');
      return;
    }

    const employee = employees.find(e => e.employeeId === currentMCU.employeeId);
    const dept = departments.find(d => d.id === employee?.departmentId);
    const job = jobTitles.find(j => j.id === employee?.jobTitleId);

    // Fill employee summary at top of modal
    document.getElementById('update-emp-name').textContent = employee?.name || '-';
    document.getElementById('update-emp-id').textContent = employee?.employeeId || '-';
    document.getElementById('update-emp-dept').textContent = dept?.name || '-';
    document.getElementById('update-emp-job').textContent = job?.name || '-';

    // Set hidden mcuId
    document.getElementById('update-mcu-id').value = mcuId;

    // Set Jenis MCU and Tanggal MCU (load from database)
    const mcuTypeField = document.getElementById('update-mcu-type');
    const mcuDateField = document.getElementById('update-mcu-date');

    if (mcuTypeField) mcuTypeField.value = currentMCU.mcuType || '';
    if (mcuDateField) mcuDateField.value = currentMCU.mcuDate ? currentMCU.mcuDate.split('T')[0] : '';

    // Set Doctor dropdown
    const doctorField = document.getElementById('update-mcu-doctor');
    if (doctorField && doctors && doctors.length > 0) {
      doctorField.innerHTML = '<option value="">Pilih dokter pemeriksa</option>';
      doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.name;
        if (currentMCU.doctor && String(currentMCU.doctor) === String(doctor.id)) {
          option.selected = true;
        }
        doctorField.appendChild(option);
      });
    }

    // Set Initial Result and Notes
    const initialResultField = document.getElementById('update-initial-result');
    const initialNotesField = document.getElementById('update-initial-notes');

    if (initialResultField) initialResultField.value = currentMCU.initialResult || '';
    if (initialNotesField) initialNotesField.value = currentMCU.initialNotes || '';

    // Set Final Result section (visible only if initialResult is Follow-Up or if finalResult exists)
    const finalResultSection = document.getElementById('update-final-result-section');
    if (finalResultSection) {
      if (currentMCU.initialResult === 'Follow-Up' || currentMCU.finalResult) {
        finalResultSection.classList.remove('hidden');
      } else {
        finalResultSection.classList.add('hidden');
      }
    }

    // Set Final Result and Notes if applicable
    const finalResultField = document.getElementById('update-final-result');
    const finalNotesField = document.getElementById('update-final-notes');

    if (finalResultField) finalResultField.value = currentMCU.finalResult || '';
    if (finalNotesField) finalNotesField.value = currentMCU.finalNotes || '';

    // Populate all form fields with values from database (like edit modal)
    const fieldsToPopulate = {
      'update-bmi': currentMCU.bmi,
      'update-bp': currentMCU.bloodPressure,
      'update-rr': currentMCU.respiratoryRate,
      'update-pulse': currentMCU.pulse,
      'update-temp': currentMCU.temperature,
      'update-vision': currentMCU.vision,
      'update-audio': currentMCU.audiometry,
      'update-colorblind': currentMCU.colorblind,
      'update-spiro': currentMCU.spirometry,
      'update-xray': currentMCU.xray,
      'update-ekg': currentMCU.ekg,
      'update-treadmill': currentMCU.treadmill,
      'update-hbsag': currentMCU.hbsag,
      'update-napza': currentMCU.napza,
      'update-recipient': currentMCU.recipient,
      'update-keluhan': currentMCU.keluhanUtama,
      'update-diagnosis': currentMCU.diagnosisKerja,
      'update-alasan': currentMCU.alasanRujuk
    };

    // Populate all input fields with database values
    for (const [fieldId, value] of Object.entries(fieldsToPopulate)) {
      const input = document.getElementById(fieldId);
      if (input) {
        input.value = value || '';
      }
    }

    // Initialize and populate Lab Results Widget
    // Always reinitialize to clear previous state
    console.log('[follow-up] Initializing lab widget for MCU:', mcuId);
    labResultWidgetUpdate = createLabResultWidget('lab-results-container-update');
    await labResultWidgetUpdate.init();
    console.log('[follow-up] Lab widget initialized');

    // NUCLEAR: Clean up any phantom lab records with invalid values for THIS MCU ONLY before loading
    try {
      console.log('[follow-up] Running cleanup for phantom records for MCU:', mcuId);
      const cleanupResult = await labService.cleanupPhantomLabRecords(mcuId);
      console.log('[follow-up] Cleanup result:', cleanupResult);
      if (cleanupResult.deletedCount > 0) {
        console.warn(`[follow-up] WARNING: Cleaned up ${cleanupResult.deletedCount} phantom records for MCU ${mcuId}`);
      }
    } catch (error) {
      console.error('[follow-up] Cleanup error:', error);
      // Ignore cleanup errors and continue
    }

    try {
      console.log('[follow-up] Loading existing results for MCU:', mcuId);
      await labResultWidgetUpdate.loadExistingResults(mcuId);
      console.log('[follow-up] Existing results loaded');
    } catch (error) {
      console.error('[follow-up] Error loading existing results:', error);
      labResultWidgetUpdate.clear();
    }

    console.log('[follow-up] Opening modal');
    openModal('mcu-update-modal');
  } catch (error) {

    showToast('Gagal membuka modal: ' + error.message, 'error');
  }
};

// Add Lab Result item to the update modal
window.addLabResultToUpdateModal = function() {
  if (!labResultWidgetUpdate) {
    showToast('Lab widget belum diinisialisasi', 'error');
    return;
  }
  labResultWidgetUpdate.addLabResultForm();
};

// Toggle Final Result Section visibility when initial result changes
window.toggleFinalResultSection = function() {
  const initialResultField = document.getElementById('update-initial-result');
  const finalResultSection = document.getElementById('update-final-result-section');

  if (!initialResultField || !finalResultSection) return;

  if (initialResultField.value === 'Follow-Up') {
    finalResultSection.classList.remove('hidden');
  } else {
    finalResultSection.classList.add('hidden');
  }
};

window.closeMCUUpdateModal = function() {
  console.log('[follow-up] Closing MCU update modal');
  closeModal('mcu-update-modal');
  currentMCU = null;
  if (labResultWidgetUpdate) {
    console.log('[follow-up] Clearing lab widget before closing modal');
    labResultWidgetUpdate.clear();
  }
};

window.handleMCUUpdate = async function(event) {
  event.preventDefault();

  const mcuId = document.getElementById('update-mcu-id').value;

  try {
    const currentUser = authService.getCurrentUser();

    // Collect new values - only include editable fields
    const updateData = {};
    let changes = [];  // Track all changes for history display (use let instead of const for reassignment)
    const fieldLabels = {
      'update-bmi': { label: 'BMI', dataKey: 'bmi' },
      'update-bp': { label: 'Tekanan Darah', dataKey: 'bloodPressure' },
      'update-rr': { label: 'RR (Frekuensi Nafas)', dataKey: 'respiratoryRate' },
      'update-pulse': { label: 'Nadi', dataKey: 'pulse' },
      'update-temp': { label: 'Suhu', dataKey: 'temperature' },
      'update-vision': { label: 'Penglihatan', dataKey: 'vision' },
      'update-audio': { label: 'Audiometri', dataKey: 'audiometry' },
      'update-spiro': { label: 'Spirometri', dataKey: 'spirometry' },
      'update-xray': { label: 'X-Ray', dataKey: 'xray' },
      'update-ekg': { label: 'EKG', dataKey: 'ekg' },
      'update-treadmill': { label: 'Treadmill', dataKey: 'treadmill' },
      'update-hbsag': { label: 'HBsAg', dataKey: 'hbsag' },
      'update-napza': { label: 'NAPZA', dataKey: 'napza' }
    };

    // Check for changes and collect them
    for (const [fieldId, fieldInfo] of Object.entries(fieldLabels)) {
      const input = document.getElementById(fieldId);
      const newValue = input?.value?.trim() || '';
      const oldValue = currentMCU[fieldInfo.dataKey] || '';

      if (newValue !== '') {
        updateData[fieldInfo.dataKey] = newValue;

        // Track this as a change if value actually changed
        if (String(oldValue) !== String(newValue)) {
          changes.push({
            itemName: fieldInfo.label,
            oldValue: oldValue || '-',
            newValue: newValue,
            changed: true
          });
        }
      }
    }

    // Get lab results from widget (separate from updateData since they're stored separately)
    let labResults = [];
    if (labResultWidgetUpdate) {
      labResults = labResultWidgetUpdate.getAllLabResults();
    }

    // Compare lab results with existing ones to track changes
    let labChanges = [];
    try {
      const existingLabResults = await labService.getPemeriksaanLabByMcuId(mcuId);

      if (existingLabResults && existingLabResults.length > 0) {
        // Check for modified lab results
        for (const newLab of labResults) {
          const existingLab = existingLabResults.find(lab => lab.lab_item_id === newLab.labItemId);
          if (existingLab) {
            // If value changed, track it
            if (String(existingLab.value) !== String(newLab.value)) {
              labChanges.push({
                itemName: `Hasil Lab: ${existingLab.lab_items?.name || 'Unknown'}`,
                oldValue: `${existingLab.value} ${existingLab.unit || ''}`,
                newValue: `${newLab.value} ${existingLab.unit || ''}`,
                changed: true
              });
            }
          }
        }

        // Check for deleted lab results
        for (const existingLab of existingLabResults) {
          const stillExists = labResults.find(lab => lab.labItemId === existingLab.lab_item_id);
          if (!stillExists) {
            labChanges.push({
              itemName: `Hasil Lab: ${existingLab.lab_items?.name || 'Unknown'} (Dihapus)`,
              oldValue: `${existingLab.value} ${existingLab.unit || ''}`,
              newValue: '-',
              changed: true
            });
          }
        }
      } else if (labResults.length > 0) {
        // New lab results added
        for (const newLab of labResults) {
          labChanges.push({
            itemName: `Hasil Lab: ${newLab.labItemName || 'Unknown'} (Baru)`,
            oldValue: '-',
            newValue: `${newLab.value}`,
            changed: true
          });
        }
      }
    } catch (err) {
    }

    // Merge lab changes with other changes
    changes = [...changes, ...labChanges];

    // Only update if there are changes
    if (Object.keys(updateData).length === 0 && labResults.length === 0) {
      showToast('Tidak ada perubahan untuk disimpan', 'info');
      closeMCUUpdateModal();
      await loadFollowUpList();
      return;
    }

    // Update MCU record (this will also create MCUChange entries for MCU fields)
    if (Object.keys(updateData).length > 0) {
      await mcuService.updateFollowUp(mcuId, updateData, currentUser);
    }

    // ✅ IMPORTANT: Save lab changes to mcuChanges table so they appear in change history
    if (labChanges.length > 0) {
      const { database } = await import('../services/database.js');
      for (const labChange of labChanges) {
        await database.add('mcuChanges', {
          mcuId: mcuId,
          fieldName: labChange.itemName,
          oldValue: labChange.oldValue,
          newValue: labChange.newValue,
          changedBy: currentUser?.userId || currentUser?.id,
          changedAt: new Date().toISOString()
        });
      }
    }

    // Save/update lab results separately - SMART update (only update changed items)
    if (labResults !== undefined && labResults !== null && labResults.length > 0) {
      try {
        console.log('[follow-up] Saving lab results. Count:', labResults.length, 'Data:', labResults);

        // VALIDATION: Ensure all lab results have valid data
        for (const result of labResults) {
          if (!result.labItemId || !result.value) {
            throw new Error(`Invalid lab result: Missing labItemId or value. Data: ${JSON.stringify(result)}`);
          }
          const numValue = parseFloat(result.value);
          if (isNaN(numValue) || numValue <= 0) {
            throw new Error(`Invalid lab result value: labItemId=${result.labItemId}, value='${result.value}'. Only positive numbers allowed.`);
          }
        }

        const existingLabResults = await labService.getPemeriksaanLabByMcuId(mcuId);
        console.log('[follow-up] Existing lab results. Count:', existingLabResults.length);

        let savedCount = 0;
        let updatedCount = 0;
        let deletedCount = 0;
        let errors = [];

        // Process NEW lab results (not in existing)
        for (const result of labResults) {
          try {
            const existing = existingLabResults.find(lab => lab.lab_item_id === result.labItemId);
            if (!existing) {
              // NEW - insert
              console.log(`[follow-up] Creating new lab result: labItemId=${result.labItemId}, value=${result.value}`);
              await labService.createPemeriksaanLab({
                mcuId: mcuId,
                employeeId: currentMCU.employeeId,
                labItemId: result.labItemId,
                value: result.value,
                notes: result.notes
              }, currentUser);
              savedCount++;
            } else if (existing.value !== result.value || existing.notes !== result.notes) {
              // MODIFIED - update only if value or notes changed
              console.log(`[follow-up] Updating lab result: id=${existing.id}, labItemId=${result.labItemId}, oldValue=${existing.value}, newValue=${result.value}`);
              await labService.updatePemeriksaanLab(existing.id, {
                value: result.value,
                notes: result.notes
              }, currentUser);
              updatedCount++;
            }
            // UNCHANGED - do nothing
          } catch (resultError) {
            errors.push(`Failed to save lab result (labItemId=${result.labItemId}): ${resultError.message}`);
          }
        }

        // Process DELETED lab results (in existing but not in current)
        for (const existing of existingLabResults) {
          try {
            const stillExists = labResults.find(lab => lab.labItemId === existing.lab_item_id);
            if (!stillExists) {
              // DELETED - soft delete
              console.log(`[follow-up] Deleting lab result: id=${existing.id}, labItemId=${existing.lab_item_id}`);
              await labService.deletePemeriksaanLab(existing.id);
              deletedCount++;
            }
          } catch (deleteError) {
            errors.push(`Failed to delete lab result (labItemId=${existing.lab_item_id}): ${deleteError.message}`);
          }
        }

        console.log(`[follow-up] Lab save complete. Saved: ${savedCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}, Errors: ${errors.length}`);

        // If there were errors, show them to user
        if (errors.length > 0) {
          const errorMsg = `Beberapa hasil lab gagal disimpan:\n${errors.join('\n')}`;
          showToast(errorMsg, 'error');
          throw new Error(`Lab save had errors: ${errors.join('; ')}`);
        }

        // Show success message with details
        if (savedCount > 0 || updatedCount > 0 || deletedCount > 0) {
          const details = [];
          if (savedCount > 0) details.push(`${savedCount} ditambah`);
          if (updatedCount > 0) details.push(`${updatedCount} diupdate`);
          if (deletedCount > 0) details.push(`${deletedCount} dihapus`);
          console.log(`[follow-up] Lab results saved successfully: ${details.join(', ')}`);
        }
      } catch (error) {
        console.error('[follow-up] CRITICAL ERROR saving lab results:', error);
        showToast(`ERROR: Gagal menyimpan hasil lab. ${error.message}. Data Anda mungkin belum tersimpan!`, 'error');
        throw error; // Re-throw to prevent further processing
      }
    }

    // Display change history if there are changes
    if (changes.length > 0) {
      displayChangeHistory(changes);
    } else {
      showToast('Detail MCU berhasil diupdate!', 'success');
      // Auto-close modal after save
      setTimeout(() => {
        closeMCUUpdateModal();
        loadFollowUpList();
      }, 800);
    }

  } catch (error) {
    showToast('Gagal mengupdate MCU: ' + error.message, 'error');
  }
};

// Display change history in modal
function displayChangeHistory(changes) {
  const historySection = document.getElementById('change-history-section');
  const historyContainer = document.getElementById('change-history-container');

  if (!historySection || !historyContainer) return;

  // Build table HTML
  let tableHtml = '<table class="table"><thead><tr>';
  tableHtml += '<th>ITEM MCU</th>';
  tableHtml += '<th>HASIL AWAL</th>';
  tableHtml += '<th>HASIL AKHIR</th>';
  tableHtml += '<th>STATUS</th>';
  tableHtml += '</tr></thead><tbody>';

  changes.forEach(change => {
    tableHtml += '<tr>';
    tableHtml += `<td><span class="font-medium">${change.itemName}</span></td>`;
    tableHtml += `<td><span class="text-gray-700">${change.oldValue}</span></td>`;
    tableHtml += `<td><span class="text-gray-700">${change.newValue}</span></td>`;
    tableHtml += `<td><span class="badge badge-success">Diubah</span></td>`;
    tableHtml += '</tr>';
  });

  tableHtml += '</tbody></table>';

  historyContainer.innerHTML = tableHtml;
  historySection.classList.remove('hidden');

  // Scroll to history section
  historySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Show toast and close after delay
  showToast(`${changes.length} item MCU berhasil diupdate!`, 'success');

  setTimeout(() => {
    closeMCUUpdateModal();
    loadFollowUpList();
  }, 2000);
}

window.handleLogout = function() {
  authService.logout();
};

// Initialize page when ready
supabaseReady.then(() => {
  init();
}).catch(err => {
  // Still initialize even if Supabase wait failed
  init();
});
