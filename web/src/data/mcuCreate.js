/* Simpan MCU baru: MCU, catatan awal, lab, riwayat, dan audit. Bila lab gagal, MCU dibatalkan (soft delete) seperti rollback lama. */
import { getClient } from './client.js';
import { logActivity } from './activityWrite.js';
import { softDeleteMcu } from './mcuWrite.js';
import { labItemById } from '../lib/labItems.js';
import { VISION_FIELDS } from '../lib/mcuOptions.js';

export function toMcuRow(p) {
  const row = {
    mcu_id: p.mcuId, employee_id: p.employeeId, mcu_type: p.mcuType, mcu_date: p.mcuDate,
    bmi: p.bmi, blood_pressure: p.bloodPressure, respiratory_rate: p.respiratoryRate, pulse: p.pulse, temperature: p.temperature,
    chest_circumference: p.chestCircumference,
    audiometry: p.audiometry, spirometry: p.spirometry, hbsag: p.hbsag, napza: p.napza, colorblind: p.colorblind,
    xray: p.xray, ekg: p.ekg, treadmill: p.treadmill,
    smoking_status: p.smokingStatus, exercise_frequency: p.exerciseFrequency,
    doctor: p.doctor, recipient: p.recipient, keluhan_utama: p.keluhanUtama, diagnosis_kerja: p.diagnosisKerja, alasan_rujuk: p.alasanRujuk,
    initial_result: p.initialResult, initial_notes: p.initialNotes || '', final_result: null, final_notes: null, status: p.initialResult
  };
  VISION_FIELDS.forEach(({ key, col }) => { row[col] = p[key]; });
  return row;
}

export function toLabRows(mcuId, employeeId, labResults, user) {
  return labResults.map(lab => {
    const info = labItemById(lab.labItemId);
    if (!info) throw new Error(`Lab item ${lab.labItemId} tidak ditemukan atau invalid`);
    return {
      mcu_id: mcuId, employee_id: employeeId, lab_item_id: info.id, value: parseFloat(lab.value), unit: info.unit,
      min_range_reference: info.min, max_range_reference: info.max, notes: lab.notes || null, created_by: user?.userId || null
    };
  });
}

const historyRows = (mcuId, items) => items.map(item => ({ mcu_id: mcuId, disease_id: null, notes: null, ...item }));

export async function createMcu({ payload, labResults, user, employeeName }) {
  const client = await getClient();
  const inserted = await client.from('mcus').insert(toMcuRow(payload)).select('mcu_id').single();
  if (inserted.error) throw inserted.error;
  const mcuId = payload.mcuId;
  const created = { mcuId, mcuDate: payload.mcuDate };

  try {
    await client.from('mcu_changes').insert({ mcu_id: mcuId, field_name: 'created', old_value: null, new_value: 'Record created', changed_at: new Date().toISOString(), changed_by: user?.userId || user?.username || 'system' });
    await logActivity({ action: 'create', target: 'MCU', targetId: mcuId, user, details: `${mcuId}. Type: ${payload.mcuType}, Date: ${payload.mcuDate}, Employee: ${employeeName || 'Unknown'}` }).catch(() => {});
    const labs = await client.from('pemeriksaan_lab').insert(toLabRows(mcuId, payload.employeeId, labResults, user)).select('id');
    if (labs.error) throw labs.error;
    const warnings = [];
    if (payload.medicalHistories.length) {
      const medical = await client.from('medical_histories').insert(historyRows(mcuId, payload.medicalHistories));
      if (medical.error) warnings.push('Riwayat penyakit gagal disimpan');
    }
    if (payload.familyHistories.length) {
      const family = await client.from('family_histories').insert(historyRows(mcuId, payload.familyHistories));
      if (family.error) warnings.push('Riwayat penyakit keluarga gagal disimpan');
    }
    return { mcu: created, labSaved: (labs.data || []).length, warnings };
  } catch (failure) {
    await softDeleteMcu({ mcuId, mcuDate: payload.mcuDate }, employeeName, user).catch(() => {});
    throw new Error(`${failure.message || failure}. MCU ${mcuId} dibatalkan agar data tetap utuh.`);
  }
}
