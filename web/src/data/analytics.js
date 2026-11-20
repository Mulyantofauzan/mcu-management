/* Model analitik dari view database: satu MCU terkini per karyawan aktif. */
import { selectAll } from './client.js';
import { transformEmployee, transformMcu } from './transform.js';

export async function getCurrentModels() {
  const rows = await selectAll('v_analytics_eligible_current', query => query.order('employee_id'));
  return rows.map(row => ({
    employee: transformEmployee(row.employee),
    mcu: transformMcu(row.mcu),
    expiryDate: row.expiry_date,
    expiryMonths: row.expiry_months
  }));
}

export async function getExpiryOverview() {
  const rows = await selectAll('v_mcu_expiry_overview', query => query.order('employee_id'));
  return rows.map(row => ({
    employeeId: row.employee_id,
    name: row.name,
    department: row.department || 'N/A',
    jobTitle: row.job_title || 'N/A',
    lastMcuDate: row.last_mcu_date,
    expiryDate: row.expiry_date,
    daysLeft: row.days_left,
    expiryStatus: row.expiry_status
  }));
}
