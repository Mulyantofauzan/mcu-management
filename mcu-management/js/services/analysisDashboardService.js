/**
 * Analysis Dashboard Service
 *
 * Handles all data aggregation, filtering, and chart rendering for the Analysis Dashboard
 * Data source: Latest MCU per employee (from mcus, employees, pemeriksaan_lab tables)
 */

import { supabase } from '../config/supabase.js';
import { labService } from './labService.js';
import { LAB_ITEMS_MAPPING } from '../data/labItemsMapping.js';

class AnalysisDashboardService {
  constructor() {
    this.charts = new Map(); // Store chart instances for cleanup
    this.allData = []; // Cache all MCU data
    this.filteredData = []; // Current filtered data
    this.labItemsMap = {}; // Map lab_item_id to lab info
  }

  /**
   * Initialize dashboard on page load
   */
  async initializeDashboard() {
    try {
      this.showLoading(true);

      // Load initial data
      await this.loadDashboardData();

      // Populate filter options
      await this.populateFilters();

      // Render all charts
      await this.renderAllCharts();

      // Setup event listeners
      this.setupEventListeners();

      this.showLoading(false);
    } catch (error) {
      console.error('[AnalysisDashboard] Init error:', error);
      this.showLoading(false);
      alert('Error loading dashboard: ' + error.message);
    }
  }

  /**
   * Load all MCU data with latest per employee
   */
  async loadDashboardData() {
    try {
      // Get all employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .is('deleted_at', null);

      if (empError) throw empError;

      // Get all MCUs (sorted by date DESC to get latest first)
      const { data: mcus, error: mcuError } = await supabase
        .from('mcus')
        .select('*')
        .is('deleted_at', null)
        .order('mcu_date', { ascending: false });

      if (mcuError) throw mcuError;

      // Get departments and job titles
      const { data: departments } = await supabase.from('departments').select('*');
      const { data: jobTitles } = await supabase.from('job_titles').select('*');

      // Create map of latest MCU per employee
      const latestMCUPerEmployee = {};
      mcus.forEach(mcu => {
        if (!latestMCUPerEmployee[mcu.employee_id]) {
          latestMCUPerEmployee[mcu.employee_id] = mcu;
        }
      });

      // Get all lab results for latest MCUs
      const mculIds = Object.values(latestMCUPerEmployee).map(m => m.mcu_id);
      console.log(`[AnalysisDashboard] Loading lab results for ${mculIds.length} latest MCUs:`, mculIds);
      const { data: labResults, error: labError } = await supabase
        .from('pemeriksaan_lab')
        .select('*')
        .in('mcu_id', mculIds)
        .is('deleted_at', null); // ✅ CRITICAL: Only get non-deleted lab results

      if (labError) throw labError;
      console.log(`[AnalysisDashboard] Retrieved ${labResults?.length || 0} lab results from database`);

      // ✅ CRITICAL FIX: Use labItemsMapping.js as authoritative source for lab item reference ranges
      // This prevents issues with corrupted or missing min/max values in database
      // labItemsMapping.js is the single source of truth for all lab item metadata
      this.labItemsMap = { ...LAB_ITEMS_MAPPING };
      // Also add unit information from mapping
      Object.keys(this.labItemsMap).forEach(id => {
        const item = this.labItemsMap[id];
        // Map 'min' and 'max' from labItemsMapping to database field names
        item.min_range_reference = item.min;
        item.max_range_reference = item.max;
      });

      // Build consolidated data
      this.allData = employees
        .filter(emp => latestMCUPerEmployee[emp.employee_id])
        .map(emp => {
          const mcu = latestMCUPerEmployee[emp.employee_id];
          const dept = departments?.find(d => d.name === emp.department);
          const job = jobTitles?.find(j => j.name === emp.job_title);

          // Get lab results for this MCU
          const mcuLabResults = labResults?.filter(l => l.mcu_id === mcu.mcu_id) || [];
          const labMap = {};
          mcuLabResults.forEach(lab => {
            labMap[lab.lab_item_id] = lab;
          });

          return {
            employee: emp,
            mcu,
            department: dept,
            jobTitle: job,
            labs: labMap
          };
        });

      this.filteredData = [...this.allData];
    } catch (error) {
      console.error('[AnalysisDashboard] Data load error:', error);
      throw error;
    }
  }

  /**
   * Populate filter dropdowns
   */
  async populateFilters() {
    try {
      const deptSelect = document.getElementById('filterDepartment');
      const jobSelect = document.getElementById('filterJobTitle');

      // Get unique departments
      const departments = [...new Set(this.allData.map(d => d.employee.department).filter(Boolean))];
      departments.sort();
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        deptSelect.appendChild(option);
      });

      // Get unique job titles
      const jobTitles = [...new Set(this.allData.map(d => d.employee.job_title).filter(Boolean))];
      jobTitles.sort();
      jobTitles.forEach(job => {
        const option = document.createElement('option');
        option.value = job;
        option.textContent = job;
        jobSelect.appendChild(option);
      });
    } catch (error) {
      console.error('[AnalysisDashboard] Filter populate error:', error);
    }
  }

  /**
   * Setup event listeners for filters
   */
  setupEventListeners() {
    const btnApply = document.getElementById('btnApplyFilter');
    const btnReset = document.getElementById('btnResetFilter');

    btnApply?.addEventListener('click', () => this.applyFilters());
    btnReset?.addEventListener('click', () => this.resetFilters());
  }

  /**
   * Apply filters and refresh charts
   */
  async applyFilters() {
    const dept = document.getElementById('filterDepartment').value;
    const job = document.getElementById('filterJobTitle').value;
    const status = document.getElementById('filterStatus').value;

    this.filteredData = this.allData.filter(item => {
      if (dept && item.employee.department !== dept) return false;
      if (job && item.employee.job_title !== job) return false;
      if (status && item.mcu.status !== status) return false;
      return true;
    });

    await this.renderAllCharts();
  }

  /**
   * Reset all filters
   */
  async resetFilters() {
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterJobTitle').value = '';
    document.getElementById('filterStatus').value = '';
    this.filteredData = [...this.allData];
    await this.renderAllCharts();
  }

  /**
   * Render all charts and statistics
   */
  async renderAllCharts() {
    try {
      this.updateSummaryCards();
      this.renderBMIChart();
      this.renderBloodPressureChart();
      this.renderVisionChart();
      this.renderExaminationCharts();
      this.renderLabResultsCharts();
    } catch (error) {
      console.error('[AnalysisDashboard] Render error:', error);
    }
  }

  /**
   * 1. Update summary cards
   */
  updateSummaryCards() {
    const total = this.filteredData.length;
    const fit = this.filteredData.filter(d => d.mcu.status === 'Fit').length;
    const fitNote = this.filteredData.filter(d => d.mcu.status === 'Fit With Note').length;
    const unfit = this.filteredData.filter(d => d.mcu.status === 'Unfit').length;

    document.getElementById('statTotalMCU').textContent = total;
    document.getElementById('statFit').textContent = fit;
    document.getElementById('statFitWithNote').textContent = fitNote;
    document.getElementById('statUnfit').textContent = unfit;
  }

  /**
   * 2. BMI Distribution Chart (Range-based)
   */
  renderBMIChart() {
    const ctx = document.getElementById('chartBMI')?.getContext('2d');
    if (!ctx) return;

    // Define BMI ranges
    const ranges = {
      'Underweight (<18.5)': { min: 0, max: 18.4, color: '#3b82f6' },
      'Normal (18.5-24.9)': { min: 18.5, max: 24.9, color: '#10b981' },
      'Overweight (25-29.9)': { min: 25, max: 29.9, color: '#f59e0b' },
      'Obese (≥30)': { min: 30, max: Infinity, color: '#ef4444' }
    };

    const counts = {};
    Object.keys(ranges).forEach(range => counts[range] = 0);

    this.filteredData.forEach(item => {
      const bmi = item.mcu.bmi;
      if (bmi) {
        for (const [range, config] of Object.entries(ranges)) {
          if (bmi >= config.min && bmi <= config.max) {
            counts[range]++;
            break;
          }
        }
      }
    });

    this.destroyChart('chartBMI');
    this.charts.set('chartBMI', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(ranges),
        datasets: [{
          label: 'Number of Employees',
          data: Object.values(counts),
          backgroundColor: Object.values(ranges).map(r => r.color),
          borderColor: Object.values(ranges).map(r => r.color),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    }));
  }

  /**
   * 3. Blood Pressure Range Distribution
   */
  renderBloodPressureChart() {
    const ctx = document.getElementById('chartBloodPressure')?.getContext('2d');
    if (!ctx) return;

    // Define BP ranges based on RAHMA scoring
    const ranges = {
      '<130/<85': { systolMin: 0, systolMax: 129, diasMin: 0, diasMax: 84, color: '#10b981' },
      '130-139/85-89': { systolMin: 130, systolMax: 139, diasMin: 85, diasMax: 89, color: '#f59e0b' },
      '140-159/90-99': { systolMin: 140, systolMax: 159, diasMin: 90, diasMax: 99, color: '#f97316' },
      '160-179/100-109': { systolMin: 160, systolMax: 179, diasMin: 100, diasMax: 109, color: '#ef4444' },
      '≥180/≥110': { systolMin: 180, systolMax: Infinity, diasMin: 110, diasMax: Infinity, color: '#dc2626' }
    };

    const counts = {};
    Object.keys(ranges).forEach(r => counts[r] = 0);

    this.filteredData.forEach(item => {
      const bp = item.mcu.blood_pressure;
      if (bp) {
        const [systol, dias] = bp.split('/').map(v => parseInt(v));
        if (!isNaN(systol) && !isNaN(dias)) {
          for (const [range, config] of Object.entries(ranges)) {
            if (systol >= config.systolMin && systol <= config.systolMax &&
                dias >= config.diasMin && dias <= config.diasMax) {
              counts[range]++;
              break;
            }
          }
        }
      }
    });

    this.destroyChart('chartBloodPressure');
    this.charts.set('chartBloodPressure', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(ranges),
        datasets: [{
          label: 'Number of Employees',
          data: Object.values(counts),
          backgroundColor: Object.values(ranges).map(r => r.color),
          borderColor: Object.values(ranges).map(r => r.color),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    }));
  }

  /**
   * Normalize examination/assessment values
   * Handles case-sensitivity, whitespace, common typos, and vision field variations
   */
  normalizeValue(value) {
    if (!value) return 'Not Recorded';

    // Convert to string and trim whitespace
    let normalized = String(value).trim();

    // Common normalization mappings (typos and variations)
    const normalizations = {
      'normal': 'Normal',
      'nornal': 'Normal',  // typo
      'normall': 'Normal',  // typo
      'noraml': 'Normal',  // typo
      'positive': 'Positive',
      'positif': 'Positive',
      'negatif': 'Negative',
      'negative': 'Negative',
      'good': 'Good',
      'baik': 'Good',
      'poor': 'Poor',
      'buruk': 'Poor',
      'fair': 'Fair',
      'sedang': 'Fair',
      'fit': 'Fit',
      'not fit': 'Not Fit',
      'unfit': 'Not Fit'
    };

    // Vision field special normalization
    // Handle variations like "visus jauh 6/6", "distand vods 6/6" etc.
    const lowerValue = normalized.toLowerCase();
    if (lowerValue.includes('6/') || lowerValue.includes('visus') || lowerValue.includes('vods')) {
      // Extract vision acuity value (6/6, 6/9, 6/12, etc.)
      const acuityMatch = normalized.match(/6\/\d+/i);
      if (acuityMatch) {
        const acuity = acuityMatch[0].toUpperCase();
        // Check if it's near or far vision
        if (lowerValue.includes('jauh') || lowerValue.includes('distance') || lowerValue.includes('distand')) {
          return `${acuity} (Far)`;
        } else if (lowerValue.includes('dekat') || lowerValue.includes('near')) {
          return `${acuity} (Near)`;
        }
        return acuity;
      }
    }

    // Apply normalization mapping (case-insensitive)
    const lowerNormalized = normalized.toLowerCase();
    if (normalizations[lowerNormalized]) {
      return normalizations[lowerNormalized];
    }

    // If no specific mapping, use title case
    return normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * 4. Vision Assessment Results
   */
  renderVisionChart() {
    const ctx = document.getElementById('chartVision')?.getContext('2d');
    if (!ctx) return;

    const visionCounts = {};
    this.filteredData.forEach(item => {
      // Handle 8-field vision structure with fallback to old format
      let vision = 'Not Recorded';

      // If 8-field vision structure exists, use it
      if (item.mcu.visionDistantUnaideLeft || item.mcu.visionDistantUnaideRight ||
          item.mcu.visionDistantSpectaclesLeft || item.mcu.visionDistantSpectaclesRight ||
          item.mcu.visionNearUnaideLeft || item.mcu.visionNearUnaideRight ||
          item.mcu.visionNearSpectaclesLeft || item.mcu.visionNearSpectaclesRight) {
        // Build a summary showing all 8 values
        const distantUnaided = [
          item.mcu.visionDistantUnaideLeft || 'N/A',
          item.mcu.visionDistantUnaideRight || 'N/A'
        ].join(',');
        const nearUnaided = [
          item.mcu.visionNearUnaideLeft || 'N/A',
          item.mcu.visionNearUnaideRight || 'N/A'
        ].join(',');
        vision = `D(Unaided): ${distantUnaided} / N(Unaided): ${nearUnaided}`;
      } else if (item.mcu.visionDistant || item.mcu.visionNear) {
        // Fallback to old 2-field vision format
        const distant = item.mcu.visionDistant ? this.normalizeValue(item.mcu.visionDistant) : 'N/A';
        const near = item.mcu.visionNear ? this.normalizeValue(item.mcu.visionNear) : 'N/A';
        vision = `D: ${distant} / N: ${near}`;
      } else if (item.mcu.vision) {
        // Fallback to old single vision field for backwards compatibility
        vision = this.normalizeValue(item.mcu.vision);
      }

      visionCounts[vision] = (visionCounts[vision] || 0) + 1;
    });

    const colors = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

    this.destroyChart('chartVision');
    this.charts.set('chartVision', new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(visionCounts),
        datasets: [{
          data: Object.values(visionCounts),
          backgroundColor: colors.slice(0, Object.keys(visionCounts).length),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    }));
  }

  /**
   * 5. Physical Examination Results (8 bar charts)
   */
  renderExaminationCharts() {
    const examinations = [
      { key: 'audiometry', id: 'chartAudiometri', label: 'Audiometri' },
      { key: 'spirometry', id: 'chartSpirometri', label: 'Spirometri' },
      { key: 'hbsag', id: 'chartHBSAG', label: 'HBSAG' },
      { key: 'xray', id: 'chartXRay', label: 'X-Ray' },
      { key: 'ekg', id: 'chartEKG', label: 'EKG' },
      { key: 'treadmill', id: 'chartTreadmill', label: 'Treadmill' },
      { key: 'napza', id: 'chartNAPZA', label: 'NAPZA' },
      { key: 'colorblind', id: 'chartColorblind', label: 'Buta Warna' }
    ];

    examinations.forEach(exam => {
      const ctx = document.getElementById(exam.id)?.getContext('2d');
      if (!ctx) return;

      const counts = {};
      this.filteredData.forEach(item => {
        const value = this.normalizeValue(item.mcu[exam.key]);
        counts[value] = (counts[value] || 0) + 1;
      });

      const colors = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];
      const labels = Object.keys(counts);
      const data = Object.values(counts);

      this.destroyChart(exam.id);
      this.charts.set(exam.id, new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: exam.label,
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: colors.slice(0, labels.length),
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, max: this.filteredData.length },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      }));
    });
  }

  /**
   * 6. Lab Results Analysis
   */
  renderLabResultsCharts() {
    // Lab items to display
    const labItems = [
      { id: 1, name: 'SGOT', canvasId: 'chartLabSGOT', statusEl: 'sgotStatus' },
      { id: 2, name: 'SGPT', canvasId: 'chartLabSGPT', statusEl: 'sgptStatus' },
      { id: 3, name: 'Hemoglobin', canvasId: 'chartLabHemoglobin', statusEl: 'hemoglobinStatus' },
      { id: 5, name: 'Leukosit', canvasId: 'chartLabLeukosit', statusEl: 'leukositStatus' },
      { id: 6, name: 'Trombosit', canvasId: 'chartLabTrombosit', statusEl: 'trombositStatus' },
      { id: 7, name: 'Gula Darah Puasa', canvasId: 'chartLabGDP', statusEl: 'gdpStatus' },
      { id: 8, name: 'Kolesterol Total', canvasId: 'chartLabKolesterol', statusEl: 'kolesterolStatus' },
      { id: 9, name: 'Trigliserida', canvasId: 'chartLabTrigliserida' },
      { id: 10, name: 'HDL Kolesterol', canvasId: 'chartLabHDL' },
      { id: 11, name: 'LDL Kolesterol', canvasId: 'chartLabLDL' },
      { id: 12, name: 'Ureum', canvasId: 'chartLabUreum' },
      { id: 13, name: 'Kreatinin', canvasId: 'chartLabKreatinin' },
      { id: 31, name: 'Gula Darah 2 JPP', canvasId: 'chartLabGDP2JPP' },
      { id: 32, name: 'Asam Urat', canvasId: 'chartLabAsamUrat' }
    ];

    console.log(`[AnalysisDashboard] Rendering ${labItems.length} lab result charts for ${this.filteredData.length} employees`);
    console.log(`[AnalysisDashboard] Lab items mapping keys: ${Object.keys(this.labItemsMap).join(', ')}`);

    labItems.forEach(labItem => {
      const ctx = document.getElementById(labItem.canvasId)?.getContext('2d');
      if (!ctx) return;

      const itemInfo = this.labItemsMap[labItem.id];
      if (!itemInfo) {
        console.warn(`[AnalysisDashboard] Lab item ${labItem.id} (${labItem.name}) not found in labItemsMap`);
        return;
      }

      const values = [];
      const statusCounts = { 'Normal': 0, 'Low': 0, 'High': 0, 'Not Recorded': 0 };
      const labId = labItem.id;

      this.filteredData.forEach(item => {
        const lab = item.labs[labId];
        if (lab && lab.value) {
          values.push(lab.value);
          const status = this.determineLabStatus(lab.value, itemInfo.min_range_reference, itemInfo.max_range_reference);
          statusCounts[status]++;
        } else {
          statusCounts['Not Recorded']++;
        }
      });

      // Debug: Log if most values are "Not Recorded"
      const totalRecorded = statusCounts['Normal'] + statusCounts['Low'] + statusCounts['High'];
      if (totalRecorded === 0 && this.filteredData.length > 0) {
        console.warn(`[AnalysisDashboard] ${labItem.name} (ID: ${labId}): No recorded values for ${this.filteredData.length} employees`, {
          itemInfo: itemInfo,
          minRange: itemInfo.min_range_reference,
          maxRange: itemInfo.max_range_reference,
          sampleLabs: this.filteredData.slice(0, 2).map(item => item.labs)
        });
      } else if (totalRecorded > 0) {
        console.log(`[AnalysisDashboard] ${labItem.name} (ID: ${labId}): Found ${totalRecorded} recorded values`, statusCounts);
      }

      // Update status element
      if (labItem.statusEl) {
        const totalWithData = values.length;
        if (totalWithData > 0) {
          const avgValue = (values.reduce((a, b) => a + parseFloat(b), 0) / totalWithData).toFixed(2);
          document.getElementById(labItem.statusEl).textContent = `Avg: ${avgValue} ${itemInfo.unit}`;
        }
      }

      // Create horizontal bar chart showing status distribution
      this.destroyChart(labItem.canvasId);
      this.charts.set(labItem.canvasId, new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Normal', 'Low', 'High', 'Not Recorded'],
          datasets: [{
            label: labItem.name,
            data: [statusCounts['Normal'], statusCounts['Low'], statusCounts['High'], statusCounts['Not Recorded']],
            backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#d1d5db'],
            borderColor: ['#059669', '#1d4ed8', '#dc2626', '#9ca3af'],
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, max: this.filteredData.length },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      }));
    });
  }

  /**
   * Determine lab status (Normal/Low/High)
   * Handles missing reference ranges gracefully
   */
  determineLabStatus(value, minRange, maxRange) {
    if (!value && value !== 0) return 'Not Recorded';

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'Not Recorded';

    // If reference ranges are missing, can't determine status - treat as recorded but unknown
    if (!minRange && !maxRange) {
      return 'Normal'; // Assume normal if we can't verify (data issue, not lab issue)
    }

    const numMin = parseFloat(minRange);
    const numMax = parseFloat(maxRange);

    // If ranges exist but can't parse them, still count as attempted determination
    if (isNaN(numMin) || isNaN(numMax)) {
      return 'Normal'; // Assume normal if ranges are invalid
    }

    if (numValue < numMin) return 'Low';
    if (numValue > numMax) return 'High';
    return 'Normal';
  }

  /**
   * Destroy existing chart to avoid conflicts
   */
  destroyChart(chartId) {
    if (this.charts.has(chartId)) {
      this.charts.get(chartId).destroy();
      this.charts.delete(chartId);
    }
  }

  /**
   * Show/hide loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('dashboardLoadingOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }
}

export const analysisDashboardService = new AnalysisDashboardService();
