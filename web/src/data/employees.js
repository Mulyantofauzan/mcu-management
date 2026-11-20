/* Karyawan: baca, ubah, hapus (soft delete bertingkat ke MCU dan berkas). Aturan sama dengan employeeService lama. */
import { getClient, selectAll } from './client.js';
import { transformEmployee, transformMcu } from './transform.js';
import { logActivity } from './activityWrite.js';

export async function listEmployees({ includeInactive = false } = {}) {
  const rows = await selectAll('employees', query => query.is('deleted_at', null).order('created_at', { ascending: false }));
  const employees = rows.map(transformEmployee);
  return includeInactive ? employees : employees.filter(employee => employee.isActive);
}

export async function listEmployeeMcus(employeeId) {
  const rows = await selectAll('mcus', query => query.eq('employee_id', employeeId).is('deleted_at', null).order('mcu_date', { ascending: false }));
  return rows.map(transformMcu);
}

/* Form -> kolom database. Hanya nama jabatan dan departemen yang disimpan, seperti aplikasi lama. */
export function toEmployeeRow(form) {
  return {
    name: form.name,
    jenis_kelamin: form.gender,
    job_title: form.jobTitle,
    department: form.department,
    date_of_birth: form.birthDate,
    blood_type: form.bloodType,
    employee_type: form.employeeType,
    vendor_name: form.vendorName || null,
    is_active: form.isActive,
    inactive_reason: form.isActive ? null : form.inactiveReason || null,
    updated_at: new Date().toISOString()
  };
}

export async function updateEmployee(employeeId, form, user) {
  const client = await getClient();
  const row = toEmployeeRow(form);
  const { error } = await client.from('employees').update(row).eq('employee_id', employeeId).select().single();
  if (error) throw error;
  await logActivity({ action: 'update', target: 'Employee', targetId: employeeId, user, details: `Updated employee ${form.name} (${employeeId}). Fields: ${Object.keys(form).join(', ')}` })
    .catch(() => {});
  return true;
}

export async function softDeleteEmployee(employeeId, employeeName, user) {
  const client = await getClient();
  const now = new Date().toISOString();

  const employee = await client.from('employees').update({ deleted_at: now }).eq('employee_id', employeeId);
  if (employee.error) throw employee.error;

  const mcus = await client.from('mcus').update({ deleted_at: now }).eq('employee_id', employeeId).is('deleted_at', null).select('mcu_id');
  if (mcus.error) throw mcus.error;
  const mcuIds = (mcus.data || []).map(row => row.mcu_id);

  let fileCount = 0;
  if (mcuIds.length) {
    const files = await client.from('mcufiles').update({ deletedat: now }).in('mcuid', mcuIds).is('deletedat', null).select('fileid');
    if (files.error) throw files.error;
    fileCount = (files.data || []).length;
  }

  await logActivity({
    action: 'delete', target: 'Employee', targetId: employeeId, user,
    details: `Moved to trash: ${employeeName || 'Unknown'} (${employeeId}). Associated ${mcuIds.length} MCU records and ${fileCount} files also moved to trash.`
  }).catch(() => {});
  return { mcus: mcuIds.length, files: fileCount };
}
