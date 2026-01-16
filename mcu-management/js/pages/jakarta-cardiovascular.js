/**
 * Jakarta Cardiovascular Score Analysis
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import database from '../services/databaseAdapter.js';
import { showToast } from '../utils/uiHelpers.js';
import { supabaseReady } from '../config/supabase.js';

let employees = [];
let mcuData = [];
let departments = [];
let jobTitles = [];
let cardiovascularData = [];

/**
 * Calculate Jakarta Cardiovascular Score for a single employee
 */
function calculateJakartaCardiovascularScore(employee, mcu) {
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
        } else {
            score += 0;
        }
    }

    // 5. Diabetes
    // Check in medical_histories for diabetes
    // If has diabetes: 2, else: 0
    // This will be handled separately with async call

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
        1: { label: 'Low Risk', color: 'bg-green-100 text-green-800', class: 'risk-badge-1' },
        2: { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800', class: 'risk-badge-2' },
        3: { label: 'High Risk', color: 'bg-red-100 text-red-800', class: 'risk-badge-3' },
        4: { label: 'Critical', color: 'bg-purple-100 text-purple-800', class: 'risk-badge-critical' }
    };
    return badges[riskLevel] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
}

/**
 * Calculate all cardiovascular scores
 */
async function calculateAllScores() {
    cardiovascularData = [];

    for (const employee of employees) {
        try {
            // Get latest MCU for this employee
            const employeeMCUs = mcuData.filter(m => m.employeeId === employee.employeeId);
            if (employeeMCUs.length === 0) continue;

            const latestMCU = employeeMCUs.sort((a, b) =>
                new Date(b.mcuDate) - new Date(a.mcuDate)
            )[0];

            // Calculate base score
            let score = calculateJakartaCardiovascularScore(employee, latestMCU);

            // Check for diabetes in medical histories
            const medicalHistories = await database.MedicalHistories.getByMcuId(latestMCU.mcuId);
            const hasDiabetes = medicalHistories.some(h => {
                const disease = (h.disease_name || h.diseaseName || '').toLowerCase();
                return disease.includes('diabetes') || disease.includes('dm');
            });

            if (hasDiabetes) {
                score += 2;
            }

            // Calculate age (simple year calculation)
            const age = new Date().getFullYear() - new Date(employee.dateOfBirth).getFullYear();

            const riskLevel = getRiskLevel(score);

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
                hasDiabetes: hasDiabetes,
                mcu: latestMCU
            });
        } catch (error) {
            console.error(`Error processing employee ${employee.name}:`, error);
        }
    }

    // Sort by score descending
    cardiovascularData.sort((a, b) => b.score - a.score);
}

/**
 * Render data table
 */
function renderTable(data = cardiovascularData) {
    const tbody = document.getElementById('data-table');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="18" class="px-4 py-6 text-center text-gray-500">Tidak ada data</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item, index) => {
        const badge = getRiskBadge(item.riskLevel);
        const scoreColor = item.score <= -1 ? 'score-red' : item.score >= 2 && item.score <= 4 ? 'score-yellow' : 'score-green';

        return `
            <tr>
                <td class="px-4 py-3">${index + 1}</td>
                <td class="px-4 py-3"><strong>${item.name}</strong><br><small class="text-gray-500">${item.department}</small></td>
                <td class="score-cell">${item.gender?.substring(0, 1).toUpperCase()}</td>
                <td class="score-cell">${item.age}</td>
                <td class="score-cell">${item.bloodPressure || '-'}</td>
                <!-- Jakarta Cardiovascular Scores -->
                <td class="score-cell">${item.bmi ? item.bmi >= 25 ? '1' : '0' : '0'}</td>
                <td class="score-cell">${getSmokeScore(item.smoking)}</td>
                <td class="score-cell">${item.diabetes ? '2' : '0'}</td>
                <td class="score-cell">0</td> <!-- Aktivitas fisik -->
                <td class="score-cell">0</td> <!-- Kolesterol -->
                <td class="score-cell">0</td> <!-- HDL CV -->
                <td class="score-cell">0</td> <!-- Nilai CV -->
                <!-- Sindrom Metabolik -->
                <td class="score-cell border-l border-gray-300">0</td> <!-- Gula -->
                <td class="score-cell">0</td> <!-- LP -->
                <td class="score-cell">0</td> <!-- TG -->
                <td class="score-cell">0</td> <!-- HDL -->
                <td class="score-cell">0</td> <!-- Nilai -->
                <!-- Risk -->
                <td class="score-cell border-l border-gray-300">
                    <span class="px-2 py-1 rounded text-sm font-semibold ${badge.color}">
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
 * Update risk counters
 */
function updateRiskCounters() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    cardiovascularData.forEach(item => {
        counts[item.riskLevel]++;
    });

    document.getElementById('count-low').textContent = counts[1];
    document.getElementById('count-medium').textContent = counts[2];
    document.getElementById('count-high').textContent = counts[3];
    document.getElementById('count-critical').textContent = counts[4];
}

/**
 * Apply filters
 */
function applyFilters() {
    const department = document.getElementById('filter-department').value;
    const jobTitle = document.getElementById('filter-job-title').value;
    const risk = document.getElementById('filter-risk').value;
    const search = document.getElementById('filter-search').value.toLowerCase();

    let filtered = cardiovascularData.filter(item => {
        const matchDept = !department || item.department === department;
        const matchJob = !jobTitle || item.jobTitle === jobTitle;
        const matchRisk = !risk || item.riskLevel === parseInt(risk);
        const matchSearch = !search || item.name.toLowerCase().includes(search);

        return matchDept && matchJob && matchRisk && matchSearch;
    });

    renderTable(filtered);
}

/**
 * Setup filter listeners
 */
function setupFilters() {
    document.getElementById('filter-department').addEventListener('change', applyFilters);
    document.getElementById('filter-job-title').addEventListener('change', applyFilters);
    document.getElementById('filter-risk').addEventListener('change', applyFilters);
    document.getElementById('filter-search').addEventListener('input', applyFilters);
}

/**
 * Populate filter dropdowns
 */
function populateFilters() {
    // Departments
    const deptSelect = document.getElementById('filter-department');
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.department_name || dept.name;
        option.textContent = dept.department_name || dept.name;
        deptSelect.appendChild(option);
    });

    // Job Titles
    const jobSelect = document.getElementById('filter-job-title');
    jobTitles.forEach(job => {
        const option = document.createElement('option');
        option.value = job.jobTitle || job.name;
        option.textContent = job.jobTitle || job.name;
        jobSelect.appendChild(option);
    });
}

/**
 * Load all necessary data
 */
async function loadData() {
    try {
        showToast('Memuat data...', 'info');

        // Load employees
        employees = await employeeService.getAll();

        // Load MCU data
        mcuData = await mcuService.getAll();

        // Load departments and job titles
        departments = await database.getAll('departments') || [];
        jobTitles = await database.getAll('jobTitles') || [];

        // Calculate scores
        await calculateAllScores();

        // Render table
        renderTable();

        // Update counters
        updateRiskCounters();

        // Populate filters
        populateFilters();

        // Setup filter listeners
        setupFilters();

        showToast('Data berhasil dimuat', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

/**
 * Initialize page
 */
async function init() {
    try {
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        await loadData();

        // Show page content
        document.body.classList.add('initialized');
    } catch (error) {
        console.error('Error initializing page:', error);
        document.body.classList.add('initialized');
    }
}

// Start when Supabase is ready
supabaseReady.then(() => {
    init();
}).catch(() => {
    init();
});
