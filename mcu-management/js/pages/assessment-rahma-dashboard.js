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
let allLabResults = []; // Lab results from pemeriksaan_lab table
let assessmentData = [];
let filteredData = [];
let departments = [];
let jobTitles = [];
let vendors = [];
let currentPage = 1;
const itemsPerPage = 15;
let currentFilter = 'all'; // 'all', 'low', 'medium', 'high'
let filterByJobTitle = null; // Filter by job title
let filterByRiskLevel = null; // Filter by risk level (low, moderate, high)

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
      loadVendors(),
      loadLabResults()
    ]);

    // Calculate assessments for all active employees (latest MCU only)
    calculateAllAssessments();

    console.log('Assessment Data:', {
      totalEmployees: allEmployees.length,
      totalMCUs: allMCUs.length,
      assessmentsCalculated: assessmentData.length,
      riskCounts: {
        low: assessmentData.filter(d => d.riskCategory === 'low').length,
        medium: assessmentData.filter(d => d.riskCategory === 'medium').length,
        high: assessmentData.filter(d => d.riskCategory === 'high').length
      }
    });

    // Debug: Sample employee data for first assessment
    if (assessmentData.length > 0) {
      const sample = assessmentData[0];
      console.log('Sample Assessment (First):', {
        employeeName: sample.employee.name,
        jobTitle: sample.employee.jobTitle,
        jobRiskLevel: sample.employee.jobRiskLevel,
        jobRiskScore: sample.scores.jobRisk,
        age: sample.assessment.age,
        ageScore: sample.scores.age,
        exerciseFrequency: sample.assessment.exerciseFrequency,
        exerciseScore: sample.scores.exercise,
        smokingStatus: sample.assessment.smokingStatus,
        smokingScore: sample.scores.smoking,
        mcuGlucose: sample.mcu.glucose,
        glucoseScore: sample.scores.glucose,
        mcuCholesterol: sample.mcu.cholesterol,
        cholesterolScore: sample.scores.cholesterol,
        mcuTriglycerides: sample.mcu.triglycerides,
        trigliceridScore: sample.scores.triglycerides,
        mcuHdl: sample.mcu.hdl,
        hdlScore: sample.scores.hdl
      });
    }

    // Initialize super search
    initSuperSearch();

    // Render dashboard
    renderDashboard();

    showToast(`Assessment RAHMA Dashboard dimuat - ${assessmentData.length} assessments`, 'success');

    // Listen untuk MCU baru melalui realtime subscription
    setupRealtimeListener();

  } catch (error) {
    console.error('Error initializing RAHMA dashboard:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Setup realtime listener untuk detect MCU data baru
 * Hanya update ketika ada MCU baru atau perubahan
 */
let realtimeSubscription = null;
function setupRealtimeListener() {
  try {
    // Import supabase client dari config
    import('../config/supabase.js').then(({ getSupabaseClient, isSupabaseEnabled }) => {
      // Check if Supabase is enabled
      if (!isSupabaseEnabled()) {
        console.log('Supabase not enabled - realtime listener disabled');
        return;
      }

      const supabase = getSupabaseClient();

      // Unsubscribe dari listener yang lama jika ada
      if (realtimeSubscription) {
        try {
          supabase.removeChannel(realtimeSubscription);
        } catch (e) {
          // Ignore unsubscribe errors
        }
      }

      // Subscribe ke perubahan MCU table
      realtimeSubscription = supabase
        .channel('public:mcu')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen ke INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'mcu'
          },
          async (payload) => {
            console.log('MCU change detected:', payload.eventType, payload.new);

            try {
              // Reload MCU data saja (fastest way)
              await loadMCUs();

              // Re-calculate assessments dengan data terbaru
              calculateAllAssessments();

              // Update UI tanpa reload page
              renderDashboard();

              showToast('Data MCU diperbarui', 'info');
            } catch (error) {
              console.error('Error processing MCU change:', error);
            }
          }
        )
        .subscribe();

      console.log('Realtime listener setup: Listening untuk MCU changes');
    }).catch(error => {
      console.warn('Could not setup realtime listener:', error);
      // Dashboard tetap berfungsi tanpa realtime listener
    });
  } catch (error) {
    console.warn('Error setting up realtime listener:', error);
    // Fallback: jika realtime listener error, jangan crash - dashboard tetap berfungsi
  }
}

/**
 * Load all employees (active only)
 */
async function loadEmployees() {
  try {
    const all = await employeeService.getAll();
    // Filter: active employees only (isActive = true, deletedAt = null)
    // Note: employees are already transformed with camelCase field names
    allEmployees = all.filter(emp => emp.isActive && !emp.deletedAt);
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

    // Debug: Show MCU date range
    if (allMCUs.length > 0) {
      const mcuDates = allMCUs.map(mcu => mcu.mcuDate).sort();
      console.log('=== MCU DATA LOADED ===');
      console.log('Total MCUs:', allMCUs.length);
      console.log('Earliest MCU Date:', mcuDates[0]);
      console.log('Latest MCU Date:', mcuDates[mcuDates.length - 1]);
      console.log('First 5 MCU IDs:', allMCUs.slice(0, 5).map(m => ({ mcuId: m.mcuId, mcuDate: m.mcuDate })));
    }
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
    jobTitles = await masterDataService.getAllJobTitles();
  } catch (error) {
    console.warn('Error loading job titles:', error);
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
 * Load lab results from pemeriksaan_lab table
 */
async function loadLabResults() {
  try {
    // Load lab results using database service
    const { getSupabaseClient, isSupabaseEnabled } = await import('../config/supabase.js');

    if (!isSupabaseEnabled()) {
      console.warn('Supabase not enabled - lab results not loaded');
      allLabResults = [];
      return;
    }

    const supabase = getSupabaseClient();

    // Load ALL lab results - Supabase has a default limit of 1000,
    // so we need to use range() to load all records
    // Split into chunks to avoid memory issues
    let allData = [];
    let pageSize = 1000;
    let pageNum = 0;
    let hasMore = true;

    console.log('Loading ALL lab results from pemeriksaan_lab...');

    while (hasMore) {
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('pemeriksaan_lab')
        .select('*', { count: 'exact' })
        .range(from, to);

      if (error) {
        console.error(`Error loading lab results page ${pageNum}:`, error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data);
        pageNum++;

        // If this is the first page, log the total count
        if (pageNum === 1 && count) {
          console.log(`Total lab records in database: ${count}`);
        }
      }
    }

    allLabResults = allData;

    // Comprehensive debug logging
    console.log('=== LAB RESULTS LOADED ===');
    console.log('Total Records Loaded:', allLabResults.length);

    if (allLabResults.length > 0) {
      console.log('First Record:', allLabResults[0]);
      console.log('First Record Keys:', Object.keys(allLabResults[0]));

      // Show field names
      const fieldNames = Object.keys(allLabResults[0]);
      console.log('Field Names:', fieldNames);

      // Count by mcu_id
      const mcuIdMap = {};
      allLabResults.forEach(lab => {
        const mcuId = lab.mcu_id;
        mcuIdMap[mcuId] = (mcuIdMap[mcuId] || 0) + 1;
      });
      console.log('Unique MCU IDs with lab data:', Object.keys(mcuIdMap).length);
      console.log('Total records grouped by mcu_id:', Object.values(mcuIdMap).reduce((a, b) => a + b, 0));

      // Show sample records with their structure
      console.log('Sample Records (first 3):');
      allLabResults.slice(0, 3).forEach((record, idx) => {
        console.log(`  Record ${idx}:`, {
          mcu_id: record.mcu_id,
          lab_item_id: record.lab_item_id,
          lab_item_id_type: typeof record.lab_item_id,
          value: record.value
        });
      });
    }
  } catch (error) {
    console.error('Error loading lab results:', error);
    allLabResults = [];
  }
}

/**
 * Get lab values (glucose, cholesterol, triglycerides, HDL) from pemeriksaan_lab
 * Matches by lab item ID to correct names from database
 * Framingham needs: Glucose, Cholesterol, Triglycerides, HDL
 */
function getLabValuesForMCU(mcuId) {
  if (!mcuId || !allLabResults || allLabResults.length === 0) {
    return {
      glucose: null,
      cholesterol: null,
      triglycerides: null,
      hdl: null
    };
  }

  // Filter lab results for this MCU
  const mcuLabResults = allLabResults.filter(lab => lab.mcu_id === mcuId);

  // DEBUG: Log every MCU lookup for first employee
  const isFirstEmployee = mcuId === allMCUs[0]?.mcuId;
  if (isFirstEmployee) {
    console.log(`\n=== LAB LOOKUP FOR MCU: ${mcuId} ===`);
    console.log('MCU ID Type:', typeof mcuId);
    console.log('Searching in', allLabResults.length, 'lab records');

    // Show what mcu_id values exist in database
    const uniqueMcuIds = [...new Set(allLabResults.map(lab => lab.mcu_id))];
    console.log('Unique mcu_id values in database:', uniqueMcuIds);

    // Check if our mcuId exists in database
    const mcuIdExists = uniqueMcuIds.includes(mcuId);
    console.log(`MCU ${mcuId} exists in lab data: ${mcuIdExists}`);

    // Try exact match
    const exactMatches = allLabResults.filter(lab => lab.mcu_id === mcuId);
    console.log(`Exact matches (===): ${exactMatches.length}`);

    // Try loose match
    const looseMatches = allLabResults.filter(lab => String(lab.mcu_id) === String(mcuId));
    console.log(`String matches: ${looseMatches.length}`);

    // Try case-insensitive
    const caseInsensitiveMatches = allLabResults.filter(
      lab => String(lab.mcu_id).toLowerCase() === String(mcuId).toLowerCase()
    );
    console.log(`Case-insensitive matches: ${caseInsensitiveMatches.length}`);
  }

  if (mcuLabResults.length === 0) {
    if (isFirstEmployee) {
      console.log(`NO LAB RESULTS FOUND for MCU ${mcuId}`);
    }
    return {
      glucose: null,
      cholesterol: null,
      triglycerides: null,
      hdl: null
    };
  }

  // Build map of lab_item_id -> value for this MCU
  const labValuesById = {};
  mcuLabResults.forEach(result => {
    // Check lab_item_id type
    const labItemId = result.lab_item_id;
    const labItemIdNumeric = parseInt(labItemId);
    labValuesById[labItemId] = parseFloat(result.value) || null;
    labValuesById[labItemIdNumeric] = parseFloat(result.value) || null; // Also map as integer

    if (isFirstEmployee) {
      console.log(`  Lab record: lab_item_id=${labItemId} (type: ${typeof labItemId}, numeric: ${labItemIdNumeric}), value=${result.value}`);
    }
  });

  // DEBUG: Log first time we find lab data for MCU
  if (isFirstEmployee) {
    console.log(`\n=== LAB VALUES MAPPED FOR MCU ${mcuId} ===`);
    console.log('Lab Results Count:', mcuLabResults.length);
    console.log('labValuesById:', labValuesById);
    console.log('Checking lookups:');
    console.log('  labValuesById[7]:', labValuesById[7]);
    console.log('  labValuesById["7"]:', labValuesById["7"]);
    console.log('  labValuesById[8]:', labValuesById[8]);
    console.log('  labValuesById["8"]:', labValuesById["8"]);
    console.log('  labValuesById[9]:', labValuesById[9]);
    console.log('  labValuesById["9"]:', labValuesById["9"]);
    console.log('  labValuesById[10]:', labValuesById[10]);
    console.log('  labValuesById["10"]:', labValuesById["10"]);
  }

  // Extract specific lab values using lab_item_id from database
  // ID 7 = "Gula Darah Puasa" (Fasting Blood Glucose)
  // ID 8 = "Kolesterol Total" (Total Cholesterol)
  // ID 9 = "Trigliserida" (Triglycerides)
  // ID 10 = "HDL Kolestrol" (HDL Cholesterol)
  const result = {
    glucose: labValuesById[7] || labValuesById["7"] || null,      // Gula Darah Puasa
    cholesterol: labValuesById[8] || labValuesById["8"] || null,  // Kolesterol Total
    triglycerides: labValuesById[9] || labValuesById["9"] || null, // Trigliserida
    hdl: labValuesById[10] || labValuesById["10"] || null          // HDL Kolestrol
  };

  if (isFirstEmployee) {
    console.log('\n=== FINAL LAB VALUES ===');
    console.log(result);
  }

  return result;
}

/**
 * Get job title name by matching job_title text from employee
 * Since employees.job_title is text, we need to find matching job in job_titles
 * Uses case-insensitive matching with whitespace trimming
 */
function getJobTitleByName(jobTitleText) {
  if (!jobTitleText || !jobTitles || jobTitles.length === 0) {
    return null;
  }

  // Normalize the search text
  const normalizedSearch = String(jobTitleText).toLowerCase().trim();

  // Try exact match first
  let match = jobTitles.find(j => j.name && j.name.toLowerCase().trim() === normalizedSearch);

  if (match) return match;

  // If no exact match, try case-insensitive match (any casing)
  match = jobTitles.find(j => j.name && j.name.toLowerCase() === normalizedSearch);

  return match || null;
}

/**
 * Normalize exercise frequency values from database to calculator format
 */
function normalizeExerciseFrequency(value) {
  if (!value) return '1-2x_seminggu'; // Default baseline

  const normalized = String(value).toLowerCase().trim().replace(/\s+/g, '_');

  // Map database values to calculator format
  if (normalized.includes('>2x')) return '>2x_seminggu';
  if (normalized.includes('1-2x') && normalized.includes('minggu')) return '1-2x_seminggu';
  if (normalized.includes('1-2x') && normalized.includes('bulan')) return '1-2x_sebulan';
  if (normalized.includes('tidak') && normalized.includes('pernah')) return 'tidak_pernah';

  return normalized; // Return as-is if it matches calculator format already
}

/**
 * Normalize smoking status values from database to calculator format
 */
function normalizeSmokingStatus(value) {
  if (!value) return 'tidak_merokok'; // Default non-smoker

  const normalized = String(value).toLowerCase().trim().replace(/\s+/g, '_');

  // Map database values to calculator format
  if (normalized.includes('tidak') && normalized.includes('merokok')) return 'tidak_merokok';
  if (normalized.includes('mantan')) return 'mantan_perokok';
  if (normalized.includes('perokok') || normalized.includes('aktif')) return 'perokok';

  return normalized; // Return as-is if it matches calculator format already
}

/**
 * Convert job risk level to numeric score
 */
function getJobRiskScore(riskLevel) {
  if (!riskLevel) return 1; // Default to moderate (1)
  const level = String(riskLevel).toLowerCase().trim();
  if (level === 'low') return 0;
  if (level === 'high') return 2;
  return 1; // moderate
}

/**
 * Calculate assessment for all active employees
 * Uses LATEST MCU for each employee only
 */
function calculateAllAssessments() {
  assessmentData = [];

  allEmployees.forEach(employee => {
    // Get latest MCU for this employee
    // Note: MCU data is transformed with camelCase field names
    const employeeMCUs = allMCUs
      .filter(mcu => mcu.employeeId === employee.employeeId && !mcu.deletedAt)
      .sort((a, b) => new Date(b.mcuDate) - new Date(a.mcuDate));

    if (employeeMCUs.length === 0) {
      // No MCU, skip
      return;
    }

    const latestMCU = employeeMCUs[0];

    // Include MCU data (don't filter by finalResult to show all assessments)
    // if (!latestMCU.finalResult) {
    //   return;
    // }

    // Get associated data
    const dept = departments.find(d => d.id === employee.departmentId);

    // Get job by matching job_title text name (since employee.job_title is text, not id)
    const job = getJobTitleByName(employee.jobTitle);

    // Debug: Log if job lookup fails
    if (!job && employee.jobTitle) {
      console.warn(`Job not found for employee ${employee.employeeId}: jobTitle="${employee.jobTitle}"`);
    }

    const vendor = employee.vendorName
      ? vendors.find(v => v.name === employee.vendorName)
      : null;

    // Get lab values from pemeriksaan_lab table (not from mcus table)
    const labValues = getLabValuesForMCU(latestMCU.mcuId);

    // Check if this MCU has lab results
    const hasLabResults = labValues.glucose || labValues.cholesterol || labValues.triglycerides || labValues.hdl;
    const isIncomplete = !latestMCU.bloodPressure || !latestMCU.bmi || (!hasLabResults);

    // Prepare assessment data with normalized values and lab values from pemeriksaan_lab
    const assessmentInput = {
      gender: employee.jenisKelamin === 'L' || employee.jenisKelamin === 'Laki-laki' ? 'pria' : 'wanita',
      age: calculateAge(employee.birthDate, latestMCU.mcuDate),
      jobRiskLevel: job?.riskLevel || 'moderate',
      exerciseFrequency: normalizeExerciseFrequency(latestMCU.exerciseFrequency),
      smokingStatus: normalizeSmokingStatus(latestMCU.smokingStatus),
      systolic: parseFloat(latestMCU.bloodPressure?.split('/')[0]) || null,
      diastolic: parseFloat(latestMCU.bloodPressure?.split('/')[1]) || null,
      bmi: parseFloat(latestMCU.bmi) || null,
      glucose: labValues.glucose,
      cholesterol: labValues.cholesterol,
      triglycerides: labValues.triglycerides,
      hdl: labValues.hdl
    };

    // Debug: Log MCU and lab values for first employee
    if (employee.employeeId === allEmployees[0]?.employeeId) {
      console.log(`Lab Values from pemeriksaan_lab for ${employee.name} (MCU: ${latestMCU.mcuId}):`, {
        glucose: labValues.glucose,
        cholesterol: labValues.cholesterol,
        triglycerides: labValues.triglycerides,
        hdl: labValues.hdl,
        bloodPressure: latestMCU.bloodPressure,
        bmi: latestMCU.bmi,
        jobTitle: employee.jobTitle,
        jobFound: job !== null,
        jobRiskLevel: job?.riskLevel || 'not found'
      });
    }

    // Calculate Framingham score
    let result = null;
    try {
      result = framinghamCalculatorService.performCompleteAssessment(assessmentInput);
    } catch (err) {
      console.warn(`Error calculating assessment for ${employee.employeeId}:`, err);
      return;
    }

    // Add to assessment data
    assessmentData.push({
      employee: {
        employee_id: employee.employeeId,
        name: employee.name,
        gender: employee.jenisKelamin,
        birthDate: employee.birthDate,
        departmentId: employee.departmentId,
        department: dept?.name || 'N/A',
        jobId: employee.jobId,
        jobTitle: job?.name || 'N/A',
        jobRiskLevel: job?.riskLevel || 'moderate',
        vendorName: vendor?.name || null,
        isActive: employee.isActive,
        deletedAt: employee.deletedAt
      },
      mcu: {
        mcuId: latestMCU.mcuId,
        mcuDate: latestMCU.mcuDate,
        mcuType: latestMCU.mcuType,
        bloodPressure: latestMCU.bloodPressure,
        bmi: latestMCU.bmi,
        smokingStatus: latestMCU.smokingStatus,
        exerciseFrequency: latestMCU.exerciseFrequency,
        // Lab values from pemeriksaan_lab table
        glucose: labValues.glucose,
        cholesterol: labValues.cholesterol,
        triglycerides: labValues.triglycerides,
        hdl: labValues.hdl,
        finalResult: latestMCU.finalResult
      },
      assessment: result,
      scores: {
        gender: result.jenis_kelamin_score,
        age: result.umur_score,
        jobRisk: getJobRiskScore(job?.riskLevel),
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
      riskCategory: result.risk_category,
      isIncomplete: isIncomplete
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
  applyAllFilters();
}

/**
 * Apply filter by job title
 */
export function filterByJob(jobId) {
  filterByJobTitle = jobId === 'all' ? null : jobId;
  currentPage = 1;
  applyAllFilters();
}

/**
 * Apply filter by risk level (job_titles.risk_level)
 */
export function filterByJobRiskLevel(riskLevel) {
  filterByRiskLevel = riskLevel === 'all' ? null : riskLevel;
  currentPage = 1;
  applyAllFilters();
}

/**
 * Apply all filters together
 */
function applyAllFilters() {
  let filtered = [...assessmentData];

  // Filter by risk category (LOW/MEDIUM/HIGH)
  if (currentFilter !== 'all') {
    filtered = filtered.filter(d => d.riskCategory === currentFilter);
  }

  // Filter by job title
  if (filterByJobTitle) {
    filtered = filtered.filter(d => d.employee.jobId === filterByJobTitle);
  }

  // Filter by job risk level (low, moderate, high)
  if (filterByRiskLevel) {
    filtered = filtered.filter(d => d.employee.jobRiskLevel === filterByRiskLevel);
  }

  filteredData = filtered;
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
  renderTableOnly();
}

/**
 * Render complete dashboard
 */
function renderDashboard() {
  const page = document.getElementById('rahma-main-content');
  if (!page) {
    console.error('rahma-main-content element not found');
    return;
  }

  // Show empty state if no data
  if (!assessmentData || assessmentData.length === 0) {
    page.innerHTML = `
      <div class="p-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">📊 Assessment RAHMA Dashboard</h1>
        <p class="text-gray-600 mb-6">Framingham CVD Risk Assessment - Penilaian Risiko Kardiovaskular</p>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-semibold text-gray-700 mb-2">Belum ada data</p>
          <p class="text-gray-600">Tidak ada karyawan aktif dengan MCU terbaru untuk ditampilkan.</p>
          <p class="text-sm text-gray-500 mt-4">
            Pastikan ada karyawan aktif dengan data MCU terbaru, maka dashboard akan menampilkan penilaian Framingham CVD Risk.
          </p>
        </div>
      </div>
    `;
    return;
  }

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
    <div class="p-6 pt-4 pb-2 bg-white">
      <input type="text" id="rahma-search" placeholder="Cari Karyawan: Nama atau ID..."
        onkeyup="window.assessmentRAHMA.searchAssessments()"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
    </div>

    <!-- Filter Controls -->
    <div class="p-6 bg-white border-b border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Filter by Job Title -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter Jabatan</label>
          <select id="filter-job-title" onchange="window.assessmentRAHMA.filterByJob(this.value)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">-- Semua Jabatan --</option>
            ${jobTitles.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}
          </select>
        </div>

        <!-- Filter by Risk Level -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter Tingkat Risiko Pekerjaan</label>
          <select id="filter-risk-level" onchange="window.assessmentRAHMA.filterByJobRiskLevel(this.value)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">-- Semua Level --</option>
            <option value="low">Low (Rendah)</option>
            <option value="moderate">Moderate (Sedang)</option>
            <option value="high">High (Tinggi)</option>
          </select>
        </div>

        <!-- Export Buttons -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Export</label>
          <div class="flex gap-2">
            <button onclick="window.assessmentRAHMA.exportToCSV()"
                    class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              CSV
            </button>
            <button onclick="window.assessmentRAHMA.exportToPDF()"
                    class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>
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
      <div class="bg-white rounded-lg shadow overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-100 border-b sticky top-0">
            <tr>
              <th class="px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">No</th>
              <th class="px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Nama</th>
              <th class="px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">Jabatan</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">JK</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Umur</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Job</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Olahraga</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Merokok</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Tekanan Darah</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">BMI</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Kolesterol</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Trigliserid</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">HDL</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Nilai Total</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Hasil</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">Status</th>
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
 * Render only the table and pagination (used for search to preserve input focus)
 */
function renderTableOnly() {
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
    tbody.innerHTML = '<tr><td colspan="16" class="text-center text-gray-500 py-4">Tidak ada data</td></tr>';
    updatePagination();
    return;
  }

  pageData.forEach((item, idx) => {
    const riskBg = item.riskCategory === 'low' ? 'bg-green-100 text-green-800' :
                   item.riskCategory === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                   'bg-red-100 text-red-800';

    const riskLabel = item.riskCategory === 'low' ? 'LOW' :
                     item.riskCategory === 'medium' ? 'MEDIUM' :
                     'HIGH';

    // Helper function to format gender
    const genderDisplay = item.employee.gender === 'L' || item.employee.gender === 'Laki-laki' ? 'L' : 'P';

    // Calculate age from birth date and MCU date
    const birthDate = new Date(item.employee.birthDate);
    const mcuDate = new Date(item.mcu.mcuDate);
    let age = mcuDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = mcuDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && mcuDate.getDate() < birthDate.getDate())) {
      age--;
    }

    // Status badge
    const statusBg = item.employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    const statusLabel = item.employee.isActive ? 'Aktif' : 'Inaktif';
    const isDeleted = item.employee.deletedAt !== null && item.employee.deletedAt !== undefined;
    const statusDisplay = isDeleted ? 'Dihapus' : statusLabel;
    const statusFinalBg = isDeleted ? 'bg-red-100 text-red-800' : statusBg;

    const row = document.createElement('tr');
    row.className = `border-b hover:bg-gray-50 ${item.isIncomplete ? 'bg-yellow-50' : ''}`;
    row.innerHTML = `
      <td class="px-2 py-2 text-xs text-gray-600">${startIdx + idx + 1}</td>
      <td class="px-2 py-2 text-xs font-medium text-gray-900">${item.employee.name} ${item.isIncomplete ? '<span title="Data tidak lengkap">⚠️</span>' : ''}</td>
      <td class="px-2 py-2 text-xs text-gray-600">${item.employee.jobTitle}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.gender}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.age}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.jobRisk}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.exercise}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.smoking}</td>
      <td class="px-2 py-2 text-xs text-center font-mono ${!item.mcu.bloodPressure ? 'text-gray-400 line-through' : ''}">${item.scores.bloodPressure}</td>
      <td class="px-2 py-2 text-xs text-center font-mono ${!item.mcu.bmi ? 'text-gray-400 line-through' : ''}">${item.scores.bmi}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.cholesterol}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.triglycerides}</td>
      <td class="px-2 py-2 text-xs text-center font-mono">${item.scores.hdl}</td>
      <td class="px-2 py-2 text-xs text-center font-bold">${item.totalScore}</td>
      <td class="px-2 py-2 text-xs text-center">
        <span class="px-1 py-0.5 rounded text-xs font-semibold ${riskBg}" title="${item.isIncomplete ? 'Data belum lengkap' : ''}">
          ${riskLabel}
        </span>
      </td>
      <td class="px-2 py-2 text-xs text-center">
        <span class="px-1 py-0.5 rounded text-xs font-semibold ${statusFinalBg}">
          ${statusDisplay}
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
    // Show filtered data count, but also total MCU count
    const displayCount = filteredData.length;
    const totalCount = allMCUs.length;
    infoEl.textContent = `Menampilkan ${displayCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-${Math.min(currentPage * itemsPerPage, displayCount)} dari ${displayCount} data (Total MCU: ${totalCount})`;
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

/**
 * Toggle employee active/inactive status
 */
export async function toggleEmployeeActive(employeeId, isActive) {
  if (!confirm(`${isActive ? 'Aktifkan' : 'Nonaktifkan'} karyawan ini?`)) {
    return;
  }

  try {
    await employeeService.update(employeeId, { isActive: isActive });
    showToast(`Karyawan ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');

    // Reload dashboard
    location.reload();
  } catch (error) {
    console.error('Error toggling employee active status:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Soft delete employee (set deletedAt)
 */
export async function softDeleteEmployee(employeeId) {
  if (!confirm('Hapus karyawan ini? Data akan tersimpan di "Data Terhapus".')) {
    return;
  }

  try {
    const now = new Date().toISOString();
    await employeeService.update(employeeId, { deletedAt: now });
    showToast('Karyawan berhasil dihapus (soft delete)', 'success');

    // Reload dashboard
    location.reload();
  } catch (error) {
    console.error('Error soft deleting employee:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Permanent delete employee (delete from database)
 */
export async function permanentDeleteEmployee(employeeId) {
  if (!confirm('PERINGATAN: Hapus permanen karyawan ini? Tindakan ini TIDAK DAPAT DIURUNGKAN!')) {
    return;
  }

  if (!confirm('Apakah Anda YAKIN? Data akan HILANG SELAMANYA!')) {
    return;
  }

  try {
    await employeeService.delete(employeeId);
    showToast('Karyawan berhasil dihapus secara permanen', 'success');

    // Reload dashboard
    location.reload();
  } catch (error) {
    console.error('Error permanently deleting employee:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

/**
 * Export filtered data to CSV
 */
export function exportToCSV() {
  if (filteredData.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'warning');
    return;
  }

  // CSV Header
  const headers = [
    'No',
    'Nama',
    'Jabatan',
    'Jenis Kelamin',
    'Umur',
    'Job',
    'Olahraga',
    'Merokok',
    'Tekanan Darah',
    'BMI',
    'Kolesterol',
    'Trigliserid',
    'HDL',
    'Nilai Total',
    'Hasil'
  ];

  // CSV Data
  const rows = filteredData.map((item, idx) => {
    const genderDisplay = item.employee.gender === 'L' || item.employee.gender === 'Laki-laki' ? 'L' : 'P';

    // Calculate age
    const birthDate = new Date(item.employee.birthDate);
    const mcuDate = new Date(item.mcu.mcuDate);
    let age = mcuDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = mcuDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && mcuDate.getDate() < birthDate.getDate())) {
      age--;
    }

    const riskLabel = item.riskCategory === 'low' ? 'LOW' :
                     item.riskCategory === 'medium' ? 'MEDIUM' : 'HIGH';

    return [
      idx + 1,
      item.employee.name,
      item.employee.jobTitle,
      genderDisplay,
      age,
      item.scores.jobRisk,
      item.scores.exercise,
      item.scores.smoking,
      item.scores.bloodPressure,
      item.scores.bmi,
      item.scores.cholesterol,
      item.scores.triglycerides,
      item.scores.hdl,
      item.totalScore,
      riskLabel
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `assessment-rahma-${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`${filteredData.length} data berhasil diekspor ke CSV`, 'success');
}

/**
 * Export filtered data to PDF
 */
export async function exportToPDF() {
  if (filteredData.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'warning');
    return;
  }

  try {
    // Dynamically load jsPDF if not available
    if (typeof jspdf === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text('Assessment RAHMA Dashboard', 14, 15);
    doc.setFontSize(10);
    doc.text(`Framingham CVD Risk Assessment - Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    // Summary Statistics
    doc.setFontSize(11);
    doc.text('Ringkasan Statistik:', 14, 32);

    const lowCount = filteredData.filter(d => d.riskCategory === 'low').length;
    const mediumCount = filteredData.filter(d => d.riskCategory === 'medium').length;
    const highCount = filteredData.filter(d => d.riskCategory === 'high').length;
    const total = filteredData.length;

    doc.setFontSize(10);
    doc.text(`Total Data: ${total}`, 20, 39);
    doc.text(`Low Risk: ${lowCount} (${((lowCount/total)*100).toFixed(1)}%)`, 20, 45);
    doc.text(`Medium Risk: ${mediumCount} (${((mediumCount/total)*100).toFixed(1)}%)`, 20, 51);
    doc.text(`High Risk: ${highCount} (${((highCount/total)*100).toFixed(1)}%)`, 20, 57);

    // Table data
    const tableData = filteredData.map((item, idx) => {
      const genderDisplay = item.employee.gender === 'L' || item.employee.gender === 'Laki-laki' ? 'L' : 'P';
      const birthDate = new Date(item.employee.birthDate);
      const mcuDate = new Date(item.mcu.mcuDate);
      let age = mcuDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = mcuDate.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && mcuDate.getDate() < birthDate.getDate())) {
        age--;
      }

      const riskLabel = item.riskCategory === 'low' ? 'LOW' :
                       item.riskCategory === 'medium' ? 'MEDIUM' : 'HIGH';

      return [
        idx + 1,
        item.employee.name.substring(0, 20),
        genderDisplay,
        age,
        item.scores.jobRisk,
        item.scores.exercise,
        item.scores.smoking,
        item.scores.bloodPressure,
        item.scores.bmi,
        item.scores.cholesterol,
        item.scores.triglycerides,
        item.scores.hdl,
        item.totalScore,
        riskLabel
      ];
    });

    // Add table
    doc.autoTable({
      head: [['No', 'Nama', 'JK', 'Umur', 'Job', 'Olahraga', 'Merokok', 'TD', 'BMI', 'Kolesterol', 'Trigliserid', 'HDL', 'Total', 'Hasil']],
      body: tableData,
      startY: 65,
      margin: 10,
      headerStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        1: { halign: 'left', cellWidth: 25 }
      },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.getPages().length;
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();

        doc.setFontSize(10);
        doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    });

    // Save PDF
    const fileName = `assessment-rahma-${new Date().getTime()}.pdf`;
    doc.save(fileName);

    showToast(`${filteredData.length} data berhasil diekspor ke PDF`, 'success');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Export to window
window.assessmentRAHMA = {
  initAssessmentRahmaDAshboard,
  applyFilter,
  filterByJob,
  filterByJobRiskLevel,
  searchAssessments,
  toggleEmployeeActive,
  softDeleteEmployee,
  permanentDeleteEmployee,
  exportToCSV,
  exportToPDF,
  nextPage,
  prevPage
};
