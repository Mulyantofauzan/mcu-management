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

      // Update summary
      this.updateSummary();

      // Render table
      this.currentPage = 1;
      this.renderTable();
    } catch (error) {
      alert('Error loading expiry data: ' + error.message);
    }
  }

  updateSummary() {
    const expiredCount = this.allExpiryData.filter(emp => emp.expiryStatus === 'EXPIRED').length;
    const warningCount = this.allExpiryData.filter(emp => emp.expiryStatus === 'WARNING').length;
    const totalCount = expiredCount + warningCount;

    document.getElementById('stat-expired').textContent = expiredCount;
    document.getElementById('stat-warning').textContent = warningCount;
    document.getElementById('stat-total').textContent = totalCount;
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
    if (!this.searchQuery.trim()) {
      return this.filteredData;
    }

    const query = this.searchQuery.toLowerCase();
    return this.filteredData.filter(emp => {
      return emp.name.toLowerCase().includes(query) ||
             emp.employee_id.toLowerCase().includes(query) ||
             emp.department.toLowerCase().includes(query);
    });
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
  // This will redirect to tambah-karyawan page with pre-filled employee
  // For now, we'll use the standard Add MCU modal from tambah-karyawan.js
  alert(`Akan membuka form Add MCU untuk ${employeeName}`);
  // TODO: Implement modal or redirect
};

// Initialize page
page.initialize();
