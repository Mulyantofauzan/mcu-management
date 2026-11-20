/* Tambah karyawan baru dan cari karyawan. Aturan sama dengan employeeService.create/search lama. */
import { getClient } from './client.js';
import { logActivity } from './activityWrite.js';
import { listEmployees } from './employees.js';
import { generateEmployeeId } from '../lib/ids.js';

export async function searchEmployees(term) {
  const wanted = term.trim().toLowerCase();
  const all = await listEmployees({ includeInactive: true });
  return all.filter(employee => String(employee.name).toLowerCase().includes(wanted) || String(employee.employeeId).toLowerCase().includes(wanted));
}

export async function findEmployee(employeeId) {
  const all = await listEmployees({ includeInactive: true });
  return all.find(employee => employee.employeeId === employeeId) || null;
}

export function toNewEmployeeRow(form, employeeId) {
  return {
    employee_id: employeeId,
    name: form.name,
    jenis_kelamin: form.gender || 'Laki-laki',
    job_title: form.jobTitle,
    department: form.department,
    date_of_birth: form.birthDate,
    blood_type: form.bloodType,
    employee_type: form.employeeType || 'Karyawan PST',
    vendor_name: form.vendorName || null,
    is_active: form.isActive !== false,
    inactive_reason: form.isActive === false ? form.inactiveReason || null : null
  };
}

export async function createEmployee(form, user) {
  const client = await getClient();
  const row = toNewEmployeeRow(form, generateEmployeeId());
  const { error } = await client.from('employees').insert(row);
  if (error) throw error;
  const details = [
    `Created employee: ${row.name}`, `Employee ID: ${row.employee_id}`, `Department: ${row.department || 'Not Set'}`,
    `Job Title: ${row.job_title || 'Not Set'}`, `Employment Status: ${row.employee_type}`, `Date of Birth: ${row.date_of_birth}`,
    `Blood Type: ${row.blood_type || 'Not Set'}`
  ].join('. ');
  await logActivity({ action: 'create', target: 'Employee', targetId: row.employee_id, user, details }).catch(() => {});
  return findEmployee(row.employee_id);
}
