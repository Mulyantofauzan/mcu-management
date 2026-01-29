/**
 * Top Abnormalities Chart Component
 * Displays top abnormalities as Bar Chart or List View (user can switch)
 *
 * Features:
 * - Bar Chart visualization with Chart.js
 * - List View with ranking
 * - Switch between Bar and List views
 * - Configurable display limit (5, 10, 15, 20)
 * - Responsive to dashboard filters
 * - Category color coding
 */

import abnormalitiesService from '../services/abnormalitiesService.js';
import { showToast } from '../utils/uiHelpers.js';

// ChartDataLabels is loaded via CDN in dashboard.html
const ChartDataLabels = window.ChartDataLabels || {};

class TopAbnormalitiesChart {
  constructor() {
    this.chart = null;
    this.data = [];
    this.currentView = 'bar'; // 'bar' or 'list'
    this.limit = 10; // Default top 10
    this.containerId = 'top-abnormalities-container';
    this.filteredMCUs = []; // Store filtered MCUs for dropdown updates
  }

  /**
   * Get category color based on abnormality type
   */
  getCategoryColor(category) {
    const colors = {
      'Lab Results': '#3b82f6',      // Blue
      'Hypertension': '#ef4444',     // Red
      'Obesity': '#f97316',          // Orange
      'Vision Defect': '#6366f1'     // Indigo
    };
    return colors[category] || '#9ca3af';
  }

  /**
   * Get category background color (lighter)
   */
  getCategoryBgColor(category) {
    const colors = {
      'Lab Results': 'rgba(59, 130, 246, 0.1)',      // Blue
      'Hypertension': 'rgba(239, 68, 68, 0.1)',      // Red
      'Obesity': 'rgba(249, 115, 34, 0.1)',          // Orange
      'Vision Defect': 'rgba(99, 102, 241, 0.1)'     // Indigo
    };
    return colors[category] || 'rgba(156, 163, 175, 0.1)';
  }

  /**
   * Render bar chart
   */
  renderBarChart(container) {
    if (!this.data || this.data.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada data abnormalities</p>';
      return;
    }

    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const canvasId = 'top-abnormalities-bar-chart';
    const existingCanvas = container.querySelector(`#${canvasId}`);
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    container.innerHTML = '';
    container.appendChild(canvas);

    // Prepare data for Chart.js
    const labels = this.data.map(item => {
      // Truncate long names for display
      const name = item.name.substring(0, 40);
      return name.length < item.name.length ? name + '...' : name;
    });

    const values = this.data.map(item => item.count);
    // Use single color for all bars
    const barColor = '#3b82f6'; // Blue
    const barBgColor = 'rgba(59, 130, 246, 0.7)'; // Semi-transparent blue

    // Create chart
    const ctx = canvas.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Jumlah Kasus',
          data: values,
          backgroundColor: barBgColor,
          borderColor: barColor,
          borderWidth: 2,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', // Horizontal bar chart
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          datalabels: {
            anchor: 'end',
            align: 'right',
            offset: -25,
            color: '#ffffff',
            font: {
              weight: 'bold',
              size: 13
            },
            formatter: function(value) {
              return value;
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.x} kasus`;
              },
              afterLabel: function(context) {
                const item = this.chart.data.items?.[context.dataIndex];
                return item ? `Tipe: ${item.type}` : '';
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });

    // Store reference to data for tooltip
    this.chart.data.items = this.data;
  }

  /**
   * Render list view
   */
  renderListView(container) {
    if (!this.data || this.data.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada data abnormalities</p>';
      return;
    }

    let html = `
      <div class="space-y-3">
        ${this.data.map((item, index) => {
          const categoryColor = this.getCategoryColor(item.category);
          const categoryBgColor = this.getCategoryBgColor(item.category);

          return `
            <div class="flex items-center gap-3 p-4 rounded-lg border-l-4" style="border-color: ${categoryColor}; background-color: ${categoryBgColor}">
              <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" style="background-color: ${categoryColor}">
                ${index + 1}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate" title="${item.name}">${item.name}</p>
                <p class="text-xs text-gray-500">Kategori: ${item.category}</p>
              </div>
              <div class="flex-shrink-0 text-right">
                <p class="text-lg font-bold text-gray-900">${item.count}</p>
                <p class="text-xs text-gray-500">kasus</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Render the complete component
   */
  async render(filteredMCUs, options = {}) {
    try {
      // Get options
      const limit = options.limit || this.limit;
      const view = options.view || this.currentView;

      this.limit = limit;
      this.currentView = view;
      this.filteredMCUs = filteredMCUs; // Store for dropdown updates

      // Get abnormalities data
      this.data = await abnormalitiesService.getTopAbnormalities(
        filteredMCUs,
        {
          limit: limit,
          includeTypes: ['lab', 'mcu']
        }
      );

      // Get main container
      let container = document.getElementById(this.containerId);
      if (!container) {
        return; // Container not found
      }

      // Build HTML structure
      const summaryStats = await abnormalitiesService.getAbnormalitiesSummary(filteredMCUs);

      let html = `
        <div class="bg-white rounded-lg shadow p-6">
          <!-- Header with title and controls -->
          <div class="flex items-center justify-between mb-6 pb-4 border-b">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Top ${limit} Penyakit Komorbid berdasarkan hasil MCU</h3>
              <p class="text-sm text-gray-500 mt-1">
                Total: ${summaryStats.totalConditions} kondisi, ${summaryStats.totalOccurrences} kasus
              </p>
            </div>

            <!-- Control buttons -->
            <div class="flex items-center gap-4">
              <!-- Limit selector -->
              <select id="abnormalities-limit" class="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <option value="5" ${limit === 5 ? 'selected' : ''}>Top 5</option>
                <option value="10" ${limit === 10 ? 'selected' : ''}>Top 10</option>
                <option value="15" ${limit === 15 ? 'selected' : ''}>Top 15</option>
                <option value="20" ${limit === 20 ? 'selected' : ''}>Top 20</option>
              </select>

              <!-- View toggle buttons -->
              <div class="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button id="abnormalities-bar-btn" class="px-3 py-2 rounded font-medium transition-colors ${view === 'bar' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}">
                  📊 Chart
                </button>
                <button id="abnormalities-list-btn" class="px-3 py-2 rounded font-medium transition-colors ${view === 'list' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}">
                  📋 List
                </button>
              </div>
            </div>
          </div>

          <!-- Chart/List container -->
          <div id="abnormalities-content" style="min-height: 300px;">
            <!-- Content will be rendered here -->
          </div>

          <!-- Summary cards -->
          <div class="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-xs text-blue-600 font-medium">Total Kondisi</p>
              <p class="text-2xl font-bold text-blue-900">${summaryStats.totalConditions}</p>
            </div>
            <div class="bg-indigo-50 p-4 rounded-lg">
              <p class="text-xs text-indigo-600 font-medium">Total Kasus</p>
              <p class="text-2xl font-bold text-indigo-900">${summaryStats.totalOccurrences}</p>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg">
              <p class="text-xs text-purple-600 font-medium">Paling Umum</p>
              <p class="text-sm font-bold text-purple-900 truncate" title="${summaryStats.mostCommon?.name || '-'}">
                ${summaryStats.mostCommon?.name ? summaryStats.mostCommon.name.substring(0, 20) : '-'}
              </p>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Render content based on view
      const contentContainer = document.getElementById('abnormalities-content');
      if (view === 'bar') {
        this.renderBarChart(contentContainer);
      } else {
        this.renderListView(contentContainer);
      }

      // Add event listeners
      this.attachEventListeners();

    } catch (error) {
      const container = document.getElementById(this.containerId);
      if (container) {
        const errorDetails = error?.stack || error?.toString() || 'Unknown error';
        const errorMsg = error?.message || 'Unknown error';
        container.innerHTML = `<div class="text-red-600 p-4">
          <p><strong>Error loading abnormalities:</strong> ${errorMsg}</p>
          <details style="margin-top: 8px; font-size: 12px; color: #666;">
            <summary>Details</summary>
            <pre style="background: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto; max-width: 400px;">${errorDetails}</pre>
          </details>
        </div>`;
      }
    }
  }

  /**
   * Attach event listeners for controls
   */
  attachEventListeners() {
    // Limit selector
    const limitSelect = document.getElementById('abnormalities-limit');
    if (limitSelect) {
      limitSelect.addEventListener('change', (e) => {
        this.limit = parseInt(e.target.value);
        window.topAbnormalitiesChartInstance?.updateView(this.filteredMCUs);
      });
    }

    // View toggle buttons
    const barBtn = document.getElementById('abnormalities-bar-btn');
    const listBtn = document.getElementById('abnormalities-list-btn');

    if (barBtn) {
      barBtn.addEventListener('click', () => {
        this.currentView = 'bar';
        this.updateViewToggle();
        this.renderView();
      });
    }

    if (listBtn) {
      listBtn.addEventListener('click', () => {
        this.currentView = 'list';
        this.updateViewToggle();
        this.renderView();
      });
    }
  }

  /**
   * Update view toggle buttons styling
   */
  updateViewToggle() {
    const barBtn = document.getElementById('abnormalities-bar-btn');
    const listBtn = document.getElementById('abnormalities-list-btn');

    if (barBtn) {
      if (this.currentView === 'bar') {
        barBtn.classList.add('bg-white', 'text-blue-600', 'shadow');
        barBtn.classList.remove('text-gray-600', 'hover:text-gray-900');
      } else {
        barBtn.classList.remove('bg-white', 'text-blue-600', 'shadow');
        barBtn.classList.add('text-gray-600', 'hover:text-gray-900');
      }
    }

    if (listBtn) {
      if (this.currentView === 'list') {
        listBtn.classList.add('bg-white', 'text-blue-600', 'shadow');
        listBtn.classList.remove('text-gray-600', 'hover:text-gray-900');
      } else {
        listBtn.classList.remove('bg-white', 'text-blue-600', 'shadow');
        listBtn.classList.add('text-gray-600', 'hover:text-gray-900');
      }
    }
  }

  /**
   * Render just the chart/list content (when switching views)
   */
  renderView() {
    const contentContainer = document.getElementById('abnormalities-content');
    if (!contentContainer) return;

    if (this.currentView === 'bar') {
      this.renderBarChart(contentContainer);
    } else {
      this.renderListView(contentContainer);
    }
  }

  /**
   * Update the chart with new data (called when filters change)
   */
  async updateView(filteredMCUs, options = {}) {
    await this.render(filteredMCUs, {
      ...options,
      limit: this.limit,
      view: this.currentView
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

// Create and export singleton instance
export const topAbnormalitiesChartInstance = new TopAbnormalitiesChart();

export default TopAbnormalitiesChart;
