/* Perbarui MCU: kolom yang berubah, riwayat perubahan, lab, riwayat penyakit, dan audit.
   Menggabungkan mcuService.updateFollowUp, mcuBatchService.updateMCUWithLabResults, dan penyimpanan riwayat di kelola-karyawan lama. */
import { getClient } from './client.js';
import { logActivity } from './activityWrite.js';
import { getLabResults } from './mcuDetail.js';
import { toLabRows } from './mcuCreate.js';
import { FIELD_COLUMN } from '../lib/mcuColumns.js';
import { diffMcu, diffHistories, diffLabs } from '../lib/mcuDiff.js';
import { labItemById } from '../lib/labItems.js';

const text = value => (value === null || value === undefined ? null : String(value));

export function buildPatchRow(diffs) {
  const row = {};
  diffs.forEach(({ field, newValue }) => { row[FIELD_COLUMN[field]] = newValue; });
  row.updated_at = new Date().toISOString();
  return row;
}

export async function updateMcu({ mcuId, oldMcu, patch, labInputs = null, histories = null, user, employeeName }) {
  const client = await getClient();
  const next = { ...patch };
  if ('finalResult' in next && next.finalResult) next.status = next.finalResult;
  const diffs = diffMcu(oldMcu, next);

  const labPlan = labInputs ? diffLabs(await getLabResults(mcuId), labInputs, id => labItemById(id)?.name || `Item ${id}`) : { creates: [], updates: [], deletes: [], changes: [] };
  const historyChanges = histories ? diffHistories(histories.existingMedical, histories.existingFamily, histories.medical, histories.family) : [];
  const total = diffs.length + labPlan.changes.length + historyChanges.length;
  if (!total) return { changed: 0, changes: [], warnings: [] };

  const warnings = [];
  if (diffs.length) {
    const patched = await client.from('mcus').update(buildPatchRow(diffs)).eq('mcu_id', mcuId).select('mcu_id');
    if (patched.error) throw patched.error;
  }

  if (labPlan.creates.length) {
    const result = await client.from('pemeriksaan_lab').insert(toLabRows(mcuId, oldMcu.employeeId, labPlan.creates, user));
    if (result.error) warnings.push(`Lab baru gagal disimpan: ${result.error.message}`);
  }
  for (const item of labPlan.updates) {
    const result = await client.from('pemeriksaan_lab').update({ value: item.value, notes: item.notes || null, updated_at: new Date().toISOString(), updated_by: user?.userId || null }).eq('id', item.id);
    if (result.error) warnings.push(`Lab ${labItemById(item.labItemId)?.name} gagal diperbarui: ${result.error.message}`);
  }
  for (const item of labPlan.deletes) {
    const result = await client.from('pemeriksaan_lab').update({ deleted_at: new Date().toISOString() }).eq('id', item.id);
    if (result.error) warnings.push(`Lab ${labItemById(item.labItemId)?.name} gagal dihapus: ${result.error.message}`);
  }

  if (historyChanges.length) {
    try {
      await client.from('medical_histories').delete().eq('mcu_id', mcuId);
      await client.from('family_histories').delete().eq('mcu_id', mcuId);
      if (histories.medical.length) await client.from('medical_histories').insert(histories.medical.map(name => ({ mcu_id: mcuId, disease_id: null, disease_name: name, year_diagnosed: null, notes: null })));
      if (histories.family.length) await client.from('family_histories').insert(histories.family.map(entry => ({ mcu_id: mcuId, disease_id: null, disease_name: entry.disease, family_member: entry.member, status: 'current', notes: null })));
    } catch (failure) {
      warnings.push(`Riwayat kesehatan mungkin tidak tersimpan: ${failure.message}`);
    }
  }

  const when = new Date().toISOString();
  const by = user?.userId || user?.username || 'system';
  const rows = [
    ...diffs.map(({ field, oldValue, newValue }) => ({ mcu_id: mcuId, field_name: field, old_value: text(oldValue), new_value: text(newValue), changed_at: when, changed_by: by })),
    ...historyChanges.map(change => ({ mcu_id: mcuId, field_name: change.fieldName, old_value: change.oldValue, new_value: change.newValue, changed_at: when, changed_by: by })),
    ...labPlan.changes.map(change => ({ mcu_id: mcuId, field_name: change.label, old_value: change.oldValue, new_value: change.newValue, changed_at: when, changed_by: by }))
  ];
  const logged = await client.from('mcu_changes').insert(rows);
  if (logged.error) warnings.push(`Riwayat perubahan gagal dicatat: ${logged.error.message}`);

  const fields = [...new Set(diffs.map(d => d.field))].join(', ') || 'none';
  await logActivity({ action: 'update', target: 'MCU', targetId: mcuId, user, details: `Updated MCU follow-up: ${mcuId}. Employee: ${employeeName || 'Unknown'}. Fields: ${fields}` }).catch(() => {});
  return { changed: total, changes: rows.map(row => ({ label: row.field_name, before: row.old_value ?? '-', after: row.new_value ?? '-' })), warnings };
}
