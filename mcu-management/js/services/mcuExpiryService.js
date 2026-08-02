/**
 * MCU Expiry Service
 * Handles calculation of MCU expiry status and provides data for expiry management
 */

import { analyticsEligibilityService } from './analyticsEligibilityService.js';

class MCUExpiryService {
  constructor() {
    this.warningPeriodDays = 60; // 60 days before expiry
    this.allEmployeesMCU = [];
  }

  /**
   * Load all employees with their latest MCU data
   */
  async loadEmployeesWithMCU() {
    try {
      const employeesMCUData = await analyticsEligibilityService.getExpiryOverview();

      // Always update cache with fresh data
      this.allEmployeesMCU = employeesMCUData;

      return employeesMCUData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invalidate cache to force fresh data load on next call
   */
  invalidateCache() {
    this.allEmployeesMCU = [];
  }

  /**
   * Get expired and warning MCU list from cache
   * Note: Ensure loadEmployeesWithMCU() is called first
   */
  getExpiryList() {
    return this.allEmployeesMCU.filter(item => {
      return item.expiryStatus === 'EXPIRED' || item.expiryStatus === 'WARNING';
    });
  }

  /**
   * Get count of expired MCUs from cache
   * Note: Ensure loadEmployeesWithMCU() is called first
   */
  getExpiredCount() {
    if (!Array.isArray(this.allEmployeesMCU) || this.allEmployeesMCU.length === 0) {
      return 0;
    }
    return this.allEmployeesMCU.filter(item => item.expiryStatus === 'EXPIRED').length;
  }

  /**
   * Get count of warning MCUs from cache
   * Note: Ensure loadEmployeesWithMCU() is called first
   */
  getWarningCount() {
    if (!Array.isArray(this.allEmployeesMCU) || this.allEmployeesMCU.length === 0) {
      return 0;
    }
    return this.allEmployeesMCU.filter(item => item.expiryStatus === 'WARNING').length;
  }

  /**
   * Get total expiry and warning count
   * Note: Ensure loadEmployeesWithMCU() is called first
   */
  getTotalExpiryCount() {
    return this.getExpiredCount() + this.getWarningCount();
  }

  /**
   * Format date to readable format (dd/mm/yyyy)
   */
  formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Get status badge styling
   */
  getStatusBadge(status) {
    const badges = {
      'EXPIRED': { color: 'bg-red-100', text: 'text-red-800', label: 'EXPIRED' },
      'WARNING': { color: 'bg-yellow-100', text: 'text-yellow-800', label: 'WARNING' },
      'OK': { color: 'bg-green-100', text: 'text-green-800', label: 'OK' },
      'NO_MCU': { color: 'bg-gray-100', text: 'text-gray-800', label: 'NO MCU' }
    };
    return badges[status] || badges['NO_MCU'];
  }
}

// Create singleton instance
const mcuExpiryService = new MCUExpiryService();

export { mcuExpiryService };
