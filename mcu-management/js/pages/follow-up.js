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
      'update-kidney': currentMCU.kidneyLiverFunction,
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

    // Populate Lab Results from database
    const labContainer = document.getElementById('lab-results-container-update');
    if (labContainer) {
      try {
        const labResults = await labService.getPemeriksaanLabByMcuId(mcuId);
        if (labResults && labResults.length > 0) {
          labContainer.innerHTML = labResults.map(lab => `
            <div class="flex gap-2 items-start p-2 bg-white border border-gray-200 rounded">
              <input type="hidden" class="lab-result-id" value="${lab.id || ''}" />
              <input type="hidden" class="lab-test-name" value="${lab.lab_items?.name || ''}" />
              <input type="hidden" class="lab-result-value" value="${lab.value || ''}" />
              <div class="flex-1 text-sm text-gray-700">
                <span class="font-medium">${lab.lab_items?.name || 'Lab Test'}</span>: ${lab.value || '-'} ${lab.unit || ''}
              </div>
              <button type="button" class="btn-remove-lab text-red-500 hover:text-red-700 text-sm">Hapus</button>
            </div>
          `).join('');

          // Attach remove handlers
          labContainer.querySelectorAll('.btn-remove-lab').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const labResultElement = e.currentTarget.parentElement;
              const labResultId = labResultElement.querySelector('.lab-result-id')?.value;
              if (labResultId) {
                labResultElement.dataset.labResultId = labResultId;
              }
              labResultElement.remove();
            });
          });
        } else {
          labContainer.innerHTML = '';
        }
      } catch (error) {
        labContainer.innerHTML = '';
      }
    }

    openModal('mcu-update-modal');
  } catch (error) {

    showToast('Gagal membuka modal: ' + error.message, 'error');
  }
};

// Add Lab Result item to the update modal
window.addLabResultToUpdateModal = function() {
  const testName = prompt('Nama Test Laboratorium:');
  if (!testName) return;

  const resultValue = prompt('Hasil:');
  if (resultValue === null) return;

  const labContainer = document.getElementById('lab-results-container-update');
  if (!labContainer) return;

  const labItem = document.createElement('div');
  labItem.className = 'flex gap-2 items-start p-2 bg-white border border-gray-200 rounded';
  labItem.innerHTML = `
    <input type="hidden" class="lab-test-name" value="${testName}" />
    <input type="hidden" class="lab-result-value" value="${resultValue}" />
    <div class="flex-1 text-sm text-gray-700">
      <span class="font-medium">${testName}</span>: ${resultValue}
    </div>
    <button type="button" class="btn-remove-lab text-red-500 hover:text-red-700 text-sm">Hapus</button>
  `;

  labContainer.appendChild(labItem);

  // Attach remove handler
  labItem.querySelector('.btn-remove-lab').addEventListener('click', (e) => {
    e.preventDefault();
    labItem.remove();
  });
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
  closeModal('mcu-update-modal');
  currentMCU = null;
};

window.handleMCUUpdate = async function(event) {
  event.preventDefault();

  const mcuId = document.getElementById('update-mcu-id').value;

  try {
    const currentUser = authService.getCurrentUser();

    // Collect new values - only include editable fields and if user changed something
    const updateData = {};
    // Only these fields are editable (read-only fields like recipient, keluhan, diagnosis, alasan are excluded)
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
      'update-napza': 'napza'
    };

    for (const [fieldId, dataKey] of Object.entries(fieldMapping)) {
      const input = document.getElementById(fieldId);
      if (input && input.value.trim() !== '') {
        updateData[dataKey] = input.value.trim();
      }
    }

    // Collect lab results from the lab container
    const labContainer = document.getElementById('lab-results-container-update');
    if (labContainer) {
      const labItems = labContainer.querySelectorAll('div[class*="flex gap-2"]');
      if (labItems.length > 0) {
        updateData.labResults = Array.from(labItems).map(item => ({
          testName: item.querySelector('.lab-test-name')?.value || '',
          resultValue: item.querySelector('.lab-result-value')?.value || ''
        }));
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

    showToast('Detail MCU berhasil diupdate!', 'success');

    // Auto-close modal after save (user can see the follow-up table is updated)
    setTimeout(() => {
      closeMCUUpdateModal();
      // Reload follow-up list untuk update tampilan
      loadFollowUpList();
    }, 800);

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
