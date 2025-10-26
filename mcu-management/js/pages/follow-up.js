/**
 * Follow-Up Page
 * List and update MCU records that need follow-up
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { masterDataService } from '../services/masterDataService.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal, hideAdminMenuForNonAdmin } from '../utils/uiHelpers.js';
import { generateRujukanPDF, generateRujukanBalikPDF } from '../utils/rujukanPDFGenerator.js';

let followUpList = [];
let filteredList = [];
let employees = [];
let departments = [];
let jobTitles = [];
let currentMCU = null;

// Download Surat Rujukan PDF from table action button
window.downloadRujukanPDFAction = function(mcuId) {
  mcuService.getById(mcuId).then(mcu => {
    if (!mcu) {
      showToast('MCU data tidak ditemukan', 'error');
      return;
    }

    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (!employee) {
      showToast('Data karyawan tidak ditemukan', 'error');
      return;
    }

    // Prepare data untuk PDF
    const employeeData = {
      name: employee.name,
      age: calculateAge(employee.birthDate),
      jenisKelamin: employee.jenisKelamin || 'Laki-laki',
      jobTitle: employee.jobTitle,
      department: employee.department
    };

    try {
      generateRujukanPDF(employeeData, mcu);
      showToast('Surat Rujukan siap dicetak. Gunakan Ctrl+S atau Simpan PDF di print dialog.', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Gagal membuat surat rujukan: ' + error.message, 'error');
    }
  }).catch(error => {
    console.error('Error loading MCU:', error);
    showToast('Gagal memuat data MCU: ' + error.message, 'error');
  });
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
    console.error('Error generating rujukan balik:', error);
    showToast('Gagal membuat surat rujukan balik: ' + error.message, 'error');
  }
};

async function init() {
  // Check auth
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  updateUserInfo();
  await loadMasterData();
  await loadFollowUpList();
}

function updateUserInfo() {
  const user = authService.getCurrentUser();
  if (user) {
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('user-role').textContent = user.role;
    document.getElementById('user-initial').textContent = user.displayName.charAt(0).toUpperCase();
    hideAdminMenuForNonAdmin(user);
  }
}

async function loadMasterData() {
  try {
    employees = await employeeService.getAll();
    departments = await masterDataService.getAllDepartments();
    jobTitles = await masterDataService.getAllJobTitles();

    // Enrich employees with IDs (for Supabase which only stores names)
    employees = employees.map(emp => enrichEmployeeWithIds(emp));
  } catch (error) {
    console.error('Error loading master data:', error);
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

window.loadFollowUpList = async function() {
  try {
    // Get all MCUs that need follow-up
    followUpList = await mcuService.getFollowUpList();
    filteredList = [...followUpList];

    updateStats();
    renderTable();

    showToast('Data berhasil dimuat', 'success');
  } catch (error) {
    console.error('Error loading follow-up list:', error);
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

    openModal('followup-modal');
  } catch (error) {
    console.error('Error opening modal:', error);
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

    // Close first modal
    closeFollowUpModal();

    // TAMBAHAN: Buka modal untuk update detail MCU dengan placeholder values
    setTimeout(() => {
      openMCUUpdateModal(mcuId);
    }, 500);

  } catch (error) {
    console.error('Error saving follow-up:', error);
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

    // Populate form fields with current values as placeholders
    const fields = {
      'update-bmi': currentMCU.bmi,
      'update-bp': currentMCU.bloodPressure,
      'update-vision': currentMCU.vision,
      'update-audio': currentMCU.audiometry,
      'update-spiro': currentMCU.spirometry,
      'update-xray': currentMCU.xray,
      'update-ekg': currentMCU.ekg,
      'update-treadmill': currentMCU.treadmill,
      'update-kidney': currentMCU.kidneyLiverFunction,
      'update-hbsag': currentMCU.hbsag,
      'update-sgot': currentMCU.sgot,
      'update-sgpt': currentMCU.sgpt,
      'update-cbc': currentMCU.cbc,
      'update-napza': currentMCU.napza
    };

    // Set placeholder text and clear values (user can keep or change)
    for (const [fieldId, value] of Object.entries(fields)) {
      const input = document.getElementById(fieldId);
      if (input && value) {
        input.placeholder = value;
        input.value = ''; // Clear so user can type new or leave blank to keep old
      }
    }

    openModal('mcu-update-modal');
  } catch (error) {
    console.error('Error opening MCU update modal:', error);
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
      'update-sgot': 'sgot',
      'update-sgpt': 'sgpt',
      'update-cbc': 'cbc',
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
    console.error('Error updating MCU:', error);
    showToast('Gagal mengupdate MCU: ' + error.message, 'error');
  }
};

window.handleLogout = function() {
  authService.logout();
};

// Initialize
init();
