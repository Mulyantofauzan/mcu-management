/**
 * MCU Expiry Management Page
 * Displays employees with expired or soon-to-expire MCU records
 */

import { authService } from '../services/authService.js';
import { initSidebar } from '../utils/sidebarInit.js';
import { mcuExpiryService } from '../services/mcuExpiryService.js';

class MCUExpiryManagementPage {
  constructor() {
    this.allExpiryData = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.pageSize = 10;
    this.searchQuery = '';
    this.filterDepartment = '';
    this.filterStatus = '';
    this.sortBy = 'days'; // 'days' or 'status'
    this.allDepartments = [];
  }

  async initialize() {
    try {
      // Check authentication
      if (!authService.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
      }

      // Set user info
      const user = authService.getCurrentUser();
      if (user) {
        const displayName = user?.displayName || 'User';
        const role = user?.role || 'Petugas';
        const initial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';

        document.getElementById('user-name').textContent = displayName;
        document.getElementById('user-role').textContent = role;
        document.getElementById('user-initial').textContent = initial;
      }

      // Initialize sidebar
      await initSidebar();

      // Load data
      await this.loadExpiryData();

      // Mark page as initialized
      document.body.classList.add('initialized');
    } catch (error) {
      alert('Error initializing page: ' + error.message);
      document.body.classList.add('initialized');
    }
  }

  async loadExpiryData() {
    try {
      // Load employees with MCU data
      this.allExpiryData = await mcuExpiryService.loadEmployeesWithMCU();

      // Filter to only expired and warning
      this.filteredData = this.allExpiryData.filter(emp => {
        return emp.expiryStatus === 'EXPIRED' || emp.expiryStatus === 'WARNING';
      });

      // Extract unique departments
      this.allDepartments = [...new Set(this.filteredData.map(emp => emp.department))].filter(d => d).sort();

      // Populate department dropdown
      this.populateDepartmentDropdown();

      // Update summary
      this.updateSummary();

      // Render table
      this.currentPage = 1;
      this.renderTable();
    } catch (error) {
      alert('Error loading expiry data: ' + error.message);
    }
  }

  populateDepartmentDropdown() {
    const select = document.getElementById('filter-department');
    if (!select) return;

    // Clear existing options except the first one
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Add department options
    this.allDepartments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      select.appendChild(option);
    });
  }

  updateSummary() {
    const expiredCount = this.allExpiryData.filter(emp => emp.expiryStatus === 'EXPIRED').length;
    const warningCount = this.allExpiryData.filter(emp => emp.expiryStatus === 'WARNING').length;
    const totalCount = expiredCount + warningCount;

    document.getElementById('stat-expired').textContent = expiredCount;
    document.getElementById('stat-warning').textContent = warningCount;
    document.getElementById('stat-total').textContent = totalCount;

    // Update badge in sidebar
    const badgeEl = document.getElementById('badge-mcu-expiry');
    if (badgeEl) {
      badgeEl.textContent = totalCount;
    }
  }

  renderTable() {
    const tbody = document.getElementById('expiry-table-body');
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = this.getSearchedData().slice(startIdx, endIdx);

    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-gray-500">Tidak ada data</td></tr>';
      this.updatePagination();
      return;
    }

    tbody.innerHTML = pageData.map((emp, idx) => {
      const rowNumber = startIdx + idx + 1;
      const statusBadge = mcuExpiryService.getStatusBadge(emp.expiryStatus);
      const lastMCUDate = emp.lastMCUDate ? mcuExpiryService.formatDate(emp.lastMCUDate) : '-';
      const daysLeftText = emp.daysLeft !== null ? emp.daysLeft : '-';

      return `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
          <td class="px-6 py-4 text-gray-900">${rowNumber}</td>
          <td class="px-6 py-4 text-gray-600">${emp.employee_id || '-'}</td>
          <td class="px-6 py-4 font-medium text-gray-900">${emp.name}</td>
          <td class="px-6 py-4 text-gray-600">${emp.department}</td>
          <td class="px-6 py-4 text-gray-600">${emp.job_title}</td>
          <td class="px-6 py-4 text-gray-600">${lastMCUDate}</td>
          <td class="px-6 py-4 font-semibold ${emp.expiryStatus === 'EXPIRED' ? 'text-red-600' : 'text-yellow-600'}">
            ${daysLeftText} ${emp.daysLeft !== null && emp.daysLeft > 0 ? 'hari' : emp.daysLeft === 0 ? 'hari' : emp.daysLeft < 0 ? 'hari' : 'hari'}
          </td>
          <td class="px-6 py-4">
            <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.color} ${statusBadge.text}">
              ${statusBadge.label}
            </span>
          </td>
          <td class="px-6 py-4">
            <button onclick="window.openAddMCUModal('${emp.employee_id}', '${emp.name}')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition">
              + Tambah MCU
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.updatePagination();
  }

  getSearchedData() {
    // Apply all filters
    let data = this.filteredData;

    // Department filter
    if (this.filterDepartment) {
      data = data.filter(emp => emp.department === this.filterDepartment);
    }

    // Status filter
    if (this.filterStatus) {
      data = data.filter(emp => emp.expiryStatus === this.filterStatus);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      data = data.filter(emp => {
        return emp.name.toLowerCase().includes(query) ||
               emp.employee_id.toLowerCase().includes(query) ||
               emp.department.toLowerCase().includes(query);
      });
    }

    // Apply sorting
    if (this.sortBy === 'days') {
      // Sort by days left (ascending - most urgent first)
      data.sort((a, b) => {
        const aDays = a.daysLeft !== null ? a.daysLeft : 999999;
        const bDays = b.daysLeft !== null ? b.daysLeft : 999999;
        return aDays - bDays;
      });
    } else if (this.sortBy === 'status') {
      // Sort by status (EXPIRED -> WARNING)
      const statusOrder = { 'EXPIRED': 0, 'WARNING': 1, 'OK': 2 };
      data.sort((a, b) => {
        return (statusOrder[a.expiryStatus] || 999) - (statusOrder[b.expiryStatus] || 999);
      });
    }

    return data;
  }

  updatePagination() {
    const totalData = this.getSearchedData().length;
    const totalPages = Math.ceil(totalData / this.pageSize);
    const startIdx = (this.currentPage - 1) * this.pageSize + 1;
    const endIdx = Math.min(this.currentPage * this.pageSize, totalData);

    // Update info text
    document.getElementById('pagination-info').textContent =
      totalData === 0 ? 'Showing 0 of 0' : `Showing ${startIdx} to ${endIdx} of ${totalData}`;

    // Update prev/next buttons
    document.getElementById('prev-btn').disabled = this.currentPage === 1;
    document.getElementById('next-btn').disabled = this.currentPage === totalPages;

    // Update page buttons
    const pageButtons = document.getElementById('page-buttons');
    pageButtons.innerHTML = '';

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `px-3 py-1 rounded border ${
        i === this.currentPage
          ? 'bg-primary-600 text-white border-primary-600'
          : 'border-gray-300 hover:bg-gray-50'
      }`;
      btn.onclick = () => this.goToPage(i);
      pageButtons.appendChild(btn);
    }

    if (totalPages > 5) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'px-2';
      pageButtons.appendChild(dots);

      const lastBtn = document.createElement('button');
      lastBtn.textContent = totalPages;
      lastBtn.className = `px-3 py-1 rounded border ${
        totalPages === this.currentPage
          ? 'bg-primary-600 text-white border-primary-600'
          : 'border-gray-300 hover:bg-gray-50'
      }`;
      lastBtn.onclick = () => this.goToPage(totalPages);
      pageButtons.appendChild(lastBtn);
    }
  }

  goToPage(pageNum) {
    this.currentPage = pageNum;
    this.renderTable();
  }
}

// Create page instance
const page = new MCUExpiryManagementPage();

// Global functions
window.handleSearch = function() {
  const input = document.getElementById('search-input');
  page.searchQuery = input.value;
  page.currentPage = 1;
  page.renderTable();
};

window.prevPage = function() {
  if (page.currentPage > 1) {
    page.currentPage--;
    page.renderTable();
  }
};

window.nextPage = function() {
  const totalPages = Math.ceil(page.getSearchedData().length / page.pageSize);
  if (page.currentPage < totalPages) {
    page.currentPage++;
    page.renderTable();
  }
};

window.openAddMCUModal = function(employeeId, employeeName) {
  // Redirect to tambah-karyawan page with pre-filled employee
  // Store the employee ID in sessionStorage for the tambah-karyawan page to use
  sessionStorage.setItem('prefilledEmployeeId', employeeId);
  sessionStorage.setItem('prefilledEmployeeName', employeeName);
  // Redirect to tambah-karyawan page which will open the Add MCU modal
  window.location.href = '../pages/tambah-karyawan.html?openMCUModal=true';
};

window.handleFilterChange = function() {
  const deptSelect = document.getElementById('filter-department');
  const statusSelect = document.getElementById('filter-status');

  page.filterDepartment = deptSelect.value;
  page.filterStatus = statusSelect.value;
  page.currentPage = 1;
  page.renderTable();
};

window.handleSortChange = function(sortType) {
  page.sortBy = sortType;
  page.currentPage = 1;
  page.renderTable();

  // Update button styling
  const daysBtn = document.getElementById('sort-days-btn');
  const statusBtn = document.getElementById('sort-status-btn');

  if (sortType === 'days') {
    daysBtn.classList.remove('bg-gray-300', 'text-gray-700');
    daysBtn.classList.add('bg-primary-600', 'text-white');
    statusBtn.classList.remove('bg-primary-600', 'text-white');
    statusBtn.classList.add('bg-gray-300', 'text-gray-700');
  } else {
    statusBtn.classList.remove('bg-gray-300', 'text-gray-700');
    statusBtn.classList.add('bg-primary-600', 'text-white');
    daysBtn.classList.remove('bg-primary-600', 'text-white');
    daysBtn.classList.add('bg-gray-300', 'text-gray-700');
  }
};

window.exportToCSV = function() {
  try {
    const data = page.getSearchedData();
    if (data.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    // Create CSV header
    const headers = ['No', 'ID Karyawan', 'Nama', 'Departemen', 'Jabatan', 'MCU Terakhir', 'Hari Tersisa', 'Status'];
    const csvContent = [headers.join(',')];

    // Add data rows
    data.forEach((emp, idx) => {
      const lastMCUDate = emp.lastMCUDate ? mcuExpiryService.formatDate(emp.lastMCUDate) : '-';
      const daysLeftText = emp.daysLeft !== null ? emp.daysLeft : '-';
      const row = [
        idx + 1,
        emp.employee_id || '-',
        emp.name,
        emp.department || '-',
        emp.job_title || '-',
        lastMCUDate,
        daysLeftText,
        emp.expiryStatus
      ];
      csvContent.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    // Create blob and download
    const csv = csvContent.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `MCU_Expiry_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    alert('Error exporting CSV: ' + error.message);
  }
};

// Initialize page
page.initialize();
