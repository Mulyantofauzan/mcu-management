/**
 * JAKARTA CARDIOVASCULAR SCORE ASSESSMENT
 * Analysis of cardiovascular risk based on Jakarta Cardiovascular criteria
 *
 * Shows:
 * - Filter controls
 * - Risk category cards (Low, Medium, High, Critical) with count
 * - Complete employee list with cardiovascular scoring
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import database from '../services/databaseAdapter.js';
import { formatDateDisplay, calculateAge } from '../utils/dateHelpers.js';
import { showToast } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';

// State
let allEmployees = [];
let allMCUs = [];
let cardiovascularData = [];
let filteredData = [];
let departments = [];
let jobTitles = [];
let currentPage = 1;
const itemsPerPage = 15;

/**
 * Calculate Jakarta Cardiovascular Score for a single employee
 */
function calculateJakartaCardiovascularScore(employee, mcu, hasDiabetes) {
    let score = 0;

    // 1. Jenis Kelamin (JK)
    // Pria: 1, Wanita: 0
    if (employee.gender?.toLowerCase() === 'pria' || employee.gender?.toLowerCase() === 'male' || employee.gender === 'M') {
        score += 1;
    }

    // 2. Tekanan Darah (TD)
    // If TD ≥ 140/90: +3, else: 0
    if (mcu?.bloodPressure) {
        const bpParts = mcu.bloodPressure.toString().split('/');
        const systolic = parseInt(bpParts[0]);
        const diastolic = parseInt(bpParts[1]);
        if (systolic >= 140 || diastolic >= 90) {
            score += 3;
        }
    }

    // 3. IMT (same as BMI)
    // If BMI ≥ 25: +1, else: 0
    if (mcu?.bmi && parseFloat(mcu.bmi) >= 25) {
        score += 1;
    }

    // 4. Merokok (Smoking Status)
    // Tidak merokok: 0, Bekas/Mantan merokok: 3, Perokok aktif: 4
    if (mcu?.smokingStatus) {
        const status = mcu.smokingStatus.toLowerCase();
        if (status.includes('aktif') || status.includes('current')) {
            score += 4;
        } else if (status.includes('bekas') || status.includes('mantan') || status.includes('former')) {
            score += 3;
        }
    }

    // 5. Diabetes
    // If has diabetes: 2, else: 0
    if (hasDiabetes) {
        score += 2;
    }

    return score;
}

/**
 * Determine risk level based on score
 */
function getRiskLevel(score) {
    if (score >= -7 && score <= -1) return 1; // Low Risk
    if (score >= 2 && score <= 4) return 2; // Medium Risk
    if (score === 5) return 3; // High Risk
    if (score >= 6) return 4; // Critical
    return 0; // Unknown
}

/**
 * Get risk level label and color
 */
function getRiskBadge(riskLevel) {
    const badges = {
        1: { label: 'Low Risk', color: 'bg-green-100 text-green-800' },
        2: { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' },
        3: { label: 'High Risk', color: 'bg-red-100 text-red-800' },
        4: { label: 'Critical', color: 'bg-purple-100 text-purple-800' }
    };
    return badges[riskLevel] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
}

/**
 * Load employees
 */
async function loadEmployees() {
    allEmployees = await employeeService.getAll();
}

/**
 * Load MCUs
 */
async function loadMCUs() {
    allMCUs = await mcuService.getAll();
}

/**
 * Load departments
 */
async function loadDepartments() {
    departments = await database.getAll('departments') || [];
}

/**
 * Load job titles
 */
async function loadJobTitles() {
    jobTitles = await database.getAll('jobTitles') || [];
}

/**
 * Calculate all cardiovascular scores
 */
async function calculateAllAssessments() {
    cardiovascularData = [];

    for (const employee of allEmployees) {
        try {
            // Get latest MCU for this employee
            const employeeMCUs = allMCUs.filter(m => m.employeeId === employee.employeeId);
            if (employeeMCUs.length === 0) continue;

            const latestMCU = employeeMCUs.sort((a, b) =>
                new Date(b.mcuDate) - new Date(a.mcuDate)
            )[0];

            // Check for diabetes
            const medicalHistories = await database.MedicalHistories.getByMcuId(latestMCU.mcuId);
            const hasDiabetes = medicalHistories.some(h => {
                const disease = (h.disease_name || h.diseaseName || '').toLowerCase();
                return disease.includes('diabetes') || disease.includes('dm');
            });

            // Calculate score
            const score = calculateJakartaCardiovascularScore(employee, latestMCU, hasDiabetes);
            const riskLevel = getRiskLevel(score);

            // Calculate age
            const age = new Date().getFullYear() - new Date(employee.dateOfBirth).getFullYear();

            cardiovascularData.push({
                employeeId: employee.employeeId,
                name: employee.name,
                gender: employee.gender,
                age: age,
                department: employee.department,
                jobTitle: employee.jobTitle,
                bloodPressure: latestMCU.bloodPressure,
                bmi: latestMCU.bmi,
                smoking: latestMCU.smokingStatus,
                diabetes: hasDiabetes,
                score: score,
                riskLevel: riskLevel,
                mcu: latestMCU
            });
        } catch (error) {
            console.error(`Error processing employee ${employee.name}:`, error);
        }
    }

    // Sort by score descending
    cardiovascularData.sort((a, b) => b.score - a.score);
    filteredData = [...cardiovascularData];
}

/**
 * Apply filters
 */
function applyFilters() {
    const department = document.getElementById('filter-department')?.value || '';
    const jobTitle = document.getElementById('filter-job-title')?.value || '';
    const riskLevel = document.getElementById('filter-risk')?.value || '';
    const search = document.getElementById('filter-search')?.value.toLowerCase() || '';

    filteredData = cardiovascularData.filter(item => {
        const matchDept = !department || item.department === department;
        const matchJob = !jobTitle || item.jobTitle === jobTitle;
        const matchRisk = !riskLevel || item.riskLevel === parseInt(riskLevel);
        const matchSearch = !search || item.name.toLowerCase().includes(search);

        return matchDept && matchJob && matchRisk && matchSearch;
    });

    currentPage = 1;
    updateRiskCounters();
    renderTable();
}

/**
 * Update risk counters
 */
function updateRiskCounters() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    filteredData.forEach(item => {
        counts[item.riskLevel]++;
    });

    document.getElementById('count-low').textContent = counts[1];
    document.getElementById('count-medium').textContent = counts[2];
    document.getElementById('count-high').textContent = counts[3];
    document.getElementById('count-critical').textContent = counts[4];
}

/**
 * Render data table
 */
function renderTable() {
    const tbody = document.getElementById('data-table');

    if (!tbody) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = filteredData.slice(start, end);

    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="px-4 py-6 text-center text-gray-500">Tidak ada data</td></tr>';
        return;
    }

    tbody.innerHTML = paginatedData.map((item, index) => {
        const badge = getRiskBadge(item.riskLevel);
        const scoreColor = item.score <= -1 ? 'bg-red-50' : item.score >= 2 && item.score <= 4 ? 'bg-yellow-50' : item.score === 5 ? 'bg-orange-50' : 'bg-purple-50';
        const smokeScore = getSmokeScore(item.smoking);
        const bmiScore = item.bmi && parseFloat(item.bmi) >= 25 ? '1' : '0';
        const diabetesScore = item.diabetes ? '2' : '0';
        const genderScore = item.gender?.toLowerCase() === 'pria' || item.gender?.toLowerCase() === 'male' ? '1' : '0';
        const bpScore = item.bloodPressure ? (item.bloodPressure.split('/')[0] >= 140 ? '3' : '0') : '0';

        return `
            <tr class="${scoreColor}">
                <td class="px-4 py-3 text-sm">${start + index + 1}</td>
                <td class="px-4 py-3 text-sm font-medium">${item.name}</td>
                <td class="px-4 py-3 text-sm text-center">${genderScore}</td>
                <td class="px-4 py-3 text-sm text-center">${bpScore}</td>
                <td class="px-4 py-3 text-sm text-center">${item.bloodPressure || '-'}</td>
                <td class="px-4 py-3 text-sm text-center">${bmiScore}</td>
                <td class="px-4 py-3 text-sm text-center">${smokeScore}</td>
                <td class="px-4 py-3 text-sm text-center">${diabetesScore}</td>
                <td class="px-4 py-3 text-sm text-center font-semibold">${item.score}</td>
                <td class="px-4 py-3 text-sm text-center">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${badge.color}">
                        ${badge.label}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Helper: Get smoking score
 */
function getSmokeScore(smokingStatus) {
    if (!smokingStatus) return '0';
    const status = smokingStatus.toLowerCase();
    if (status.includes('aktif') || status.includes('current')) return '4';
    if (status.includes('bekas') || status.includes('mantan') || status.includes('former')) return '3';
    return '0';
}

/**
 * Populate filter dropdowns
 */
function populateFilters() {
    const deptSelect = document.getElementById('filter-department');
    const jobSelect = document.getElementById('filter-job-title');

    if (deptSelect) {
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.department_name || dept.name;
            option.textContent = dept.department_name || dept.name;
            deptSelect.appendChild(option);
        });
    }

    if (jobSelect) {
        jobTitles.forEach(job => {
            const option = document.createElement('option');
            option.value = job.jobTitle || job.name;
            option.textContent = job.jobTitle || job.name;
            jobSelect.appendChild(option);
        });
    }
}

/**
 * Setup filter listeners
 */
function setupFilters() {
    const filterDept = document.getElementById('filter-department');
    const filterJob = document.getElementById('filter-job-title');
    const filterRisk = document.getElementById('filter-risk');
    const filterSearch = document.getElementById('filter-search');

    if (filterDept) filterDept.addEventListener('change', applyFilters);
    if (filterJob) filterJob.addEventListener('change', applyFilters);
    if (filterRisk) filterRisk.addEventListener('change', applyFilters);
    if (filterSearch) filterSearch.addEventListener('input', applyFilters);
}

/**
 * Render main dashboard
 */
function renderDashboard() {
    const mainContent = document.getElementById('rahma-main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Jakarta Cardiovascular Score</h1>
            <p class="text-gray-600 mt-2">Penilaian risiko cardiovascular berdasarkan kriteria Jakarta Cardiovascular</p>
        </div>

        <!-- Risk Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-lg border-l-4 border-green-500 p-6 shadow">
                <h3 class="text-gray-600 text-sm font-medium">Low Risk</h3>
                <p class="text-3xl font-bold text-green-600 mt-2" id="count-low">0</p>
                <p class="text-xs text-gray-500 mt-1">Score: -7 to -1</p>
            </div>
            <div class="bg-white rounded-lg border-l-4 border-yellow-500 p-6 shadow">
                <h3 class="text-gray-600 text-sm font-medium">Medium Risk</h3>
                <p class="text-3xl font-bold text-yellow-600 mt-2" id="count-medium">0</p>
                <p class="text-xs text-gray-500 mt-1">Score: 2 to 4</p>
            </div>
            <div class="bg-white rounded-lg border-l-4 border-red-500 p-6 shadow">
                <h3 class="text-gray-600 text-sm font-medium">High Risk</h3>
                <p class="text-3xl font-bold text-red-600 mt-2" id="count-high">0</p>
                <p class="text-xs text-gray-500 mt-1">Score: 5</p>
            </div>
            <div class="bg-white rounded-lg border-l-4 border-purple-500 p-6 shadow">
                <h3 class="text-gray-600 text-sm font-medium">Critical</h3>
                <p class="text-3xl font-bold text-purple-600 mt-2" id="count-critical">0</p>
                <p class="text-xs text-gray-500 mt-1">Score: ≥ 6</p>
            </div>
        </div>

        <!-- Filter Section -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Filter</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Departemen</label>
                    <select id="filter-department" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500">
                        <option value="">Semua Departemen</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Jabatan</label>
                    <select id="filter-job-title" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500">
                        <option value="">Semua Jabatan</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                    <select id="filter-risk" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500">
                        <option value="">Semua Risk</option>
                        <option value="1">Low Risk</option>
                        <option value="2">Medium Risk</option>
                        <option value="3">High Risk</option>
                        <option value="4">Critical</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Pencarian</label>
                    <input type="text" id="filter-search" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500" placeholder="Cari nama karyawan...">
                </div>
            </div>
        </div>

        <!-- Data Table -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th class="px-4 py-3 text-left font-semibold">No</th>
                            <th class="px-4 py-3 text-left font-semibold">Nama</th>
                            <th class="px-4 py-3 text-center font-semibold">JK</th>
                            <th class="px-4 py-3 text-center font-semibold">TD</th>
                            <th class="px-4 py-3 text-center font-semibold">Tekanan Darah</th>
                            <th class="px-4 py-3 text-center font-semibold">IMT</th>
                            <th class="px-4 py-3 text-center font-semibold">Merokok</th>
                            <th class="px-4 py-3 text-center font-semibold">Diabetes</th>
                            <th class="px-4 py-3 text-center font-semibold">Score</th>
                            <th class="px-4 py-3 text-center font-semibold">Risk Level</th>
                        </tr>
                    </thead>
                    <tbody id="data-table">
                        <tr>
                            <td colspan="10" class="px-4 py-6 text-center text-gray-500">Memuat data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    populateFilters();
    setupFilters();
    updateRiskCounters();
    renderTable();
}

/**
 * Initialize Jakarta Cardiovascular Dashboard
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
            loadJobTitles()
        ]);

        // Calculate scores for all active employees
        await calculateAllAssessments();

        // Render dashboard
        renderDashboard();

        document.body.classList.add('initialized');
    } catch (error) {
        console.error('Error initializing Jakarta Cardiovascular:', error);
        showToast('Gagal memuat data: ' + error.message, 'error');
        document.body.classList.add('initialized');
    }
}
