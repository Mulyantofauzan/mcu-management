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
const itemsPerPage = 10;

/**
 * Calculate Jakarta Cardiovascular Score for a single employee
 */
function calculateJakartaCardiovascularScore(employee, mcu, hasDiabetes) {
    let score = 0;
    let scores = {
        jk: 0,
        td: 0,
        imt: 0,
        merokok: 0,
        diabetes: 0
    };

    // 1. Jenis Kelamin (JK)
    // Pria: 1, Wanita: 0
    if (employee.gender?.toLowerCase() === 'pria' || employee.gender?.toLowerCase() === 'male' || employee.gender === 'M') {
        scores.jk = 1;
        score += 1;
    }

    // 2. Tekanan Darah (TD)
    // If TD ≥ 140/90: +3, else: 0
    if (mcu?.bloodPressure) {
        const bpParts = mcu.bloodPressure.toString().split('/');
        const systolic = parseInt(bpParts[0]);
        const diastolic = parseInt(bpParts[1]);
        if (systolic >= 140 || diastolic >= 90) {
            scores.td = 3;
            score += 3;
        }
    }

    // 3. IMT (same as BMI)
    // If BMI ≥ 25: +1, else: 0
    if (mcu?.bmi && parseFloat(mcu.bmi) >= 25) {
        scores.imt = 1;
        score += 1;
    }

    // 4. Merokok (Smoking Status)
    // Tidak merokok: 0, Bekas/Mantan merokok: 3, Perokok aktif: 4
    if (mcu?.smokingStatus) {
        const status = mcu.smokingStatus.toLowerCase();
        if (status.includes('aktif') || status.includes('current')) {
            scores.merokok = 4;
            score += 4;
        } else if (status.includes('bekas') || status.includes('mantan') || status.includes('former')) {
            scores.merokok = 3;
            score += 3;
        }
    }

    // 5. Diabetes
    // If has diabetes: 2, else: 0
    if (hasDiabetes) {
        scores.diabetes = 2;
        score += 2;
    }

    return { score, scores };
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
        1: { label: 'Low', color: 'bg-green-100 text-green-800', bgColor: 'bg-green-50' },
        2: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', bgColor: 'bg-yellow-50' },
        3: { label: 'High', color: 'bg-red-100 text-red-800', bgColor: 'bg-red-50' },
        4: { label: 'Critical', color: 'bg-purple-100 text-purple-800', bgColor: 'bg-purple-50' }
    };
    return badges[riskLevel] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800', bgColor: 'bg-gray-50' };
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
    departments = await database.MasterData.getDepartments() || [];
}

/**
 * Load job titles
 */
async function loadJobTitles() {
    jobTitles = await database.MasterData.getJobTitles() || [];
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
            const { score, scores } = calculateJakartaCardiovascularScore(employee, latestMCU, hasDiabetes);
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
                scores: scores,
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
    renderPagination();
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
        tbody.innerHTML = '<tr><td colspan="24" class="px-4 py-6 text-center text-gray-500">Tidak ada data</td></tr>';
        return;
    }

    tbody.innerHTML = paginatedData.map((item, index) => {
        const badge = getRiskBadge(item.riskLevel);
        const rowBgColor = badge.bgColor;

        // Default values for Sindrom Metabolik (currently empty, will be populated if data exists)
        const lp = item.mcu?.waistCircumference || '-';
        const tg = item.mcu?.triglycerides || '-';
        const hdl = item.mcu?.hdlCholesterol || '-';
        const tdMetabolik = item.mcu?.bloodPressure || '-';
        const gdp = item.mcu?.fastingGlucose || '-';
        const nilaiMetabolik = '-';
        const riskMetabolik = '-';
        const riskTotal = item.score;

        return `
            <tr class="${rowBgColor}">
                <td class="px-3 py-3 text-sm text-center border border-gray-300">${start + index + 1}</td>
                <td class="px-3 py-3 text-sm font-medium border border-gray-300">${item.name}</td>

                <!-- Jakarta Cardiovascular Score Columns -->
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.jk}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.age}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.td}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.imt}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.bloodPressure || '-'}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.bmi || '-'}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.merokok}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.diabetes}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${getRiskFactorLabel(item.riskLevel)}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.score}</td>

                <!-- Sindrom Metabolik Columns -->
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${lp}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${tg}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${hdl}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${tdMetabolik}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${gdp}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${nilaiMetabolik}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${riskMetabolik}</td>

                <!-- Summary Columns -->
                <td class="px-3 py-3 text-sm text-center border border-gray-300 font-semibold">${riskTotal}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${badge.color}">
                        ${badge.label}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get risk factor label based on score
 */
function getRiskFactorLabel(riskLevel) {
    const labels = {
        1: '0',
        2: '1',
        3: '1',
        4: '1'
    };
    return labels[riskLevel] || '-';
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const paginationDiv = document.getElementById('pagination-controls');
    if (!paginationDiv) return;

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    let html = '<div class="flex items-center justify-between mt-4">';
    html += `<p class="text-sm text-gray-600">Halaman <span class="font-semibold">${currentPage}</span> dari <span class="font-semibold">${totalPages || 1}</span> | Total: <span class="font-semibold">${filteredData.length}</span> data</p>`;

    html += '<div class="flex gap-2">';

    // Previous button
    if (currentPage > 1) {
        html += `<button onclick="window.goToPreviousPage()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">← Sebelumnya</button>`;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button onclick="window.goToPage(${i})" class="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm">${i}</button>`;
        } else if (i <= 3 || i > totalPages - 3 || Math.abs(i - currentPage) <= 1) {
            html += `<button onclick="window.goToPage(${i})" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">${i}</button>`;
        } else if (i === 4 || i === totalPages - 3) {
            html += `<span class="px-3 py-2">...</span>`;
        }
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<button onclick="window.goToNextPage()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">Selanjutnya →</button>`;
    }

    html += '</div></div>';

    paginationDiv.innerHTML = html;
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

    // Pagination functions
    window.goToPage = (page) => {
        currentPage = page;
        renderTable();
        renderPagination();
        document.getElementById('data-table')?.scrollIntoView({ behavior: 'smooth' });
    };

    window.goToNextPage = () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            window.goToPage(currentPage + 1);
        }
    };

    window.goToPreviousPage = () => {
        if (currentPage > 1) {
            window.goToPage(currentPage - 1);
        }
    };
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
            <div class="overflow-x-auto" style="min-height: 400px;">
                <table class="text-sm border-collapse" style="min-width: 2400px; width: 100%;">
                    <thead class="bg-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
                        <tr>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 50px; background-color: #f3f4f6;">No</th>
                            <th class="px-3 py-3 text-left font-semibold border border-gray-300" style="min-width: 150px; background-color: #f3f4f6;">Nama</th>

                            <!-- Jakarta Cardiovascular Score Header -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" colspan="10" style="background-color: #fcd34d;">Jakarta Cardiovascular Score</th>

                            <!-- Sindrom Metabolik Header -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" colspan="7" style="background-color: #93c5fd;">Sindrom Metabolik</th>

                            <!-- Summary Columns -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" colspan="2" style="background-color: #e5e7eb;">Summary</th>
                        </tr>
                        <tr>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 50px;"></th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 150px;"></th>

                            <!-- Jakarta Cardiovascular Score Sub-headers -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">JK</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">Umur</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">TD</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">IMT</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 100px; background-color: #fef3c7;">Tekanan Darah</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">BMI</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #fef3c7;">Merokok</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #fef3c7;">Diabetes</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 120px; background-color: #fef3c7;">Akt/Faktor Risiko</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 70px; background-color: #fef3c7;">Nilai</th>

                            <!-- Sindrom Metabolik Sub-headers -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">LP</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">TG</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">HDL</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">TD</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #dbeafe;">GDP</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">Nilai</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #dbeafe;">Risk</th>

                            <!-- Summary Sub-headers -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #f3f4f6;">Risk Total</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 100px; background-color: #f3f4f6;">Risk Level</th>
                        </tr>
                    </thead>
                    <tbody id="data-table">
                        <tr>
                            <td colspan="24" class="px-4 py-6 text-center text-gray-500">Memuat data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination -->
        <div id="pagination-controls" class="mt-6"></div>
    `;

    populateFilters();
    setupFilters();
    updateRiskCounters();
    renderTable();
    renderPagination();
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
