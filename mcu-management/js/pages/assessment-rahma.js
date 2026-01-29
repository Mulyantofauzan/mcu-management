/**
 * ASSESSMENT RAHMA Page
 * Risk Assessment Health Management Analytics - Framingham CVD Risk Score
 *
 * This page handles the Framingham cardiovascular disease risk assessment
 * for MCU records. It calculates 11-parameter risk scores and stores results.
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { labService } from '../services/labService.js';
import { masterDataService } from '../services/masterDataService.js';
import { framinghamCalculatorService } from '../services/framinghamCalculatorService.js';
import { database } from '../services/database.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast, openModal, closeModal } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';

let assessmentList = [];
let filteredList = [];
let employees = [];
let departments = [];
let jobTitles = [];
let currentMCU = null;
let currentEmployee = null;
let currentPage = 1;
const itemsPerPage = 10;

/**
 * Initialize page - called when menu item is clicked
 */
export async function initAssessmentRAHMA() {
  try {
    await supabaseReady;

    // Check authentication
    const user = await authService.getCurrentUser();
    if (!user) {
      showToast('Anda harus login terlebih dahulu', 'error');
      return;
    }

    // Load initial data
    await Promise.all([
      loadEmployees(),
      loadDepartments(),
      loadJobTitles(),
      loadAssessmentList()
    ]);

    // Initialize super search

    // Show the page
    document.getElementById('assessment-rahma-page').classList.remove('hidden');

    showToast('Halaman Assessment RAHMA dimuat', 'success');

  } catch (error) {
    console.error('Error initializing Assessment RAHMA:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Load employees from database
 */
async function loadEmployees() {
  try {
    employees = await employeeService.getAll();
  } catch (error) {
    console.error('Error loading employees:', error);
    employees = [];
  }
}

/**
 * Load departments from database
 */
async function loadDepartments() {
  try {
    departments = await masterDataService.getAll('departments');
  } catch (error) {
    console.error('Error loading departments:', error);
    departments = [];
  }
}

/**
 * Load job titles from database
 */
async function loadJobTitles() {
  try {
    jobTitles = await masterDataService.getAll('job_titles');
  } catch (error) {
    console.error('Error loading job titles:', error);
    jobTitles = [];
  }
}

/**
 * Load all MCUs that don't have assessment yet
 */
async function loadAssessmentList() {
  try {
    // Get all MCUs
    const allMCUs = await mcuService.getAll();

    // Filter: Only MCUs with finalResult (completed MCU)
    // and status is "Fit" or "Conditional Fit" or "Tidak Fit"
    assessmentList = allMCUs.filter(mcu =>
      mcu.finalResult && mcu.finalResult !== 'Pending'
    );

    // Sort by date descending (newest first)
    assessmentList.sort((a, b) =>
      new Date(b.mcuDate) - new Date(a.mcuDate)
    );

    filteredList = [...assessmentList];
    displayAssessmentTable();

  } catch (error) {
    console.error('Error loading assessment list:', error);
    showToast('Error memuat daftar MCU', 'error');
  }
}

/**
 * Display assessment table on page
 */
function displayAssessmentTable() {
  const tbody = document.getElementById('assessment-table-body');
  if (!tbody) return;

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, endIndex);

  // Clear table
  tbody.innerHTML = '';

  if (paginatedList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-4">Tidak ada data</td></tr>';
    updatePagination();
    return;
  }

  // Add rows
  paginatedList.forEach((mcu, index) => {
    const employee = employees.find(e => e.employee_id === mcu.employeeId);
    const dept = departments.find(d => d.id === employee?.departmentId);
    const job = jobTitles.find(j => j.id === employee?.jobId);

    const row = document.createElement('tr');
    row.className = 'border-b hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-4 py-3 text-sm">${startIndex + index + 1}</td>
      <td class="px-4 py-3 text-sm">${mcu.mcuId}</td>
      <td class="px-4 py-3 text-sm font-medium">${employee?.name || '-'}</td>
      <td class="px-4 py-3 text-sm">${dept?.name || '-'}</td>
      <td class="px-4 py-3 text-sm">${job?.name || '-'}</td>
      <td class="px-4 py-3 text-sm">${formatDateDisplay(mcu.mcuDate)}</td>
      <td class="px-4 py-3 text-sm">
        <span class="px-2 py-1 rounded text-xs font-medium
          ${mcu.finalResult === 'Fit' ? 'bg-green-100 text-green-800' :
            mcu.finalResult === 'Conditional Fit' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'}">
          ${mcu.finalResult}
        </span>
      </td>
      <td class="px-4 py-3 text-sm text-center">
        <button onclick="window.assessmentRAHMA.openAssessmentModal('${mcu.mcuId}')"
          class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">
          Assess
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  updatePagination();
}

/**
 * Update pagination controls
 */
function updatePagination() {
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const pageInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (pageInfo) {
    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages || 1}`;
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Open assessment modal for specific MCU
 */
export async function openAssessmentModal(mcuId) {
  try {
    // Load MCU data
    currentMCU = await mcuService.getById(mcuId);
    if (!currentMCU) {
      showToast('MCU tidak ditemukan', 'error');
      return;
    }

    // Load employee data
    currentEmployee = employees.find(e => e.employee_id === currentMCU.employeeId);
    if (!currentEmployee) {
      showToast('Data karyawan tidak ditemukan', 'error');
      return;
    }

    // Load lab results
    const labResults = await labService.getPemeriksaanLabByMcuId(mcuId);

    // Populate form with data
    populateAssessmentForm(currentMCU, currentEmployee, labResults);

    // Show modal
    openModal('assessment-modal');

  } catch (error) {
    console.error('Error opening assessment modal:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Populate assessment form with MCU and employee data
 */
function populateAssessmentForm(mcu, employee, labResults) {
  // Demographics (read-only, auto-filled)
  document.getElementById('assess_mcu_id').value = mcu.mcuId;
  document.getElementById('assess_employee_name').value = employee.name;
  document.getElementById('assess_gender').value = employee.gender === 'L' ? 'pria' : 'wanita';
  document.getElementById('assess_age').value = calculateAge(employee.birthDate, mcu.mcuDate);

  // Job (auto-filled from job_titles)
  const job = jobTitles.find(j => j.id === employee.jobId);
  document.getElementById('assess_job_risk').value = job?.risk_level || 'moderate';

  // Lifestyle inputs (from MCU or empty)
  document.getElementById('assess_exercise').value = mcu.exerciseFrequency || '1-2x_seminggu';
  document.getElementById('assess_smoking').value = mcu.smokingStatus || 'tidak_merokok';

  // Vital signs (from MCU)
  const [sys, dia] = parseBP(mcu.bloodPressure);
  document.getElementById('assess_systolic').value = sys || '';
  document.getElementById('assess_diastolic').value = dia || '';
  document.getElementById('assess_bmi').value = mcu.bmi || '';

  // Lab results - map from lab_item_id
  const labMap = {};
  (labResults || []).forEach(lab => {
    labMap[lab.lab_item_id] = lab.value;
  });

  // 7 = Gula Darah Puasa, 8 = Kolesterol, 9 = Trigliserida, 10 = HDL
  document.getElementById('assess_glucose').value = labMap[7] || '';
  document.getElementById('assess_cholesterol').value = labMap[8] || '';
  document.getElementById('assess_triglycerides').value = labMap[9] || '';
  document.getElementById('assess_hdl').value = labMap[10] || '';

  // Clear previous results
  document.getElementById('assessment-results').innerHTML = '';
}

/**
 * Parse blood pressure string "SBP/DBP" format
 */
function parseBP(bpString) {
  if (!bpString) return [null, null];
  const parts = String(bpString).split('/').map(p => parseInt(p, 10));
  return [parts[0] || null, parts[1] || null];
}

/**
 * Calculate and display assessment results
 */
export async function calculateAssessment() {
  try {
    // Validate required fields
    const gender = document.getElementById('assess_gender').value;
    const age = parseInt(document.getElementById('assess_age').value);

    if (!gender || !age) {
      showToast('Data demografi tidak lengkap', 'error');
      return;
    }

    // Gather all assessment data
    const assessmentData = {
      gender: gender,
      age: age,
      jobRiskLevel: document.getElementById('assess_job_risk').value,
      exerciseFrequency: document.getElementById('assess_exercise').value,
      smokingStatus: document.getElementById('assess_smoking').value,
      systolic: parseInt(document.getElementById('assess_systolic').value) || null,
      diastolic: parseInt(document.getElementById('assess_diastolic').value) || null,
      bmi: parseFloat(document.getElementById('assess_bmi').value) || null,
      glucose: parseFloat(document.getElementById('assess_glucose').value) || null,
      cholesterol: parseFloat(document.getElementById('assess_cholesterol').value) || null,
      triglycerides: parseFloat(document.getElementById('assess_triglycerides').value) || null,
      hdl: parseFloat(document.getElementById('assess_hdl').value) || null
    };

    // Validate we have enough data
    const labValuesCount = [
      assessmentData.glucose,
      assessmentData.cholesterol,
      assessmentData.triglycerides,
      assessmentData.hdl
    ].filter(v => v !== null && v !== undefined).length;

    if (labValuesCount < 3) {
      showToast('Minimal 3 dari 4 nilai lab harus ada (Glucose, Cholesterol, Triglycerides, HDL)', 'warning');
      // Continue anyway - calculator has defaults
    }

    // Calculate Framingham score
    const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

    // Display results
    displayAssessmentResults(result, assessmentData);

  } catch (error) {
    console.error('Error calculating assessment:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Display assessment results in modal
 */
function displayAssessmentResults(result, assessmentData) {
  const resultsDiv = document.getElementById('assessment-results');

  // Get risk color
  const riskColor = {
    low: 'bg-green-100 border-green-400 text-green-800',
    medium: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    high: 'bg-red-100 border-red-400 text-red-800'
  };

  const color = riskColor[result.risk_category] || riskColor.low;

  // Display main result
  const mainResult = `
    <div class="mb-6 p-4 border-l-4 rounded ${color}">
      <div class="grid grid-cols-3 gap-4">
        <div>
          <div class="text-xs font-semibold text-gray-600">Total Score</div>
          <div class="text-3xl font-bold">${result.total_score}</div>
        </div>
        <div>
          <div class="text-xs font-semibold text-gray-600">Risk Category</div>
          <div class="text-2xl font-bold uppercase">${result.risk_category}</div>
        </div>
        <div>
          <div class="text-xs font-semibold text-gray-600">10-Yr CVD Risk</div>
          <div class="text-2xl font-bold">${result.cvd_risk_percentage}</div>
        </div>
      </div>
      <div class="mt-2 text-sm">${result.description}</div>
    </div>
  `;

  // Display component breakdown
  const labels = framinghamCalculatorService.getParameterLabels();
  const paramNames = framinghamCalculatorService.getParameterNames();

  let componentsHTML = '<div class="mb-6"><h3 class="font-bold text-sm mb-3">Breakdown Skor Parameter (11):</h3>';
  componentsHTML += '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">';

  paramNames.forEach(param => {
    const score = result[param];
    const label = labels[param];
    const desc = framinghamCalculatorService.getScoreDescription(param, score);

    // Color score: negative (green), 0 (gray), positive (red)
    const scoreColor = score < 0 ? 'text-green-600' : score === 0 ? 'text-gray-600' : 'text-red-600';
    const scoreBg = score < 0 ? 'bg-green-50' : score === 0 ? 'bg-gray-50' : 'bg-red-50';

    componentsHTML += `
      <div class="p-2 rounded text-xs ${scoreBg}">
        <div class="font-semibold">${label}</div>
        <div class="flex justify-between items-center mt-1">
          <span>${desc}</span>
          <span class="font-bold ${scoreColor}">${score > 0 ? '+' : ''}${score}</span>
        </div>
      </div>
    `;
  });

  componentsHTML += '</div></div>';

  // Display recommendations based on risk
  const recommendations = getRecommendations(result);
  let recHTML = '<div class="mb-4"><h3 class="font-bold text-sm mb-2">Rekomendasi:</h3>';
  recHTML += '<ul class="text-xs space-y-1">';
  recommendations.forEach(rec => {
    recHTML += `<li class="flex items-start"><span class="mr-2">•</span><span>${rec}</span></li>`;
  });
  recHTML += '</ul></div>';

  // Combine all and display
  resultsDiv.innerHTML = mainResult + componentsHTML + recHTML;

  // Show save button
  document.getElementById('save-assessment-btn').classList.remove('hidden');
}

/**
 * Get recommendations based on risk category
 */
function getRecommendations(result) {
  const recommendations = {
    low: [
      'Lanjutkan gaya hidup sehat saat ini',
      'Pertahankan olahraga teratur (>2x per minggu)',
      'Pantau tekanan darah dan kadar gula tahunan',
      'Pemeriksaan kesehatan rutin setiap tahun'
    ],
    medium: [
      'Tingkatkan frekuensi olahraga (target 3-4x per minggu)',
      'Tinjau pola makan dan terapkan perubahan diet jantung sehat',
      'Pantau tekanan darah lebih sering',
      'Jika merokok: pertimbangkan berhenti merokok',
      'Follow-up assessment dalam 6-12 bulan',
      'Konsultasi dengan tenaga medis'
    ],
    high: [
      '⚠️ URGENT: Jadwalkan konsultasi dengan kardiolog',
      'Terapkan modifikasi gaya hidup komprehensif:',
      '  • Berhenti merokok segera jika masih aktif',
      '  • Mulai program olahraga (dengan persetujuan dokter)',
      '  • Manajemen tekanan darah ketat',
      '  • Manajemen diabetes jika ada',
      '  • Manajemen kolesterol (diet + obat)',
      'Follow-up medis ketat dan pemantauan rutin',
      'Pertimbangkan pemeriksaan jantung per rekomendasi dokter',
      'Reassessment dalam 3 bulan'
    ]
  };

  return recommendations[result.risk_category] || recommendations.low;
}

/**
 * Save assessment to database
 */
export async function saveAssessment() {
  try {
    if (!currentMCU) {
      showToast('Data MCU tidak tersedia', 'error');
      return;
    }

    // Get current user
    const user = await authService.getCurrentUser();
    if (!user) {
      showToast('Anda harus login', 'error');
      return;
    }

    // Recalculate (to ensure we have latest data)
    const gender = document.getElementById('assess_gender').value;
    const age = parseInt(document.getElementById('assess_age').value);

    const assessmentData = {
      gender: gender,
      age: age,
      jobRiskLevel: document.getElementById('assess_job_risk').value,
      exerciseFrequency: document.getElementById('assess_exercise').value,
      smokingStatus: document.getElementById('assess_smoking').value,
      systolic: parseInt(document.getElementById('assess_systolic').value) || null,
      diastolic: parseInt(document.getElementById('assess_diastolic').value) || null,
      bmi: parseFloat(document.getElementById('assess_bmi').value) || null,
      glucose: parseFloat(document.getElementById('assess_glucose').value) || null,
      cholesterol: parseFloat(document.getElementById('assess_cholesterol').value) || null,
      triglycerides: parseFloat(document.getElementById('assess_triglycerides').value) || null,
      hdl: parseFloat(document.getElementById('assess_hdl').value) || null
    };

    const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

    // Prepare data for database
    const assessmentRecord = {
      mcu_id: currentMCU.mcuId,
      employee_id: currentMCU.employeeId,
      jenis_kelamin_score: result.jenis_kelamin_score,
      umur_score: result.umur_score,
      job_risk_score: result.job_risk_score,
      exercise_score: result.exercise_score,
      smoking_score: result.smoking_score,
      tekanan_darah_score: result.tekanan_darah_score,
      bmi_score: result.bmi_score,
      gdp_score: result.gdp_score,
      kolesterol_score: result.kolesterol_score,
      trigliserida_score: result.trigliserida_score,
      hdl_score: result.hdl_score,
      total_score: result.total_score,
      risk_category: result.risk_category,
      assessment_data: result.assessment_data,
      created_at: new Date().toISOString(),
      created_by: user.user_id || user.id
    };

    // Save to database
    await database.add('framingham_assessment', assessmentRecord);

    showToast('Assessment RAHMA berhasil disimpan', 'success');

    // Close modal
    closeModal('assessment-modal');

    // Reload list
    await loadAssessmentList();

  } catch (error) {
    console.error('Error saving assessment:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Search/filter assessment list
 */
export function filterAssessments() {
  const searchTerm = document.getElementById('assessment-search').value.toLowerCase();

  filteredList = assessmentList.filter(mcu => {
    const employee = employees.find(e => e.employee_id === mcu.employeeId);
    const searchString = `${mcu.mcuId} ${employee?.name || ''} ${employee?.nik || ''}`.toLowerCase();
    return searchString.includes(searchTerm);
  });

  currentPage = 1;
  displayAssessmentTable();
}

/**
 * Go to previous page
 */
export function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    displayAssessmentTable();
  }
}

/**
 * Go to next page
 */
export function nextPage() {
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayAssessmentTable();
  }
}

// Export functions for use in HTML
window.assessmentRAHMA = {
  initAssessmentRAHMA,
  openAssessmentModal,
  calculateAssessment,
  saveAssessment,
  filterAssessments,
  prevPage,
  nextPage
};
