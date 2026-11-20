/* Memuat bagian-bagian detail MCU secara terpisah: satu bagian gagal tidak menjatuhkan yang lain. */
import { getMcu, getLabResults, getMcuMedicalHistories, getMcuFamilyHistories, getMcuChanges, getDoctors, getMcuFiles } from '../../../data/mcuDetail.js';

const part = promise => promise.then(data => ({ ok: true, data }), error => ({ ok: false, error: error.message || String(error) }));

export async function loadMcuDetail(mcuId) {
  const mcu = await getMcu(mcuId);
  if (!mcu) throw new Error('MCU tidak ditemukan');
  const [lab, medical, family, changes, doctors, files] = await Promise.all([
    part(getLabResults(mcuId)), part(getMcuMedicalHistories(mcuId)), part(getMcuFamilyHistories(mcuId)),
    part(getMcuChanges(mcuId)), part(getDoctors()), part(getMcuFiles(mcuId))
  ]);
  return { mcu, lab, medical, family, changes, doctors, files };
}
