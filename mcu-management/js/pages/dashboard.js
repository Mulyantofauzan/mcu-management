/**
 * Dashboard Page
 * Main dashboard with KPIs and charts
 */

import { authService } from '../services/authService.js';
import { employeeService } from '../services/employeeService.js';
import { mcuService } from '../services/mcuService.js';
import { masterDataService } from '../services/masterDataService.js';
import { database } from '../services/database.js';
import { formatDateDisplay, getCurrentMonthRange, isDateInRange } from '../utils/dateHelpers.js';
import { showToast, getStatusBadge, hideAdminMenuForNonAdmin } from '../utils/uiHelpers.js';
import { seedDatabase, checkAndSeedIfEmpty } from '../seedData.js';

// State
let currentDateRange = { startDate: '', endDate: '' }; // Default: empty filter (show all)
let latestMCUs = [];
let employees = [];
let departments = [];
let charts = {};

// Initialize
async function init() {
  try {
    // Check auth
    if (!authService.isAuthenticated()) {
      // Auto-login for demo (remove in production)
      try {
        await authService.login('admin', 'admin123');
      } catch (err) {
        window.location.href = 'pages/login.html';
        return;
      }
    }

    // Update user info
    updateUserInfo();

    // Show debug toggle for admin
    if (authService.isAdmin()) {
      document.getElementById('debug-toggle').classList.remove('hidden');
    }

    // Check and seed if empty
    const seedResult = await checkAndSeedIfEmpty();
    if (seedResult.success && seedResult.counts) {
      console.log('Database seeded:', seedResult.counts);
    }

    // Set default date range (empty = show all)
    setDateRange('', '');

    // Load data
    await loadData();

    console.log('Dashboard initialized');
  } catch (error) {
    console.error('Init error:', error);
    showToast('Error initializing dashboard: ' + error.message, 'error');
  }
}

function updateUserInfo() {
  const user = authService.getCurrentUser();
  if (user) {
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('user-role').textContent = user.role;
    document.getElementById('user-initial').textContent = user.displayName.charAt(0).toUpperCase();

    // Hide admin-only menus for non-Admin users
    hideAdminMenuForNonAdmin(user);
  }
}

function setDateRange(startDate, endDate) {
  document.getElementById('start-date').value = startDate;
  document.getElementById('end-date').value = endDate;
  currentDateRange = { startDate, endDate };
}

async function loadData() {
  try {
    // Load all data
    employees = await employeeService.getAll();
    departments = await masterDataService.getAllDepartments();
    const jobTitles = await masterDataService.getAllJobTitles();

    // Get latest MCU per employee
    latestMCUs = await mcuService.getLatestMCUPerEmployee();

    // Filter by date range (if dates are set)
    const filteredMCUs = (!currentDateRange.startDate && !currentDateRange.endDate)
      ? latestMCUs
      : latestMCUs.filter(mcu =>
          isDateInRange(mcu.mcuDate, currentDateRange.startDate, currentDateRange.endDate)
        );

    // Update KPIs
    updateKPIs(filteredMCUs);

    // Update charts
    updateCharts(filteredMCUs);

    // Update follow-up list
    updateFollowUpList();

    // Update activity
    updateActivityList();

  } catch (error) {
    console.error('Load data error:', error);
    showToast('Error loading data: ' + error.message, 'error');
  }
}

function updateKPIs(filteredMCUs) {
  // Total employees (all active)
  const activeEmployees = employees.filter(e => !e.deletedAt);
  document.getElementById('kpi-total-employees').textContent = activeEmployees.length;

  // Total MCU (count of latest MCU in date range)
  document.getElementById('kpi-total-mcu').textContent = filteredMCUs.length;

  // Count by status - use finalResult if available, otherwise use initialResult
  const fit = filteredMCUs.filter(m => {
    const result = m.finalResult || m.initialResult;
    return result === 'Fit';
  }).length;

  const fitWithNote = filteredMCUs.filter(m => {
    const result = m.finalResult || m.initialResult;
    return result === 'Fit With Note';
  }).length;

  const temporaryUnfit = filteredMCUs.filter(m => {
    const result = m.finalResult || m.initialResult;
    return result === 'Temporary Unfit';
  }).length;

  const followUp = filteredMCUs.filter(m => {
    const result = m.finalResult || m.initialResult;
    return result === 'Follow-Up' && m.finalResult !== 'Fit';
  }).length;

  const unfit = filteredMCUs.filter(m => {
    const result = m.finalResult || m.initialResult;
    return result === 'Unfit';
  }).length;

  document.getElementById('kpi-fit').textContent = fit;
  document.getElementById('kpi-fit-with-note').textContent = fitWithNote;
  document.getElementById('kpi-temporary-unfit').textContent = temporaryUnfit;
  document.getElementById('kpi-followup').textContent = followUp;
  document.getElementById('kpi-unfit').textContent = unfit;
}

function updateCharts(filteredMCUs) {
  // Chart 1: Distribution per Department
  updateDepartmentChart(filteredMCUs);

  // Chart 2: MCU Type Distribution
  updateMCUTypeChart(filteredMCUs);

  // Chart 3: Status Distribution
  updateStatusChart(filteredMCUs);

  // Chart 4: Blood Type Distribution (filtered by employees who have MCU in range)
  updateBloodTypeChart(filteredMCUs);

  // Chart 5: MCU Trend Monthly (Line Chart)
  updateMCUTrendChart();

  // Chart 6: Age Distribution
  updateAgeDistributionChart(filteredMCUs);

  // Chart 7: BMI Distribution
  updateBMIDistributionChart(filteredMCUs);
}

function updateDepartmentChart(filteredMCUs) {
  const ctx = document.getElementById('chart-department');

  // Count MCUs per department
  const deptCounts = {};
  departments.forEach(dept => {
    deptCounts[dept.name] = 0;
  });

  filteredMCUs.forEach(mcu => {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (employee) {
      const dept = departments.find(d => d.departmentId === employee.departmentId);
      if (dept) {
        deptCounts[dept.name]++;
      }
    }
  });

  const labels = Object.keys(deptCounts);
  const data = Object.values(deptCounts);

  if (charts.department) charts.department.destroy();

  charts.department = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah MCU',
        data: data,
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#1f2937',
          font: {
            weight: 'bold'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function updateMCUTypeChart(filteredMCUs) {
  const ctx = document.getElementById('chart-mcu-type');

  // Count by type
  const typeCounts = {
    'Pre-Employee': 0,
    'Annual': 0,
    'Khusus': 0,
    'Final': 0
  };

  filteredMCUs.forEach(mcu => {
    if (typeCounts.hasOwnProperty(mcu.mcuType)) {
      typeCounts[mcu.mcuType]++;
    }
  });

  if (charts.mcuType) charts.mcuType.destroy();

  charts.mcuType = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value, context) => {
            if (value === 0) return '';
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${value}\n(${percentage}%)`;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function updateStatusChart(filteredMCUs) {
  const ctx = document.getElementById('chart-status');

  // Count by final result (or initial result if no follow-up)
  const statusCounts = {
    'Fit': 0,
    'Fit With Note': 0,
    'Temporary Unfit': 0,
    'Follow-Up': 0,
    'Unfit': 0
  };

  filteredMCUs.forEach(mcu => {
    const result = mcu.finalResult || mcu.initialResult;
    if (statusCounts.hasOwnProperty(result)) {
      statusCounts[result]++;
    }
  });

  // Filter out zero counts for cleaner display
  const labels = Object.keys(statusCounts).filter(k => statusCounts[k] > 0);
  const data = labels.map(k => statusCounts[k]);
  const colors = labels.map(label => {
    switch(label) {
      case 'Fit': return 'rgba(34, 197, 94, 0.8)';
      case 'Fit With Note': return 'rgba(59, 130, 246, 0.8)';
      case 'Temporary Unfit': return 'rgba(249, 115, 22, 0.8)';
      case 'Follow-Up': return 'rgba(234, 179, 8, 0.8)';
      case 'Unfit': return 'rgba(239, 68, 68, 0.8)';
      default: return 'rgba(156, 163, 175, 0.8)';
    }
  });

  if (charts.status) charts.status.destroy();

  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          },
          formatter: (value, context) => {
            if (value === 0) return '';
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${value}\n(${percentage}%)`;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function updateBloodTypeChart(filteredMCUs) {
  const ctx = document.getElementById('chart-blood-type');

  // Get employee IDs from filtered MCUs
  const employeeIdsInFilter = new Set(filteredMCUs.map(mcu => mcu.employeeId));

  // Count by blood type (only employees with MCU in date range)
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodCounts = {};
  bloodTypes.forEach(type => bloodCounts[type] = 0);

  employees.forEach(emp => {
    if (employeeIdsInFilter.has(emp.employeeId) && bloodCounts.hasOwnProperty(emp.bloodType)) {
      bloodCounts[emp.bloodType]++;
    }
  });

  if (charts.bloodType) charts.bloodType.destroy();

  charts.bloodType = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bloodTypes,
      datasets: [{
        label: 'Jumlah Karyawan',
        data: Object.values(bloodCounts),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#1f2937',
          font: {
            weight: 'bold'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

async function updateMCUTrendChart() {
  const ctx = document.getElementById('chart-mcu-trend');
  if (!ctx) return;

  try {
    // Get all MCUs (not just latest per employee)
    const allMCUs = await database.db.mcus.toArray();
    const validMCUs = allMCUs.filter(mcu => !mcu.deletedAt && mcu.mcuDate);

    // Determine date range
    let startDate, endDate;
    if (currentDateRange.startDate && currentDateRange.endDate) {
      // Use filter dates
      startDate = new Date(currentDateRange.startDate);
      endDate = new Date(currentDateRange.endDate);
    } else {
      // Default: last 12 months
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    }

    // Generate month labels between start and end
    const months = [];
    const monthLabels = [];
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (currentMonth <= endMonth) {
      months.push(new Date(currentMonth));
      monthLabels.push(currentMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Count MCUs per month
    const monthlyCounts = months.map(monthDate => {
      return validMCUs.filter(mcu => {
        const mcuDate = new Date(mcu.mcuDate);
        return mcuDate.getMonth() === monthDate.getMonth() &&
               mcuDate.getFullYear() === monthDate.getFullYear();
      }).length;
    });

    if (charts.mcuTrend) charts.mcuTrend.destroy();

    charts.mcuTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Jumlah MCU',
          data: monthlyCounts,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          datalabels: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Jumlah MCU: ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating trend chart:', error);
  }
}

function updateAgeDistributionChart(filteredMCUs) {
  const ctx = document.getElementById('chart-age-distribution');

  // Calculate age for employees with MCU
  const ageRanges = {
    '<20': 0,
    '20-24': 0,
    '25-29': 0,
    '30-34': 0,
    '35-39': 0,
    '40-44': 0,
    '45-49': 0,
    '50-54': 0,
    '55-59': 0,
    '60+': 0
  };

  filteredMCUs.forEach(mcu => {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (employee && employee.birthDate) {
      const birthDate = new Date(employee.birthDate);
      const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

      if (age < 20) ageRanges['<20']++;
      else if (age >= 20 && age < 25) ageRanges['20-24']++;
      else if (age >= 25 && age < 30) ageRanges['25-29']++;
      else if (age >= 30 && age < 35) ageRanges['30-34']++;
      else if (age >= 35 && age < 40) ageRanges['35-39']++;
      else if (age >= 40 && age < 45) ageRanges['40-44']++;
      else if (age >= 45 && age < 50) ageRanges['45-49']++;
      else if (age >= 50 && age < 55) ageRanges['50-54']++;
      else if (age >= 55 && age < 60) ageRanges['55-59']++;
      else ageRanges['60+']++;
    }
  });

  if (charts.ageDistribution) charts.ageDistribution.destroy();

  charts.ageDistribution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(ageRanges),
      datasets: [{
        label: 'Jumlah Karyawan',
        data: Object.values(ageRanges),
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold'
          },
          formatter: (value) => value > 0 ? value : ''
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function updateBMIDistributionChart(filteredMCUs) {
  const ctx = document.getElementById('chart-bmi-distribution');

  // BMI Categories
  const bmiCategories = {
    'Underweight\n(<18.5)': 0,
    'Normal\n(18.5-24.9)': 0,
    'Overweight\n(25-29.9)': 0,
    'Obese\n(≥30)': 0,
    'No Data': 0
  };

  filteredMCUs.forEach(mcu => {
    if (mcu.bmi) {
      const bmi = parseFloat(mcu.bmi);
      if (bmi < 18.5) bmiCategories['Underweight\n(<18.5)']++;
      else if (bmi >= 18.5 && bmi < 25) bmiCategories['Normal\n(18.5-24.9)']++;
      else if (bmi >= 25 && bmi < 30) bmiCategories['Overweight\n(25-29.9)']++;
      else if (bmi >= 30) bmiCategories['Obese\n(≥30)']++;
    } else {
      bmiCategories['No Data']++;
    }
  });

  const labels = Object.keys(bmiCategories);
  const data = Object.values(bmiCategories);
  const colors = labels.map(label => {
    if (label.includes('Underweight')) return 'rgba(234, 179, 8, 0.8)';
    if (label.includes('Normal')) return 'rgba(34, 197, 94, 0.8)';
    if (label.includes('Overweight')) return 'rgba(249, 115, 22, 0.8)';
    if (label.includes('Obese')) return 'rgba(239, 68, 68, 0.8)';
    return 'rgba(156, 163, 175, 0.8)';
  });

  if (charts.bmiDistribution) charts.bmiDistribution.destroy();

  charts.bmiDistribution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Karyawan',
        data: data,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold'
          },
          formatter: (value) => value > 0 ? value : ''
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

async function updateFollowUpList() {
  const container = document.getElementById('followup-list');
  const followUpMCUs = await mcuService.getFollowUpList();

  if (followUpMCUs.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Tidak ada yang perlu follow-up</p>';
    return;
  }

  // Show first 5
  const displayMCUs = followUpMCUs.slice(0, 5);

  let html = '';
  for (const mcu of displayMCUs) {
    const employee = employees.find(e => e.employeeId === mcu.employeeId);
    if (employee) {
      const dept = departments.find(d => d.departmentId === employee.departmentId);

      html += `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">${employee.name}</p>
            <p class="text-xs text-gray-500">${dept?.name || '-'} • ${formatDateDisplay(mcu.mcuDate)}</p>
          </div>
          <a href="pages/follow-up.html" class="btn btn-sm btn-primary">Update</a>
        </div>
      `;
    }
  }

  if (followUpMCUs.length > 5) {
    html += `<p class="text-xs text-center text-gray-500 mt-2">+${followUpMCUs.length - 5} lainnya</p>`;
  }

  container.innerHTML = html;
}

async function updateActivityList() {
  const container = document.getElementById('activity-list');
  const activities = await database.getActivityLog(5);

  if (activities.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Belum ada aktivitas</p>';
    return;
  }

  let html = '';
  for (const activity of activities) {
    let activityText = '';
    let userName = 'System';

    // Get user display name
    try {
      const user = await database.db.users.where('userId').equals(activity.userId).first();
      if (user) userName = user.displayName;
    } catch (e) {
      // Silent fail
    }

    // Build detailed activity text based on entity type
    if (activity.entityType === 'Employee') {
      const actionText = {
        'create': 'menambahkan karyawan',
        'update': 'mengupdate data karyawan',
        'delete': 'menghapus karyawan'
      }[activity.action] || activity.action;

      let employeeName = activity.entityId;
      try {
        const emp = employees.find(e => e.employeeId === activity.entityId);
        if (emp) employeeName = emp.name;
      } catch (e) {}

      activityText = `<strong>${userName}</strong> ${actionText} <strong>${employeeName}</strong>`;
    } else if (activity.entityType === 'MCU') {
      let employeeName = '';
      try {
        const mcu = await database.db.mcus.where('mcuId').equals(activity.entityId).first();
        if (mcu) {
          const emp = employees.find(e => e.employeeId === mcu.employeeId);
          if (emp) employeeName = emp.name;
        }
      } catch (e) {}

      if (activity.action === 'create') {
        activityText = `<strong>${employeeName}</strong> baru saja MCU`;
      } else if (activity.action === 'update') {
        activityText = `<strong>${employeeName}</strong> baru saja Follow-Up`;
      } else {
        activityText = `<strong>${userName}</strong> menghapus data MCU`;
      }
    } else {
      const actionText = {
        'create': 'menambahkan',
        'update': 'mengupdate',
        'delete': 'menghapus'
      }[activity.action] || activity.action;

      activityText = `<strong>${userName}</strong> ${actionText} ${activity.entityType}`;
    }

    html += `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-sm text-gray-900">${activityText}</p>
          <p class="text-xs text-gray-500">${formatDateDisplay(activity.timestamp)}</p>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Event Handlers
window.applyDateFilter = async function() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  if (!startDate || !endDate) {
    showToast('Pilih tanggal mulai dan akhir', 'warning');
    return;
  }

  currentDateRange = { startDate, endDate };
  await loadData();
  showToast('Filter tanggal diterapkan', 'success');
};

window.resetDateFilter = async function() {
  currentDateRange = { startDate: '', endDate: '' };
  setDateRange('', '');
  await loadData();
  showToast('Filter direset (tampilkan semua data)', 'success');
};

window.handleLogout = function() {
  authService.logout();
};

window.toggleDebugPanel = function() {
  const panel = document.getElementById('debug-panel');
  panel.classList.toggle('hidden');
};

// Seed function for manual trigger
window.reseedDatabase = async function() {
  if (confirm('Ini akan menghapus semua data dan membuat data baru. Lanjutkan?')) {
    const result = await seedDatabase();
    if (result.success) {
      showToast('Database berhasil di-seed ulang', 'success');
      await loadData();
    } else {
      showToast('Gagal seed database: ' + result.error, 'error');
    }
  }
};

// Initialize on load
init();
