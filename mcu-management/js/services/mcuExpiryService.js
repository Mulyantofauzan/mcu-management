/**
 * MCU Expiry Service
 * Handles calculation of MCU expiry status and provides data for expiry management
 */

import { supabase } from '../config/supabase.js';

class MCUExpiryService {
  constructor() {
    this.expiryPeriodDays = 365; // 1 year
    this.warningPeriodDays = 60; // 60 days before expiry
    this.allEmployeesMCU = [];
  }

  /**
   * Load all employees with their latest MCU data
   */
  async loadEmployeesWithMCU() {
    try {
      // Get all employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (empError) throw empError;

      // Get all MCUs
      const { data: mcus, error: mcuError } = await supabase
        .from('mcus')
        .select('*')
        .is('deleted_at', null)
        .order('mcu_date', { ascending: false });

      if (mcuError) throw mcuError;

      // Get departments and jobs
      const { data: departments } = await supabase.from('departments').select('*');
      const { data: jobTitles } = await supabase.from('job_titles').select('*');

      // Create map of latest MCU per employee
      const latestMCUPerEmployee = {};
      mcus.forEach(mcu => {
        if (!latestMCUPerEmployee[mcu.employee_id]) {
          latestMCUPerEmployee[mcu.employee_id] = mcu;
        }
      });

      // Build employee data with MCU info
      this.allEmployeesMCU = employees.map(emp => {
        const latestMCU = latestMCUPerEmployee[emp.employee_id];
        const dept = departments?.find(d => d.name === emp.department);
        const job = jobTitles?.find(j => j.name === emp.job_title);

        // Calculate expiry status
        let expiryStatus = 'NO_MCU';
        let daysLeft = null;
        let expiryDate = null;

        if (latestMCU && latestMCU.mcu_date) {
          expiryDate = new Date(latestMCU.mcu_date);
          expiryDate.setDate(expiryDate.getDate() + this.expiryPeriodDays);

          const today = new Date();
          const timeDiff = expiryDate - today;
          daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

          if (daysLeft < 0) {
            expiryStatus = 'EXPIRED';
          } else if (daysLeft <= this.warningPeriodDays) {
            expiryStatus = 'WARNING';
          } else {
            expiryStatus = 'OK';
          }
        }

        return {
          employee_id: emp.employee_id,
          name: emp.name,
          department: emp.department || 'N/A',
          job_title: emp.job_title || 'N/A',
          lastMCUDate: latestMCU?.mcu_date ? new Date(latestMCU.mcu_date) : null,
          expiryDate: expiryDate,
          daysLeft: daysLeft,
          expiryStatus: expiryStatus,
          latestMCU: latestMCU
        };
      });

      return this.allEmployeesMCU;
    } catch (error) {
      console.error('Error loading employees with MCU:', error);
      throw error;
    }
  }

  /**
   * Get expired and warning MCU list
   */
  getExpiryList() {
    return this.allEmployeesMCU.filter(item => {
      return item.expiryStatus === 'EXPIRED' || item.expiryStatus === 'WARNING';
    });
  }

  /**
   * Get count of expired MCUs
   */
  getExpiredCount() {
    return this.allEmployeesMCU.filter(item => item.expiryStatus === 'EXPIRED').length;
  }

  /**
   * Get count of warning MCUs
   */
  getWarningCount() {
    return this.allEmployeesMCU.filter(item => item.expiryStatus === 'WARNING').length;
  }

  /**
   * Get total expiry and warning count
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
