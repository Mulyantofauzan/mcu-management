/* Data pendukung: departemen, aktivitas terbaru, riwayat penyakit. */
import { selectAll } from './client.js';
import { transformActivity, transformMedicalHistory } from './transform.js';

export async function getDepartments() {
  const rows = await selectAll('departments', query => query.order('name'));
  return rows.map(row => ({ id: row.id, name: row.name }));
}

export async function getRecentActivity(limit = 5) {
  try {
    const rows = await selectAll('activity_log', query => query.order('timestamp', { ascending: false }).limit(limit * 4));
    return rows.map(transformActivity);
  } catch {
    return [];
  }
}

export async function getMedicalHistories() {
  const rows = await selectAll('medical_histories');
  return rows.map(transformMedicalHistory);
}

export async function getMcuOwners(mcuIds) {
  const ids = [...new Set(mcuIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await selectAll('mcus', query => query.in('mcu_id', ids));
  return new Map(rows.map(row => [row.mcu_id, row.employee_id]));
}

export async function getJobTitles() {
  const rows = await selectAll('job_titles', query => query.order('name'));
  return rows.map(row => ({ id: row.id, name: row.name }));
}
