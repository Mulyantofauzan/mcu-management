/**
 * Follow-Up Page
 * List and update MCU records that need follow-up
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal } from '../utils/uiHelpers.js';
import { generateRujukanPDF, generateRujukanBalikPDF } from '../utils/rujukanPDFGenerator.js';
import { supabaseReady } from '../config/supabase.js';  // ✅ FIX: Wait for Supabase initialization
import { initSuperSearch } from '../components/superSearch.js';  // ✅ NEW: Global search
import FileUploadWidget from '../components/fileUploadWidget.js';
import { uploadBatchFiles } from '../services/supabaseStorageService.js';  // ✅ NEW: File upload to Supabase
import { tempFileStorage } from '../services/tempFileStorage.js';  // ✅ NEW: Temp file management

let followUpList = [];
let filteredList = [];
let employees = [];
let departments = [];
let jobTitles = [];
let followupFileUploadWidget = null;
let doctors = [];
let currentMCU = null;

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
      console.warn('Failed to initialize Super Search:', error);
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
    // ✅ FIX: Load ONLY active employees (performance optimization)
    employees = await employeeService.getActive();
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
  // Total follow-up
  document.getElementById('stat-total').textContent = followUpList.length;

  // Completed this month (MCUs that were follow-up but now Fit in current month)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedCount = 0; // Would need to track this in history
  document.getElementById('stat-completed').textContent = completedCount;

  // Critical (more than 30 days old)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const criticalCount = followUpList.filter(mcu =>
    new Date(mcu.mcuDate) < thirtyDaysAgo
  ).length;
  document.getElementById('stat-critical').textContent = criticalCount;
}

function renderTable() {
  const container = document.getElementById('followup-table-container');

  if (filteredList.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada data follow-up</p>';
    return;
  }

  let html = '<div class="table-container"><table class="table"><thead><tr>';
  html += '<th>Nama Karyawan</th>';
  html += '<th>ID Karyawan</th>';
  html += '<th>Departemen</th>';
  html += '<th>Tanggal MCU</th>';
  html += '<th>Hasil Awal</th>';
  html += '<th>Catatan</th>';
  html += '<th>Aksi</th>';
  html += '</tr></thead><tbody>';

  filteredList.forEach(mcu => {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (!employee) return;

    const dept = departments.find(d => d.id === employee.departmentId);

    html += '<tr>';
    html += `<td><span class="font-medium text-gray-900">${employee.name}</span></td>`;
    html += `<td><span class="text-sm text-gray-600">${employee.employeeId}</span></td>`;
    html += `<td>${dept?.name || '-'}</td>`;
    html += `<td>${formatDateDisplay(mcu.mcuDate)}</td>`;
    html += `<td><span class="badge badge-warning">${mcu.initialResult}</span></td>`;
    html += `<td><span class="text-xs text-gray-600">${(mcu.initialNotes || '').substring(0, 50)}...</span></td>`;
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
  container.innerHTML = html;
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
      console.log(`📦 Uploading ${pendingFiles.length} file(s) for follow-up MCU ${mcuId}...`);

      let lastProgressShown = 0;
      const uploadResult = await uploadBatchFiles(
        pendingFiles,
        currentMCU.employeeId,
        mcuId,
        currentUser.userId || currentUser.user_id,
        // Progress callback
        (current, total, message) => {
          const percentage = Math.round((current / total) * 100);
          // Only show toast every 25% or at end
          if (percentage >= lastProgressShown + 25 || percentage === 100) {
            console.log(`⏳ Upload progress: ${current}/${total} - ${message}`);
            lastProgressShown = percentage;
          }
        }
      );

      if (uploadResult.success) {
        if (uploadResult.uploadedCount > 0) {
          showToast(`✅ ${uploadResult.uploadedCount} file(s) uploaded successfully`, 'success');
        }
        // Clear temporary files after successful upload
        tempFileStorage.clearFiles(mcuId);
      } else {
        showToast(`❌ File upload error: ${uploadResult.error}`, 'error');
        return; // Don't proceed if file upload failed
      }
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

    // Populate form fields with previous values displayed next to label
    const fieldsWithPreviousValues = {
      // Physical examination
      'update-bmi': { value: currentMCU.bmi, prevId: 'update-bmi-prev' },
      'update-bp': { value: currentMCU.bloodPressure, prevId: 'update-bp-prev' },
      'update-rr': { value: currentMCU.respiratoryRate, prevId: 'update-rr-prev' },
      'update-pulse': { value: currentMCU.pulse, prevId: 'update-pulse-prev' },
      'update-temp': { value: currentMCU.temperature, prevId: 'update-temp-prev' },
      // Vision & Hearing
      'update-vision': { value: currentMCU.vision, prevId: 'update-vision-prev' },
      'update-audio': { value: currentMCU.audiometry, prevId: 'update-audio-prev' },
      'update-colorblind': { value: currentMCU.colorblind, prevId: 'update-colorblind-prev' },
      // Respiratory
      'update-spiro': { value: currentMCU.spirometry, prevId: 'update-spiro-prev' },
      // Imaging
      'update-xray': { value: currentMCU.xray, prevId: 'update-xray-prev' },
      // Cardio
      'update-ekg': { value: currentMCU.ekg, prevId: 'update-ekg-prev' },
      'update-treadmill': { value: currentMCU.treadmill, prevId: 'update-treadmill-prev' },
      // Lab Results
      'update-kidney': { value: currentMCU.kidneyLiverFunction, prevId: 'update-kidney-prev' },
      'update-hbsag': { value: currentMCU.hbsag, prevId: 'update-hbsag-prev' },
      'update-napza': { value: currentMCU.napza, prevId: 'update-napza-prev' },
      // Referral data
      'update-recipient': { value: currentMCU.recipient, prevId: 'update-recipient-prev' },
      'update-keluhan': { value: currentMCU.keluhanUtama, prevId: 'update-keluhan-prev' },
      'update-diagnosis': { value: currentMCU.diagnosisKerja, prevId: 'update-diagnosis-prev' },
      'update-alasan': { value: currentMCU.alasanRujuk, prevId: 'update-alasan-prev' }
    };

    // Display previous values next to labels and clear input fields
    for (const [fieldId, fieldData] of Object.entries(fieldsWithPreviousValues)) {
      const input = document.getElementById(fieldId);
      const prevSpan = document.getElementById(fieldData.prevId);

      if (input) {
        input.value = ''; // Clear input so user can enter new values
      }

      if (prevSpan && fieldData.value) {
        prevSpan.textContent = `(Sebelumnya: ${fieldData.value})`;
        prevSpan.className = 'text-gray-500 text-xs';
      } else if (prevSpan) {
        prevSpan.textContent = '(Belum ada data)';
        prevSpan.className = 'text-gray-400 text-xs italic';
      }
    }

    openModal('mcu-update-modal');
  } catch (error) {

    showToast('Gagal membuka modal: ' + error.message, 'error');
  }
};

window.closeMCUUpdateModal = function() {
  closeModal('mcu-update-modal');
  currentMCU = null;
};

window.handleMCUUpdate = async function(event) {
  event.preventDefault();

  const mcuId = document.getElementById('update-mcu-id').value;

  try {
    const currentUser = authService.getCurrentUser();

    // Collect new values - only include if user entered something
    const updateData = {};
    const fieldMapping = {
      'update-bmi': 'bmi',
      'update-bp': 'bloodPressure',
      'update-rr': 'respiratoryRate',
      'update-pulse': 'pulse',
      'update-temp': 'temperature',
      'update-vision': 'vision',
      'update-audio': 'audiometry',
      'update-spiro': 'spirometry',
      'update-xray': 'xray',
      'update-ekg': 'ekg',
      'update-treadmill': 'treadmill',
      'update-kidney': 'kidneyLiverFunction',
      'update-hbsag': 'hbsag',
      'update-napza': 'napza',
      'update-recipient': 'recipient',
      'update-keluhan': 'keluhanUtama',
      'update-diagnosis': 'diagnosisKerja',
      'update-alasan': 'alasanRujuk'
    };

    for (const [fieldId, dataKey] of Object.entries(fieldMapping)) {
      const input = document.getElementById(fieldId);
      if (input && input.value.trim() !== '') {
        updateData[dataKey] = input.value.trim();
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      showToast('Tidak ada perubahan untuk disimpan', 'info');
      closeMCUUpdateModal();
      await loadFollowUpList();
      return;
    }

    // Update MCU record (this will also create MCUChange entries)
    await mcuService.updateFollowUp(mcuId, updateData, currentUser);

    showToast('Detail MCU berhasil diupdate! Silakan copy data sebelum menutup modal.', 'success');

    // Manual close (user can copy data before closing)
    // Reload follow-up list untuk update tampilan
    await loadFollowUpList();

  } catch (error) {

    showToast('Gagal mengupdate MCU: ' + error.message, 'error');
  }
};

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
