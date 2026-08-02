import { getSupabaseClient, supabaseReady } from '../config/supabase.js';
import { transformEmployee, transformMCU } from './databaseAdapter-transforms.js';

class AnalyticsEligibilityService {
  async fromView(view, orderColumn = 'employee_id') {
    await supabaseReady;
    const client = getSupabaseClient();
    const { data, error } = await client.from(view).select('*').order(orderColumn);
    if (error) throw error;
    return data || [];
  }

  async getCurrentData() {
    const rows = await this.fromView('v_analytics_eligible_current');
    return rows.map(row => ({
      employee: row.employee,
      mcu: row.mcu,
      expiryDate: row.expiry_date,
      expiryMonths: row.expiry_months
    }));
  }

  async getCurrentEmployees() {
    const rows = await this.getCurrentData();
    return rows.map(row => transformEmployee(row.employee));
  }

  async getCurrentModels() {
    const rows = await this.getCurrentData();
    return rows.map(row => ({
      employee: transformEmployee(row.employee),
      mcu: transformMCU(row.mcu),
      expiryDate: row.expiryDate,
      expiryMonths: row.expiryMonths
    }));
  }

  async getCurrentMCUs() {
    const rows = await this.getCurrentData();
    return rows.map(row => transformMCU(row.mcu));
  }

  async getReviewedHistoryData() {
    const rows = await this.fromView('v_reviewed_mcu_history', 'mcu_id');
    return rows
      .map(row => ({ employee: row.employee, mcu: row.mcu }))
      .sort((a, b) => new Date(b.mcu?.mcu_date || 0) - new Date(a.mcu?.mcu_date || 0));
  }

  async getReviewedHistoryMCUs() {
    const rows = await this.getReviewedHistoryData();
    return rows.map(row => transformMCU(row.mcu));
  }

  async getExpiryOverview() {
    const rows = await this.fromView('v_mcu_expiry_overview');
    return rows.map(row => ({
      employee_id: row.employee_id,
      name: row.name,
      department: row.department || 'N/A',
      job_title: row.job_title || 'N/A',
      lastMCUDate: row.last_mcu_date,
      expiryDate: row.expiry_date,
      daysLeft: row.days_left,
      expiryStatus: row.expiry_status,
      latestMCU: row.mcu_id ? { mcu_id: row.mcu_id, mcu_date: row.last_mcu_date } : null,
      expiryMonths: row.expiry_months
    }));
  }
}

export const analyticsEligibilityService = new AnalyticsEligibilityService();
