/**
 * ASSESSMENT RAHMA DASHBOARD
 * Risk Assessment Health Management Analytics - Dashboard View
 *
 * Shows:
 * - Filter controls
 * - Risk category cards (LOW, MEDIUM, HIGH) with count & percentage
 * - Complete employee list with latest MCU assessment scores
 * - All calculations based on latest MCU per active employee
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { labService } from '../services/labService.js';
import { masterDataService } from '../services/masterDataService.js';
import { framinghamCalculatorService } from '../services/framinghamCalculatorService.js';
import { database } from '../services/database.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';
import { initSuperSearch } from '../components/superSearch.js';

// State
let allEmployees = [];
let allMCUs = [];
let assessmentData = [];
let filteredData = [];
let departments = [];
let jobTitles = [];
let vendors = [];
let currentPage = 1;
const itemsPerPage = 15;
let currentFilter = 'all'; // 'all', 'low', 'medium', 'high'

/**
 * Initialize RAHMA Dashboard
 */
export async function initAssessmentRahmaDAshboard() {
  try {
    await supabaseReady;

    // Check auth
    const user = await authService.getCurrentUser();
    if (!user) {
      showToast('Anda harus login terlebih dahulu', 'error');
      return;
    }

    // Show loading
    const page = document.getElementById('rahma-main-content');
    if (page) {
      page.innerHTML = '<div class="p-6"><p class="text-gray-600">Loading...</p></div>';
    }

    // Load all data
    await Promise.all([
      loadEmployees(),
      loadMCUs(),
      loadDepartments(),
      loadJobTitles(),
      loadVendors()
    ]);

    // Calculate assessments for all active employees (latest MCU only)
    calculateAllAssessments();

    // Initialize super search
    initSuperSearch();

    // Render dashboard
    renderDashboard();

    showToast('Assessment RAHMA Dashboard dimuat', 'success');

  } catch (error) {
    console.error('Error initializing RAHMA dashboard:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Load all employees (active only)
 */
async function loadEmployees() {
  try {
    const all = await employeeService.getAll();
    // Filter: active employees only (is_active = true, deleted_at = null)
    allEmployees = all.filter(emp => emp.is_active && !emp.deleted_at);
  } catch (error) {
    console.error('Error loading employees:', error);
    allEmployees = [];
  }
}

/**
 * Load all MCUs
 */
async function loadMCUs() {
  try {
    allMCUs = await mcuService.getAll();
  } catch (error) {
    console.error('Error loading MCUs:', error);
    allMCUs = [];
  }
}

/**
 * Load departments
 */
async function loadDepartments() {
  try {
    departments = await masterDataService.getAll('departments');
  } catch (error) {
    departments = [];
  }
}

/**
 * Load job titles
 */
async function loadJobTitles() {
  try {
    jobTitles = await masterDataService.getAll('job_titles');
  } catch (error) {
    jobTitles = [];
  }
}

/**
 * Load vendors
 */
async function loadVendors() {
  try {
    vendors = await masterDataService.getAll('vendors');
  } catch (error) {
    vendors = [];
  }
}

/**
 * Calculate assessment for all active employees
 * Uses LATEST MCU for each employee only
 */
function calculateAllAssessments() {
  assessmentData = [];

  allEmployees.forEach(employee => {
    // Get latest MCU for this employee
    const employeeMCUs = allMCUs
      .filter(mcu => mcu.employee_id === employee.employee_id && !mcu.deleted_at)
      .sort((a, b) => new Date(b.mcu_date) - new Date(a.mcu_date));

    if (employeeMCUs.length === 0) {
      // No MCU, skip
      return;
    }

    const latestMCU = employeeMCUs[0];

    // Only include if MCU has final result (completed)
    if (!latestMCU.final_result) {
      return;
    }

    // Get associated data
    const dept = departments.find(d => d.id === employee.departmentId);
    const job = jobTitles.find(j => j.id === employee.jobId);
    const vendor = employee.vendor_name
      ? vendors.find(v => v.name === employee.vendor_name)
      : null;

    // Get lab results for latest MCU
    const labResults = allMCUs
      .find(m => m.mcu_id === latestMCU.mcu_id)
      ? allMCUs.filter(m => m.employee_id === employee.employee_id)
        .find(m => m.mcu_id === latestMCU.mcu_id)
      : null;

    // Prepare assessment data
    const assessmentInput = {
      gender: employee.jenis_kelamin === 'L' || employee.jenis_kelamin === 'Laki-laki' ? 'pria' : 'wanita',
      age: calculateAge(employee.date_of_birth, latestMCU.mcu_date),
      jobRiskLevel: job?.risk_level || 'moderate',
      exerciseFrequency: latestMCU.exercise_frequency || '1-2x_seminggu',
      smokingStatus: latestMCU.smoking_status || 'tidak_merokok',
      systolic: parseFloat(latestMCU.blood_pressure?.split('/')[0]) || null,
      diastolic: parseFloat(latestMCU.blood_pressure?.split('/')[1]) || null,
      bmi: parseFloat(latestMCU.bmi) || null,
      glucose: null,
      cholesterol: null,
      triglycerides: null,
      hdl: null
    };

    // Get lab values (will need to fetch from pemeriksaan_lab)
    // For now, use nulls - will update in separate call
    // TODO: Load lab results

    // Calculate Framingham score
    let result = null;
    try {
      result = framinghamCalculatorService.performCompleteAssessment(assessmentInput);
    } catch (err) {
      console.warn(`Error calculating assessment for ${employee.employee_id}:`, err);
      return;
    }

    // Add to assessment data
    assessmentData.push({
      employee: {
        employee_id: employee.employee_id,
        name: employee.name,
        gender: employee.jenis_kelamin,
        birthDate: employee.date_of_birth,
        department: dept?.name || 'N/A',
        jobTitle: job?.name || 'N/A',
        vendorName: vendor?.name || null,
        isActive: employee.is_active
      },
      mcu: {
        mcuId: latestMCU.mcu_id,
        mcuDate: latestMCU.mcu_date,
        mcuType: latestMCU.mcu_type,
        bloodPressure: latestMCU.blood_pressure,
        bmi: latestMCU.bmi,
        smokingStatus: latestMCU.smoking_status,
        exerciseFrequency: latestMCU.exercise_frequency,
        finalResult: latestMCU.final_result
      },
      assessment: result,
      scores: {
        gender: result.jenis_kelamin_score,
        age: result.umur_score,
        jobRisk: result.job_risk_score,
        exercise: result.exercise_score,
        smoking: result.smoking_score,
        bloodPressure: result.tekanan_darah_score,
        bmi: result.bmi_score,
        glucose: result.gdp_score,
        cholesterol: result.kolesterol_score,
        triglycerides: result.trigliserida_score,
        hdl: result.hdl_score
      },
      totalScore: result.total_score,
      riskCategory: result.risk_category
    });
  });

  // Set filtered data to all
  applyFilter('all');
}

/**
 * Apply filter by risk category
 */
export function applyFilter(category) {
  currentFilter = category;
  currentPage = 1;

  if (category === 'all') {
    filteredData = [...assessmentData];
  } else {
    filteredData = assessmentData.filter(d => d.riskCategory === category);
  }

  renderDashboard();
}

/**
 * Search function
 */
export function searchAssessments() {
  const searchTerm = document.getElementById('rahma-search')?.value?.toLowerCase() || '';

  if (currentFilter === 'all') {
    filteredData = assessmentData.filter(d => {
      const searchString = `${d.employee.employee_id} ${d.employee.name}`.toLowerCase();
      return searchString.includes(searchTerm);
    });
  } else {
    filteredData = assessmentData
      .filter(d => d.riskCategory === currentFilter)
      .filter(d => {
        const searchString = `${d.employee.employee_id} ${d.employee.name}`.toLowerCase();
        return searchString.includes(searchTerm);
      });
  }

  currentPage = 1;
  renderDashboard();
}

/**
 * Render complete dashboard
 */
function renderDashboard() {
  const page = document.getElementById('rahma-main-content');
  if (!page) return;

  // Count by risk category
  const lowCount = assessmentData.filter(d => d.riskCategory === 'low').length;
  const mediumCount = assessmentData.filter(d => d.riskCategory === 'medium').length;
  const highCount = assessmentData.filter(d => d.riskCategory === 'high').length;
  const total = assessmentData.length;

  const lowPct = total > 0 ? ((lowCount / total) * 100).toFixed(1) : 0;
  const mediumPct = total > 0 ? ((mediumCount / total) * 100).toFixed(1) : 0;
  const highPct = total > 0 ? ((highCount / total) * 100).toFixed(1) : 0;

  // Build HTML
  let html = `
    <!-- Header -->
    <div class="p-6 pb-0">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">📊 Assessment RAHMA Dashboard</h1>
      <p class="text-gray-600">Framingham CVD Risk Assessment - Penilaian Risiko Kardiovaskular</p>
    </div>

    <!-- Search Bar -->
    <div class="p-6 pb-0">
      <input type="text" id="rahma-search" placeholder="Cari Karyawan: Nama atau ID..."
        onkeyup="window.assessmentRAHMA.searchAssessments()"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
    </div>

    <!-- Risk Category Cards -->
    <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- LOW RISK Card -->
      <div onclick="window.assessmentRAHMA.applyFilter('low')"
           class="cursor-pointer p-4 rounded-lg border-2 transition transform hover:scale-105
                  ${currentFilter === 'low' ? 'bg-green-50 border-green-500' : 'bg-green-50 border-green-200 hover:border-green-400'}">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-green-600 font-semibold">LOW RISK</p>
            <p class="text-3xl font-bold text-green-700">${lowCount}</p>
            <p class="text-xs text-green-600 mt-1">Karyawan</p>
          </div>
          <div class="text-4xl text-green-300">✅</div>
        </div>
        <div class="mt-3 bg-green-100 rounded px-2 py-1 text-center">
          <p class="text-lg font-bold text-green-800">${lowPct}%</p>
        </div>
      </div>

      <!-- MEDIUM RISK Card -->
      <div onclick="window.assessmentRAHMA.applyFilter('medium')"
           class="cursor-pointer p-4 rounded-lg border-2 transition transform hover:scale-105
                  ${currentFilter === 'medium' ? 'bg-yellow-50 border-yellow-500' : 'bg-yellow-50 border-yellow-200 hover:border-yellow-400'}">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-yellow-600 font-semibold">MEDIUM RISK</p>
            <p class="text-3xl font-bold text-yellow-700">${mediumCount}</p>
            <p class="text-xs text-yellow-600 mt-1">Karyawan</p>
          </div>
          <div class="text-4xl text-yellow-300">⚠️</div>
        </div>
        <div class="mt-3 bg-yellow-100 rounded px-2 py-1 text-center">
          <p class="text-lg font-bold text-yellow-800">${mediumPct}%</p>
        </div>
      </div>

      <!-- HIGH RISK Card -->
      <div onclick="window.assessmentRAHMA.applyFilter('high')"
           class="cursor-pointer p-4 rounded-lg border-2 transition transform hover:scale-105
                  ${currentFilter === 'high' ? 'bg-red-50 border-red-500' : 'bg-red-50 border-red-200 hover:border-red-400'}">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-red-600 font-semibold">HIGH RISK</p>
            <p class="text-3xl font-bold text-red-700">${highCount}</p>
            <p class="text-xs text-red-600 mt-1">Karyawan</p>
          </div>
          <div class="text-4xl text-red-300">🔴</div>
        </div>
        <div class="mt-3 bg-red-100 rounded px-2 py-1 text-center">
          <p class="text-lg font-bold text-red-800">${highPct}%</p>
        </div>
      </div>
    </div>

    <!-- Toggle All Button -->
    <div class="px-6 py-2">
      <button onclick="window.assessmentRAHMA.applyFilter('all')"
              class="px-3 py-1 text-sm rounded border ${currentFilter === 'all' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'}">
        Lihat Semua (${total})
      </button>
    </div>

    <!-- Employee List Table -->
    <div class="p-6">
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 border-b sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-gray-700">No.</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-700">ID Karyawan</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-700">Nama</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-700">Dept</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-700">Posisi</th>
              <th class="px-4 py-3 text-center font-semibold text-gray-700">Tanggal MCU</th>
              <th class="px-4 py-3 text-center font-semibold text-gray-700">11 Parameters Score</th>
              <th class="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
              <th class="px-4 py-3 text-center font-semibold text-gray-700">Risk</th>
            </tr>
          </thead>
          <tbody id="employee-list-body">
            <!-- Populated by function -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div class="p-6 flex justify-between items-center">
      <div class="text-sm text-gray-600" id="pagination-info">
        Halaman 1 dari 1
      </div>
      <div class="flex gap-2">
        <button onclick="window.assessmentRAHMA.prevPage()"
          class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" id="prev-btn">
          ← Sebelumnya
        </button>
        <button onclick="window.assessmentRAHMA.nextPage()"
          class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" id="next-btn">
          Berikutnya →
        </button>
      </div>
    </div>
  `;

  page.innerHTML = html;

  // Populate table
  renderEmployeeTable();
}

/**
 * Render employee list table
 */
function renderEmployeeTable() {
  const tbody = document.getElementById('employee-list-body');
  if (!tbody) return;

  // Pagination
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageData = filteredData.slice(startIdx, endIdx);

  tbody.innerHTML = '';

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-gray-500 py-4">Tidak ada data</td></tr>';
    updatePagination();
    return;
  }

  pageData.forEach((item, idx) => {
    const riskBg = item.riskCategory === 'low' ? 'bg-green-100 text-green-800' :
                   item.riskCategory === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                   'bg-red-100 text-red-800';

    const riskLabel = item.riskCategory === 'low' ? '✅ LOW' :
                     item.riskCategory === 'medium' ? '⚠️ MEDIUM' :
                     '🔴 HIGH';

    // Format scores display
    const scoresStr = `${item.scores.gender}|${item.scores.age}|${item.scores.jobRisk}|${item.scores.exercise}|${item.scores.smoking}|${item.scores.bloodPressure}|${item.scores.bmi}|${item.scores.glucose}|${item.scores.cholesterol}|${item.scores.triglycerides}|${item.scores.hdl}`;

    const row = document.createElement('tr');
    row.className = 'border-b hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-4 py-3 text-sm">${startIdx + idx + 1}</td>
      <td class="px-4 py-3 text-sm font-mono text-blue-600">${item.employee.employee_id}</td>
      <td class="px-4 py-3 text-sm font-medium">${item.employee.name}</td>
      <td class="px-4 py-3 text-sm">${item.employee.department}</td>
      <td class="px-4 py-3 text-sm">${item.employee.jobTitle}</td>
      <td class="px-4 py-3 text-sm text-center">${formatDateDisplay(item.mcu.mcuDate)}</td>
      <td class="px-4 py-3 text-xs text-center font-mono">
        <span title="G|A|JR|Ex|Sm|BP|BMI|Glu|Chol|Trig|HDL"
              class="bg-gray-100 px-2 py-1 rounded">${scoresStr}</span>
      </td>
      <td class="px-4 py-3 text-sm text-center font-bold">${item.totalScore > 0 ? '+' : ''}${item.totalScore}</td>
      <td class="px-4 py-3 text-sm text-center">
        <span class="px-2 py-1 rounded text-xs font-semibold ${riskBg}">
          ${riskLabel}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });

  updatePagination();
}

/**
 * Update pagination info
 */
function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const infoEl = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (infoEl) {
    infoEl.textContent = `Menampilkan ${filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-${Math.min(currentPage * itemsPerPage, filteredData.length)} dari ${filteredData.length} karyawan`;
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Go to next page
 */
export function nextPage() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderEmployeeTable();
  }
}

/**
 * Go to previous page
 */
export function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderEmployeeTable();
  }
}

// Export to window
window.assessmentRAHMA = {
  initAssessmentRahmaDAshboard,
  applyFilter,
  searchAssessments,
  nextPage,
  prevPage
};
