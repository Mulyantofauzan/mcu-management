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
import { labService } from '../services/labService.js';
import * as metabolicSyndromeService from '../services/metabolicSyndromeService.js';
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
let allMedicalHistories = {}; // Cache: mcuId -> [medical histories]
let allLabResults = {}; // Cache: mcuId -> [lab results]
let currentPage = 1;
const itemsPerPage = 10;

// Cache management
const CACHE_KEYS = {
    ASSESSMENTS: 'assessment_rahma_cache',
    LAB_RESULTS: 'lab_results_cache',
    TIMESTAMP: 'assessment_cache_timestamp'
};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Show loading modal with progress
 */
function showLoadingModal(message = 'Data sedang dihitung, harap tunggu sebentar...') {
    const existingModal = document.getElementById('loading-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'loading-modal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); min-width: 400px;">
                <p style="text-align: center; font-size: 16px; color: #333; margin-bottom: 20px; font-weight: 500;">${message}</p>
                <div style="background-color: #e5e7eb; border-radius: 4px; height: 8px; margin-bottom: 10px; overflow: hidden;">
                    <div id="progress-bar" style="background-color: #3b82f6; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <p style="text-align: center; font-size: 14px; color: #666;"><span id="progress-text">0</span>%</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Update loading progress
 */
function updateLoadingProgress(percentage) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    if (progressText) {
        progressText.textContent = Math.round(percentage);
    }
}

/**
 * Hide loading modal
 */
function hideLoadingModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Calculate Jakarta Cardiovascular Score for a single employee
 */
function calculateJakartaCardiovascularScore(employee, mcu, hasDiabetes) {
    let totalScore = 0;
    let scores = {
        jk: 0,
        umur: 0,
        td: 0,
        imt: 0,
        merokok: 0,
        diabetes: 0,
        aktivitasFisik: 0
    };

    // 1. Jenis Kelamin (JK)
    // Laki-laki: 1, Perempuan: 0
    const gender = (employee.jenisKelamin || employee.gender || employee.jenis_kelamin || '').toLowerCase();
    if (gender === 'laki-laki' || gender === 'male' || gender === 'm') {
        scores.jk = 1;
        totalScore += 1;
    }

    // 2. Umur (dari tanggal lahir)
    const dob = employee.birthDate || employee.dateOfBirth || employee.date_of_birth;
    if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 25 || (age >= 25 && age <= 34)) scores.umur = -4;
        else if (age >= 35 && age <= 39) scores.umur = -3;
        else if (age >= 40 && age <= 44) scores.umur = -2;
        else if (age >= 45 && age <= 49) scores.umur = 0;
        else if (age >= 50 && age <= 54) scores.umur = 1;
        else if (age >= 55 && age <= 59) scores.umur = 2;
        else if (age >= 60 && age <= 64) scores.umur = 3;
        else if (age > 64) scores.umur = 3;

        totalScore += scores.umur;
    }

    // 3. Tekanan Darah (TD)
    const bp = mcu?.bloodPressure || mcu?.blood_pressure;
    if (bp) {
        const bpParts = bp.toString().split('/');
        const systolic = parseInt(bpParts[0]);
        const diastolic = parseInt(bpParts[1]);

        if (systolic >= 180 || diastolic >= 110) scores.td = 4;
        else if ((systolic >= 160 && systolic <= 179) || (diastolic >= 100 && diastolic <= 109)) scores.td = 3;
        else if ((systolic >= 140 && systolic <= 159) || (diastolic >= 90 && diastolic <= 99)) scores.td = 2;
        else if ((systolic >= 130 && systolic <= 139) || (diastolic >= 85 && diastolic <= 89)) scores.td = 1;
        else scores.td = 0;

        totalScore += scores.td;
    }

    // 4. IMT (BMI)
    if (mcu?.bmi) {
        const bmi = parseFloat(mcu.bmi);
        if (bmi < 13.79) scores.imt = 0;
        else if (bmi >= 13.79 && bmi <= 25.99) scores.imt = 0;
        else if (bmi >= 26.00 && bmi <= 29.99) scores.imt = 1;
        else if (bmi >= 30.00 && bmi <= 35.58) scores.imt = 2;
        else if (bmi > 35.58) scores.imt = 2;

        totalScore += scores.imt;
    }

    // 5. Merokok (Smoking Status)
    const smokingStatus = mcu?.smokingStatus || mcu?.smoking_status;
    if (smokingStatus) {
        const status = smokingStatus.toLowerCase();
        if (status.includes('tidak') || status.includes('none') || status.includes('no')) {
            scores.merokok = 0;
        } else if (status.includes('mantan') || status.includes('bekas') || status.includes('former')) {
            scores.merokok = 3;
        } else if (status.includes('aktif') || status.includes('current')) {
            scores.merokok = 4;
        }

        totalScore += scores.merokok;
    }

    // 6. Diabetes
    if (hasDiabetes) {
        scores.diabetes = 2;
    }
    totalScore += scores.diabetes;

    // 7. Aktivitas Fisik (Exercise Frequency)
    const exerciseFreq = mcu?.exerciseFrequency || mcu?.exercise_frequency;
    if (exerciseFreq) {
        const freq = exerciseFreq.toLowerCase();
        if (freq.includes('tidak pernah')) scores.aktivitasFisik = 2;
        else if (freq.includes('1-2x sebulan')) scores.aktivitasFisik = 1;
        else if (freq.includes('1-2x seminggu')) scores.aktivitasFisik = 0;
        else if (freq.includes('2x seminggu') || freq.includes('>2x seminggu') || freq.includes('>2')) scores.aktivitasFisik = -3;

        totalScore += scores.aktivitasFisik;
    }

    return { score: totalScore, scores };
}

/**
 * Get Jakarta Cardiovascular Risk Level (3 levels with colors)
 * Score -7 to 1: Level 1 (Green)
 * Score 2 to 4: Level 2 (Yellow)
 * Score ≥5: Level 3 (Red)
 */
function getJakartaCVRiskLevel(score) {
    if (score >= -7 && score <= 1) return { level: 1, color: 'bg-green-100', text: '1' };
    if (score >= 2 && score <= 4) return { level: 2, color: 'bg-yellow-100', text: '2' };
    if (score >= 5) return { level: 3, color: 'bg-red-100', text: '3' };
    return { level: 0, color: 'bg-gray-100', text: '-' };
}

/**
 * Determine overall risk level based on score (for filter/cards - will be 4 levels after combining with Sindrom Metabolik)
 * Score -7 to 1: Level 1 (Low Risk)
 * Score 2 to 4: Level 2 (Medium Risk)
 * Score 5: Level 3 (High Risk)
 * Score ≥6: Level 4 (Critical)
 */
function getRiskLevel(score) {
    if (score >= -7 && score <= 1) return 1; // Low Risk
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
 * Load all medical histories and cache by mcuId
 * This is much faster than loading per MCU
 */
async function loadAllMedicalHistories() {
    allMedicalHistories = {};
    try {
        const allHistories = await database.MedicalHistories.getAll() || [];
        // Group by mcuId for fast lookup
        allHistories.forEach(history => {
            const mcuId = history.mcuId || history.mcu_id;
            if (!allMedicalHistories[mcuId]) {
                allMedicalHistories[mcuId] = [];
            }
            allMedicalHistories[mcuId].push(history);
        });
    } catch (error) {
        console.error('Error loading medical histories:', error);
    }
}

/**
 * Pre-load all lab results for all MCUs and cache by mcuId
 * This is much faster than loading per MCU during calculation
 */
async function loadAllLabResults() {
    allLabResults = {};
    try {
        // Get all unique MCU IDs from allMCUs
        const mcuIds = [...new Set(allMCUs.map(mcu => mcu.mcuId || mcu.mcu_id))];

        // Load lab results for all MCUs in parallel
        const labPromises = mcuIds.map(mcuId =>
            labService.getPemeriksaanLabByMcuId(mcuId)
                .then(results => ({ mcuId, results }))
                .catch(() => ({ mcuId, results: [] }))
        );

        const allResults = await Promise.all(labPromises);

        // Cache by mcuId for fast lookup
        allResults.forEach(({ mcuId, results }) => {
            allLabResults[mcuId] = results || [];
        });

        console.log(`Pre-cached lab results for ${mcuIds.length} MCUs`);
    } catch (error) {
        console.error('Error pre-loading lab results:', error);
    }
}

/**
 * Check if assessment cache is valid
 */
function isCacheValid() {
    try {
        const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
        if (!timestamp) return false;

        const cacheAge = Date.now() - parseInt(timestamp);
        return cacheAge < CACHE_TTL;
    } catch (error) {
        return false;
    }
}

/**
 * Load assessment from cache
 */
function loadFromCache() {
    try {
        if (!isCacheValid()) return null;

        const cached = localStorage.getItem(CACHE_KEYS.ASSESSMENTS);
        if (!cached) return null;

        const data = JSON.parse(cached);
        console.log(`Loaded ${data.length} assessments from cache`);
        return data;
    } catch (error) {
        console.warn('Error loading from cache:', error);
        return null;
    }
}

/**
 * Save assessment to cache
 */
function saveToCache(data) {
    try {
        localStorage.setItem(CACHE_KEYS.ASSESSMENTS, JSON.stringify(data));
        localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
        console.log(`Saved ${data.length} assessments to cache`);
    } catch (error) {
        console.warn('Cache storage failed (quota exceeded?):', error);
    }
}

/**
 * Clear assessment cache
 */
function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEYS.ASSESSMENTS);
        localStorage.removeItem(CACHE_KEYS.TIMESTAMP);
        console.log('Assessment cache cleared');
    } catch (error) {
        console.warn('Error clearing cache:', error);
    }
}

/**
 * Calculate all cardiovascular scores
 */
async function calculateAllAssessments() {
    cardiovascularData = [];
    const totalEmployees = allEmployees.length;

    for (let i = 0; i < allEmployees.length; i++) {
        const employee = allEmployees[i];
        try {
            // Skip inactive employees
            if (employee.activeStatus !== 'Active' && employee.activeStatus !== 'Aktif') {
                updateLoadingProgress(((i + 1) / totalEmployees) * 100);
                continue;
            }

            // Get latest MCU for this employee
            const employeeMCUs = allMCUs.filter(m => m.employeeId === employee.employeeId);
            if (employeeMCUs.length === 0) {
                updateLoadingProgress(((i + 1) / totalEmployees) * 100);
                continue;
            }

            const latestMCU = employeeMCUs.sort((a, b) =>
                new Date(b.mcuDate) - new Date(a.mcuDate)
            )[0];

            // Check for diabetes from cached medical histories
            const mcuId = latestMCU.mcuId || latestMCU.mcu_id;
            const medicalHistories = allMedicalHistories[mcuId] || [];
            const hasDiabetes = medicalHistories.some(h => {
                const disease = (h.disease_name || h.diseaseName || '').toLowerCase();
                return disease.includes('diabetes') || disease.includes('dm');
            });

            // Calculate score
            const { score, scores } = calculateJakartaCardiovascularScore(employee, latestMCU, hasDiabetes);
            const riskLevel = getRiskLevel(score);

            // Calculate age
            const dob = employee.birthDate || employee.dateOfBirth;
            const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 0;

            // Use pre-cached lab results (no await needed - already in memory)
            const labResults = allLabResults[mcuId] || [];

            // Calculate metabolic syndrome
            let metabolicSyndromeData = {
                scores: { lp: undefined, tg: undefined, hdl: undefined, td: undefined, gdp: undefined },
                totalScore: undefined,
                risk: undefined
            };

            try {
                const metabolicResult = metabolicSyndromeService.performMetabolicSyndromeAssessment(
                    employee,
                    latestMCU,
                    labResults,
                    hasDiabetes
                );

                if (metabolicResult) {
                    metabolicSyndromeData = metabolicResult;
                }
            } catch (error) {
                console.warn(`Could not calculate metabolic syndrome for employee ${employee.name}:`, error);
            }

            cardiovascularData.push({
                employeeId: employee.employeeId,
                name: employee.name,
                gender: employee.jenisKelamin || employee.gender,
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
                mcu: latestMCU,
                metabolicSyndrome: metabolicSyndromeData
            });

            // Update progress
            updateLoadingProgress(((i + 1) / totalEmployees) * 100);
        } catch (error) {
            console.error(`Error processing employee ${employee.name}:`, error);
            updateLoadingProgress(((i + 1) / totalEmployees) * 100);
        }
    }

    // Sort by score descending
    cardiovascularData.sort((a, b) => b.score - a.score);
    filteredData = [...cardiovascularData];

    // Save to localStorage cache
    saveToCache(cardiovascularData);
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
        tbody.innerHTML = '<tr><td colspan="19" class="px-4 py-6 text-center text-gray-500">Tidak ada data</td></tr>';
        return;
    }

    tbody.innerHTML = paginatedData.map((item, index) => {
        const badge = getRiskBadge(item.riskLevel);
        const rowBgColor = badge.bgColor;

        // Jakarta Cardiovascular Risk Level (3 levels with colors)
        const cvRisk = getJakartaCVRiskLevel(item.score);

        // Sindrom Metabolik values from calculation
        const lp = item.metabolicSyndrome?.scores.lp !== undefined ? item.metabolicSyndrome.scores.lp : '-';
        const tg = item.metabolicSyndrome?.scores.tg !== undefined ? item.metabolicSyndrome.scores.tg : '-';
        const hdl = item.metabolicSyndrome?.scores.hdl !== undefined ? item.metabolicSyndrome.scores.hdl : '-';
        const tdMetabolik = item.metabolicSyndrome?.scores.td !== undefined ? item.metabolicSyndrome.scores.td : '-';
        const gdp = item.metabolicSyndrome?.scores.gdp !== undefined ? item.metabolicSyndrome.scores.gdp : '-';
        const nilaiMetabolik = item.metabolicSyndrome?.totalScore !== undefined ? item.metabolicSyndrome.totalScore : '-';
        const metabolikRiskData = item.metabolicSyndrome?.risk ? getMetabolicSyndromeRiskLabel(item.metabolicSyndrome.risk) : { text: '-', color: 'bg-gray-100', label: 'Unknown' };
        const riskMetabolik = metabolikRiskData.text;

        return `
            <tr class="${rowBgColor}">
                <td class="px-3 py-3 text-sm text-center" style="position: sticky; left: 0; z-index: 10; background-color: #ffffff; min-width: 50px; width: 50px; border: 1px solid #d1d5db; border-right: 2px solid #d1d5db;">${start + index + 1}</td>
                <td class="px-3 py-3 text-sm font-medium text-center" style="position: sticky; left: 50px; z-index: 10; background-color: #ffffff; min-width: 200px; width: 200px; white-space: normal; word-wrap: break-word; border: 1px solid #d1d5db; border-left: none;">${item.name}</td>

                <!-- Jakarta Cardiovascular Score Columns (scores only) -->
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.jk}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.umur}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.td}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.imt}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.merokok}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.diabetes}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #fffbeb;">${item.scores.aktivitasFisik}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300 font-semibold" style="border: 1px solid #d1d5db; background-color: #ffffff;">${item.score}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300 font-semibold ${cvRisk.color}" style="border: 1px solid #d1d5db;">${cvRisk.text}</td>

                <!-- Sindrom Metabolik Columns -->
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${lp}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${tg}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${hdl}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${tdMetabolik}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300" style="background-color: #f0f9ff;">${gdp}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300 font-semibold" style="background-color: #f0f9ff;">${nilaiMetabolik}</td>
                <td class="px-3 py-3 text-sm text-center border border-gray-300 font-semibold ${metabolikRiskData.color}" style="border: 1px solid #d1d5db;">${riskMetabolik}</td>

                <!-- Summary Columns -->
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
 * Get metabolic syndrome risk label and color
 */
function getMetabolicSyndromeRiskLabel(risk) {
    if (risk === 1) return { text: '1', color: 'bg-green-100', label: 'Normal' };
    if (risk === 2) return { text: '2', color: 'bg-yellow-100', label: 'Medium' };
    if (risk === 3) return { text: '3', color: 'bg-red-100', label: 'Sindrom Metabolik' };
    return { text: '-', color: 'bg-gray-100', label: 'Unknown' };
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
                    <thead class="bg-gray-100 border-b-2 border-gray-300">
                        <tr style="height: 60px; vertical-align: middle;">
                            <th class="px-3 py-3 text-center font-semibold" rowspan="2" style="min-width: 50px; width: 50px; background-color: #ffffff; position: sticky; left: 0; z-index: 20; vertical-align: middle; border: 1px solid #d1d5db; border-right: 2px solid #d1d5db;">No</th>
                            <th class="px-3 py-3 text-center font-semibold" rowspan="2" style="min-width: 200px; width: 200px; background-color: #ffffff; position: sticky; left: 50px; z-index: 20; vertical-align: middle; border: 1px solid #d1d5db; border-left: none;">Nama</th>

                            <!-- Jakarta Cardiovascular Score Header -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" colspan="9" style="background-color: #fcd34d;">Jakarta Cardiovascular Score</th>

                            <!-- Sindrom Metabolik Header -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" colspan="7" style="background-color: #93c5fd;">Sindrom Metabolik</th>

                            <!-- Summary Columns -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" rowspan="2" style="background-color: #e5e7eb;">Risk Level</th>
                        </tr>
                        <tr style="height: 40px; vertical-align: middle;">

                            <!-- Jakarta Cardiovascular Score Sub-headers -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">JK</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">Umur</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">TD</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">IMT</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #fef3c7;">Merokok</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #fef3c7;">Diabetes</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 120px; background-color: #fef3c7;">Aktivitas Fisik</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 70px; background-color: #fef3c7;">Nilai</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #fef3c7;">Risk</th>

                            <!-- Sindrom Metabolik Sub-headers -->
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">LP</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">TG</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">HDL</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">TD</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #dbeafe;">GDP</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 60px; background-color: #dbeafe;">Nilai</th>
                            <th class="px-3 py-3 text-center font-semibold border border-gray-300" style="min-width: 80px; background-color: #dbeafe;">Risk</th>
                        </tr>
                    </thead>
                    <tbody id="data-table">
                        <tr>
                            <td colspan="19" class="px-4 py-6 text-center text-gray-500">Memuat data...</td>
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

        // Show loading modal
        showLoadingModal('Data sedang dihitung, harap tunggu sebentar...');

        // Load all data in parallel
        await Promise.all([
            loadEmployees(),
            loadMCUs(),
            loadDepartments(),
            loadJobTitles(),
            loadAllMedicalHistories(),
            loadAllLabResults()  // Pre-load all lab results for fast lookup during calculation
        ]);

        // Check if cached data is still valid
        if (isCacheValid()) {
            console.log('Using cached assessment data');
            const cachedData = loadFromCache();
            if (cachedData && cachedData.length > 0) {
                cardiovascularData = cachedData;
            } else {
                // Cache exists but is empty, calculate fresh
                await calculateAllAssessments();
            }
        } else {
            // Cache expired or doesn't exist, calculate fresh
            console.log('Cache expired or not found, calculating fresh data');
            await calculateAllAssessments();
        }

        // Debug: Log loaded data
        console.log('Employees loaded:', allEmployees.length);
        console.log('MCUs loaded:', allMCUs.length);
        console.log('Cardiovascular data calculated:', cardiovascularData.length);
        if (cardiovascularData.length > 0) {
            console.log('Sample data:', cardiovascularData[0]);
        }

        // Hide loading modal
        hideLoadingModal();

        // Render dashboard
        renderDashboard();

        document.body.classList.add('initialized');
    } catch (error) {
        console.error('Error initializing Jakarta Cardiovascular:', error);
        hideLoadingModal();
        showToast('Gagal memuat data: ' + error.message, 'error');
        document.body.classList.add('initialized');
    }
}
