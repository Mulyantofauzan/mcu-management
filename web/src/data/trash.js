/* Data terhapus: daftar, restore bertingkat, dan hapus permanen (MCU lewat API server yang juga membersihkan R2). */
import { getClient, selectAll } from './client.js';
import { transformEmployee, transformMcu } from './transform.js';
import { logActivity } from './activityWrite.js';
import { getAccessToken } from '../lib/session.js';

export async function listDeletedEmployees() {
  const rows = await selectAll('employees', query => query.not('deleted_at', 'is', null).order('deleted_at', { ascending: false }));
  return rows.map(transformEmployee);
}

export async function listDeletedMcus() {
  const rows = await selectAll('mcus', query => query.not('deleted_at', 'is', null).order('deleted_at', { ascending: false }));
  const mcus = rows.map(transformMcu);
  const ids = [...new Set(mcus.map(mcu => mcu.employeeId))];
  const owners = ids.length ? await selectAll('employees', query => query.in('employee_id', ids)) : [];
  const names = new Map(owners.map(row => [row.employee_id, row.name]));
  return mcus.map(mcu => ({ ...mcu, employeeName: names.get(mcu.employeeId) || 'Unknown' }));
}

export async function restoreEmployee(employee, user) {
  const client = await getClient();
  const now = new Date().toISOString();
  const restored = await client.from('employees').update({ deleted_at: null, updated_at: now }).eq('employee_id', employee.employeeId);
  if (restored.error) throw restored.error;
  const mcus = await client.from('mcus').update({ deleted_at: null, updated_at: now }).eq('employee_id', employee.employeeId).not('deleted_at', 'is', null).select('mcu_id');
  if (mcus.error) throw mcus.error;
  const mcuIds = (mcus.data || []).map(row => row.mcu_id);
  let fileCount = 0;
  if (mcuIds.length) {
    const files = await client.from('mcufiles').update({ deletedat: null }).in('mcuid', mcuIds).not('deletedat', 'is', null).select('fileid');
    if (files.error) throw files.error;
    fileCount = (files.data || []).length;
  }
  await logActivity({
    action: 'update', target: 'Employee', targetId: employee.employeeId, user,
    details: `Restored from trash: ${employee.name || 'Unknown'} (${employee.employeeId}). Associated ${mcuIds.length} MCU records and ${fileCount} files also restored.`
  }).catch(() => {});
  return { mcus: mcuIds.length, files: fileCount };
}

export async function restoreMcu(mcuId) {
  const client = await getClient();
  const { error } = await client.from('mcus').update({ deleted_at: null, updated_at: new Date().toISOString() }).eq('mcu_id', mcuId);
  if (error) throw error;
  return true;
}

async function callPermanentDelete(mcuId) {
  const token = getAccessToken();
  const response = await fetch(`/api/permanently-delete-mcu?mcuId=${encodeURIComponent(mcuId)}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(result.error || `Hapus permanen gagal (HTTP ${response.status})`);
  return result;
}

export async function permanentDeleteMcu(mcuId, user) {
  await callPermanentDelete(mcuId);
  await logActivity({ action: 'delete', target: 'MCU', targetId: mcuId, user, details: `Permanently deleted MCU via server API: ${mcuId}` }).catch(() => {});
  return true;
}

/* Semua MCU karyawan (termasuk yang sudah di tempat sampah) dihapus lewat API, lalu baris karyawan dihapus. */
export async function permanentDeleteEmployee(employee, user) {
  const client = await getClient();
  const owned = await selectAll('mcus', query => query.eq('employee_id', employee.employeeId));
  for (const row of owned) {
    await callPermanentDelete(row.mcu_id);
    await logActivity({ action: 'delete', target: 'MCU', targetId: row.mcu_id, user, details: `MCU deleted (cascade from employee delete): ${row.mcu_id}.` }).catch(() => {});
  }
  const removed = await client.from('employees').delete().eq('employee_id', employee.employeeId);
  if (removed.error) throw removed.error;
  await logActivity({
    action: 'delete', target: 'Employee', targetId: employee.employeeId, user,
    details: `Employee permanently deleted: ${employee.name || 'Unknown'} (${employee.employeeId}). Cascade deleted: ${owned.length} MCU record(s).`
  }).catch(() => {});
  return { mcus: owned.length };
}
