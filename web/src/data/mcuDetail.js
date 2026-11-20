/* Bacaan untuk detail satu MCU: data utama, lab, riwayat, perubahan, dokter, dan berkas. */
import { selectAll } from './client.js';
import { getAccessToken } from '../lib/session.js';
import { transformMcu, transformMedicalHistory, transformFamilyHistory, transformChange } from './transform.js';

export async function getMcu(mcuId) {
  const rows = await selectAll('mcus', query => query.eq('mcu_id', mcuId).limit(1));
  return rows[0] ? transformMcu(rows[0]) : null;
}

export async function getLabResults(mcuId) {
  const rows = await selectAll('pemeriksaan_lab', query => query.eq('mcu_id', mcuId));
  return rows;
}

export async function getMcuMedicalHistories(mcuId) {
  return (await selectAll('medical_histories', query => query.eq('mcu_id', mcuId))).map(transformMedicalHistory);
}

export async function getMcuFamilyHistories(mcuId) {
  return (await selectAll('family_histories', query => query.eq('mcu_id', mcuId))).map(transformFamilyHistory);
}

export async function getMcuChanges(mcuId) {
  const rows = await selectAll('mcu_changes', query => query.eq('mcu_id', mcuId).order('changed_at', { ascending: false }));
  return rows.map(transformChange);
}

export async function getDoctors() {
  return (await selectAll('doctors', query => query.order('name'))).map(row => ({ id: row.id, name: row.name }));
}

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function getMcuFiles(mcuId) {
  const response = await fetch(`/api/get-mcu-files?mcuId=${encodeURIComponent(mcuId)}`, { headers: authHeaders() });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Gagal memuat dokumen');
  return result.files || [];
}

export async function openMcuFile(fileId, userId) {
  const response = await fetch(`/api/download-file?fileId=${encodeURIComponent(fileId)}&userId=${encodeURIComponent(userId)}`, { headers: authHeaders() });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success || !result.signedUrl) throw new Error(result.error || `HTTP ${response.status}`);
  window.open(result.signedUrl, '_blank', 'noopener');
  return result;
}
