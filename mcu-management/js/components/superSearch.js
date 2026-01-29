/**
 * Super Search Component
 * Global employee search across active and deleted records
 * Accessible from anywhere in the application via Ctrl+K or Cmd+K
 */

import { database } from '../services/database.js';
import { logger } from '../utils/logger.js';

class SuperSearch {
  constructor() {
    this.modal = null;
    this.input = null;
    this.resultsList = null;
    this.detailModal = null;
    this.searchTimeout = null;
    this.allEmployees = [];
    this.allMCURecords = [];
    this.searchResults = [];
    this.currentResultIndex = 0;
    this.selectedEmployee = null;
  }

  /**
   * Initialize super search
   * Loads all employees and MCU records for searching
   */
  async init() {
    try {
      // Load all employees (including deleted) - use getAll instead of query
      const employees = await database.getAll('employees', true); // true = include deleted
      this.allEmployees = Array.isArray(employees) ? employees : [];

      // Load all MCU records - use getAll instead of query (correct table name: 'mcus')
      const mcuRecords = await database.getAll('mcus');
      this.allMCURecords = Array.isArray(mcuRecords) ? mcuRecords : [];

      this.createModal();
      this.attachKeyboardShortcut();
      logger.info(`Super Search initialized with ${this.allEmployees.length} employees and ${this.allMCURecords.length} MCU records`);
    } catch (error) {
      logger.error('Failed to initialize Super Search:', error);
    }
  }

  /**
   * Create search modal HTML structure
   */
  createModal() {
    const modalHTML = `
      <div id="super-search-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-start justify-center pt-16 backdrop-blur-sm">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4">
          <!-- Search Input -->
          <div class="flex items-center px-6 py-4 border-b border-gray-200">
            <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              id="super-search-input"
              placeholder="Cari karyawan (nama, ID, email, telepon)... Tekan ESC untuk tutup"
              class="flex-1 outline-none text-sm"
              autocomplete="off"
            />
            <span class="text-xs text-gray-400 ml-4">Tekan <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">ESC</kbd></span>
          </div>

          <!-- Results List -->
          <div id="super-search-results" class="max-h-96 overflow-y-auto">
            <div class="px-6 py-8 text-center text-gray-500">
              <p>Mulai ketik untuk mencari karyawan...</p>
            </div>
          </div>

          <!-- Search Info -->
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
            <p>💡 Tips: Cari berdasarkan nama, ID karyawan, email, atau nomor telepon</p>
          </div>
        </div>
      </div>
    `;

    // Detail Modal HTML
    const detailModalHTML = `
      <div id="super-search-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 backdrop-blur-sm" style="z-index: 9999;">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <!-- Detail Header -->
          <div class="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div>
              <h2 id="detail-employee-name" class="text-xl font-bold text-gray-900"></h2>
              <p id="detail-employee-id" class="text-sm text-gray-600"></p>
            </div>
            <button id="detail-close-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Detail Content -->
          <div class="px-6 py-6 space-y-6">
            <!-- Employee Header Info -->
            <div class="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p class="text-xs text-gray-600">Jabatan</p>
                <p id="detail-position" class="font-semibold text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-600">Departemen</p>
                <p id="detail-department" class="font-semibold text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-600">Tanggal Lahir</p>
                <p id="detail-dob" class="font-semibold text-gray-900">-</p>
              </div>
              <div>
                <p class="text-xs text-gray-600">Golongan Darah</p>
                <p id="detail-blood-type" class="font-semibold text-gray-900">-</p>
              </div>
            </div>

            <!-- MCU Records Table Section -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Riwayat MCU</h3>
              <div id="detail-mcu-records" class="border border-gray-200 rounded-lg overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">ID MCU</th>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">Tanggal</th>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">Jenis</th>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">Hasil</th>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th class="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="detail-mcu-table-body">
                    <tr>
                      <td colspan="6" class="px-4 py-6 text-center text-gray-500">Tidak ada data MCU</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4 border-t border-gray-200">
              <button id="detail-edit-btn" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                Edit Karyawan
              </button>
              <button id="detail-mcu-list-btn" class="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium">
                Lihat Semua MCU
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.insertAdjacentHTML('beforeend', detailModalHTML);

    this.modal = document.getElementById('super-search-modal');
    this.input = document.getElementById('super-search-input');
    this.resultsList = document.getElementById('super-search-results');
    this.detailModal = document.getElementById('super-search-detail-modal');

    // Event listeners
    this.input.addEventListener('input', (e) => this.handleSearch(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Detail modal listeners
    document.getElementById('detail-close-btn').addEventListener('click', () => this.closeDetail());
    this.detailModal.addEventListener('click', (e) => {
      if (e.target === this.detailModal) this.closeDetail();
    });

    document.getElementById('detail-edit-btn').addEventListener('click', () => {
      if (this.selectedEmployee) {
        if (this.selectedEmployee.deletedAt) {
          window.location.href = `./pages/data-terhapus.html?highlight=${this.selectedEmployee.id}`;
        } else {
          window.location.href = `./pages/kelola-karyawan.html?highlight=${this.selectedEmployee.id}`;
        }
      }
    });

    document.getElementById('detail-mcu-list-btn').addEventListener('click', () => {
      if (this.selectedEmployee) {
        window.location.href = `./pages/analysis.html?employee=${this.selectedEmployee.id}`;
      }
    });
  }

  /**
   * Attach keyboard shortcut (Ctrl+K or Cmd+K)
   */
  attachKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && this.modal.classList.contains('flex')) {
        this.close();
      }
    });
  }

  /**
   * Open search modal
   */
  open() {
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    this.input.focus();
  }

  /**
   * Close search modal
   */
  close() {
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
    this.input.value = '';
    this.resultsList.innerHTML = '<div class="px-6 py-8 text-center text-gray-500"><p>Mulai ketik untuk mencari karyawan...</p></div>';
    this.currentResultIndex = 0;
  }

  /**
   * Handle search input
   */
  handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    clearTimeout(this.searchTimeout);

    if (!query) {
      this.resultsList.innerHTML = '<div class="px-6 py-8 text-center text-gray-500"><p>Mulai ketik untuk mencari karyawan...</p></div>';
      this.searchResults = [];
      this.currentResultIndex = 0;
      return;
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  /**
   * Perform search across employees and MCU records
   */
  performSearch(query) {
    this.searchResults = [];

    // Search in employees
    this.allEmployees.forEach(emp => {
      const matchScore = this.calculateMatchScore(emp, query);
      if (matchScore > 0) {
        // Get the most recent MCU for this employee (not just first one)
        const employeeMCUs = this.allMCURecords.filter(m => m.employeeId === emp.id || m.employee_id === emp.id);
        let mcuData = null;
        if (employeeMCUs.length > 0) {
          // Sort by date and get most recent
          mcuData = employeeMCUs.sort((a, b) => {
            const dateA = new Date(a.mcuDate || a.mcu_date || 0);
            const dateB = new Date(b.mcuDate || b.mcu_date || 0);
            return dateB - dateA;
          })[0];
        }

        this.searchResults.push({
          type: 'employee',
          employee: emp,
          mcu: mcuData,
          mcuCount: employeeMCUs.length,
          matchScore: matchScore,
          isDeleted: emp.deletedAt ? true : false
        });
      }
    });

    // Sort by match score
    this.searchResults.sort((a, b) => b.matchScore - a.matchScore);

    // Display results
    this.displayResults();
  }

  /**
   * Calculate match score for employee
   */
  calculateMatchScore(employee, query) {
    let score = 0;

    const { name = '', employeeId = '', email = '', phoneNumber = '', department = '', status = '' } = employee;

    // Exact matches get highest score
    if (name.toLowerCase() === query) score += 100;
    if (employeeId.toLowerCase() === query) score += 100;

    // Starts with query
    if (name.toLowerCase().startsWith(query)) score += 50;
    if (employeeId.toLowerCase().startsWith(query)) score += 50;

    // Contains query
    if (name.toLowerCase().includes(query)) score += 20;
    if (employeeId.toLowerCase().includes(query)) score += 20;
    if (email.toLowerCase().includes(query)) score += 15;
    if (phoneNumber.includes(query)) score += 10;
    if (department.toLowerCase().includes(query)) score += 5;
    if (status.toLowerCase().includes(query)) score += 3;

    return score;
  }

  /**
   * Display search results
   */
  displayResults() {
    if (this.searchResults.length === 0) {
      this.resultsList.innerHTML = '<div class="px-6 py-8 text-center text-gray-500"><p>Tidak ada hasil ditemukan</p></div>';
      return;
    }

    let html = '<div class="divide-y divide-gray-200">';

    this.searchResults.forEach((result, index) => {
      const { employee, mcu, mcuCount, isDeleted } = result;
      const deletedBadge = isDeleted ? '<span class="ml-2 inline-block px-2 py-1 text-xs font-semibold text-danger bg-danger-light rounded">TERHAPUS</span>' : '';

      let mcuStatus = '<span class="text-xs text-gray-400">Belum Ada MCU</span>';
      if (mcuCount && mcuCount > 0) {
        const statusBadgeColor = mcu?.mcuStatus === 'Complete' || mcu?.mcuStatus === 'Completed'
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800';
        mcuStatus = `<span class="text-xs font-semibold px-2 py-1 rounded ${statusBadgeColor}">${mcu?.mcuStatus || 'Pending'} (${mcuCount})</span>`;
      }

      html += `
        <div class="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors result-item" data-index="${index}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-gray-900">${this.escapeHtml(employee.name || 'N/A')}</h3>
                ${deletedBadge}
              </div>
              <div class="mt-1 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-600">ID Karyawan: <span class="font-mono text-gray-900">${this.escapeHtml(employee.employeeId || '-')}</span></p>
                  <p class="text-gray-600">Email: <span class="text-gray-900">${this.escapeHtml(employee.email || '-')}</span></p>
                </div>
                <div>
                  <p class="text-gray-600">Departemen: <span class="text-gray-900">${this.escapeHtml(employee.department || '-')}</span></p>
                  <p class="text-gray-600">Telepon: <span class="text-gray-900">${this.escapeHtml(employee.phoneNumber || '-')}</span></p>
                </div>
              </div>
              <div class="mt-2">
                <p class="text-gray-600">MCU Status: ${mcuStatus}</p>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      `;
    });

    html += '</div>';
    this.resultsList.innerHTML = html;

    // Add click handlers
    document.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.navigateToResult(this.searchResults[index]);
      });
    });
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(e) {
    if (e.key === 'Enter' && this.searchResults.length > 0) {
      e.preventDefault();
      this.navigateToResult(this.searchResults[this.currentResultIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.currentResultIndex = (this.currentResultIndex + 1) % this.searchResults.length;
      this.updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.currentResultIndex = (this.currentResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
      this.updateHighlight();
    }
  }

  /**
   * Update highlighted result
   */
  updateHighlight() {
    document.querySelectorAll('.result-item').forEach((item, index) => {
      if (index === this.currentResultIndex) {
        item.classList.add('bg-primary-50');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-primary-50');
      }
    });
  }

  /**
   * Navigate to result - show detail view instead of redirecting
   */
  navigateToResult(result) {
    const { employee, mcu } = result;
    this.openDetail(employee, mcu);
  }

  /**
   * Open employee detail modal
   */
  openDetail(employee, mcu) {
    this.selectedEmployee = employee;

    // Populate employee info
    document.getElementById('detail-employee-name').textContent = employee.name || 'N/A';
    document.getElementById('detail-employee-id').textContent = `ID: ${employee.employeeId || '-'}`;
    document.getElementById('detail-department').textContent = employee.department || '-';
    document.getElementById('detail-position').textContent = employee.jobTitle || '-';

    // Format DOB
    if (employee.dateOfBirth) {
      const dob = new Date(employee.dateOfBirth);
      document.getElementById('detail-dob').textContent = dob.toLocaleDateString('id-ID');
    } else {
      document.getElementById('detail-dob').textContent = '-';
    }

    document.getElementById('detail-blood-type').textContent = employee.bloodType || '-';

    // Load MCU records
    this.displayMCURecords(employee.id);

    // Show detail modal, hide search modal
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
    this.detailModal.classList.remove('hidden');
    this.detailModal.classList.add('flex');
  }

  /**
   * Display MCU records for employee in detail view as table
   */
  displayMCURecords(employeeId) {
    const mcuRecords = this.allMCURecords.filter(m => m.employeeId === employeeId || m.employee_id === employeeId);
    const tbody = document.getElementById('detail-mcu-table-body');

    if (mcuRecords.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">Tidak ada data MCU</td></tr>';
      return;
    }

    // Sort by date descending
    mcuRecords.sort((a, b) => {
      const dateA = new Date(a.mcuDate || a.mcu_date || 0);
      const dateB = new Date(b.mcuDate || b.mcu_date || 0);
      return dateB - dateA;
    });

    let html = '';
    mcuRecords.forEach((mcu) => {
      const mcuId = mcu.mcuId || mcu.mcu_id || '-';
      const mcuDate = new Date(mcu.mcuDate || mcu.mcu_date);
      const mcuType = mcu.mcuType || mcu.mcu_type || 'Rutin';
      const mcuStatus = mcu.mcuStatus || mcu.mcu_status || 'Pending';
      const finalResult = mcu.finalResult || mcu.final_result || '-';

      // Determine status badge color
      let statusBgColor = 'bg-yellow-100';
      let statusTextColor = 'text-yellow-800';
      if (mcuStatus === 'Complete' || mcuStatus === 'Completed') {
        statusBgColor = 'bg-green-100';
        statusTextColor = 'text-green-800';
      }
      if (mcuStatus === 'Cancelled') {
        statusBgColor = 'bg-red-100';
        statusTextColor = 'text-red-800';
      }

      html += `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
          <td class="px-4 py-3 text-gray-900 font-mono text-xs">${this.escapeHtml(mcuId)}</td>
          <td class="px-4 py-3 text-gray-900">${mcuDate.toLocaleDateString('id-ID')}</td>
          <td class="px-4 py-3 text-gray-900">${mcuType}</td>
          <td class="px-4 py-3 text-gray-900 font-semibold">${finalResult}</td>
          <td class="px-4 py-3">
            <span class="inline-block px-3 py-1 text-xs font-semibold rounded ${statusBgColor} ${statusTextColor}">
              ${mcuStatus}
            </span>
          </td>
          <td class="px-4 py-3 text-center">
            <button class="px-3 py-1 bg-gray-200 text-gray-900 rounded text-xs font-medium hover:bg-gray-300 transition-colors">
              Detail
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  /**
   * Close detail modal
   */
  closeDetail() {
    this.detailModal.classList.add('hidden');
    this.detailModal.classList.remove('flex');
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    this.input.focus();
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Refresh search data (call when data changes)
   */
  async refresh() {
    try {
      const employees = await database.getAll('employees', true); // true = include deleted
      this.allEmployees = Array.isArray(employees) ? employees : [];

      const mcuRecords = await database.getAll('mcus');
      this.allMCURecords = Array.isArray(mcuRecords) ? mcuRecords : [];

      logger.info('Super Search data refreshed');
    } catch (error) {
      logger.error('Failed to refresh Super Search:', error);
    }
  }
}

// Singleton instance
let superSearchInstance = null;

export async function initSuperSearch() {
  if (!superSearchInstance) {
    superSearchInstance = new SuperSearch();
    await superSearchInstance.init();
  }
  return superSearchInstance;
}

export function getSuperSearch() {
  return superSearchInstance;
}
