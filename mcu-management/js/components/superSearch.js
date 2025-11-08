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
    this.searchTimeout = null;
    this.allEmployees = [];
    this.allMCURecords = [];
    this.searchResults = [];
    this.currentResultIndex = 0;
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('super-search-modal');
    this.input = document.getElementById('super-search-input');
    this.resultsList = document.getElementById('super-search-results');

    // Event listeners
    this.input.addEventListener('input', (e) => this.handleSearch(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
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
        const mcuData = this.allMCURecords.find(m => m.employeeId === emp.id);
        this.searchResults.push({
          type: 'employee',
          employee: emp,
          mcu: mcuData,
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
      const { employee, mcu, isDeleted } = result;
      const deletedBadge = isDeleted ? '<span class="ml-2 inline-block px-2 py-1 text-xs font-semibold text-danger bg-danger-light rounded">TERHAPUS</span>' : '';
      const mcuStatus = mcu ? `<span class="text-xs text-gray-600">${mcu.mcuStatus}</span>` : '<span class="text-xs text-gray-400">Belum Ada MCU</span>';

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
   * Navigate to result
   */
  navigateToResult(result) {
    const { employee, isDeleted } = result;

    // Determine target page based on deleted status
    if (isDeleted) {
      // Go to Data Terhapus page and scroll to employee
      window.location.href = `./pages/data-terhapus.html?highlight=${employee.id}`;
    } else {
      // Go to Kelola Karyawan and scroll to employee
      window.location.href = `./pages/kelola-karyawan.html?highlight=${employee.id}`;
    }

    this.close();
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
