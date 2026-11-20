/* Perbedaan data MCU untuk riwayat perubahan dan pembaruan. Murni dan diuji. Aturan dari diffHelpers.js dan mcuBatchService.js lama. */
export const TRACKED_FIELDS = [
  'mcuType', 'mcuDate', 'bmi', 'bloodPressure', 'respiratoryRate', 'pulse', 'temperature', 'chestCircumference',
  'visionDistantUnaidedLeft', 'visionDistantUnaidedRight', 'visionDistantSpectaclesLeft', 'visionDistantSpectaclesRight',
  'visionNearUnaidedLeft', 'visionNearUnaidedRight', 'visionNearSpectaclesLeft', 'visionNearSpectaclesRight',
  'audiometry', 'spirometry', 'xray', 'ekg', 'treadmill', 'hbsag', 'napza', 'colorblind',
  'smokingStatus', 'exerciseFrequency', 'doctor', 'recipient', 'keluhanUtama', 'diagnosisKerja', 'alasanRujuk',
  'initialResult', 'initialNotes', 'finalResult', 'finalNotes', 'status'
];

const blank = value => value === null || value === undefined || String(value).trim() === '';

export function sameValue(a, b) {
  if (blank(a) && blank(b)) return true;
  if (blank(a) || blank(b)) return false;
  if (String(a).trim() === String(b).trim()) return true;
  const x = Number(a), y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
}

const day = value => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value);

/* patch hanya berisi kolom yang dikirim form; yang tidak ada di patch tidak dibandingkan. */
export function diffMcu(oldMcu, patch) {
  return TRACKED_FIELDS
    .filter(field => field in patch)
    .filter(field => !sameValue(field === 'mcuDate' ? day(oldMcu[field]) : oldMcu[field], field === 'mcuDate' ? day(patch[field]) : patch[field]))
    .map(field => ({ field, oldValue: oldMcu[field] ?? null, newValue: patch[field] ?? null }));
}

const familyKey = entry => `${entry.diseaseName ?? entry.disease}:${entry.familyMember ?? entry.member}`;

export function diffHistories(existingMedical, existingFamily, nextMedical, nextFamily) {
  const changes = [];
  const oldMedical = existingMedical.map(item => item.diseaseName);
  nextMedical.filter(name => !oldMedical.includes(name)).forEach(name => changes.push({ fieldName: 'medicalHistory', label: `Riwayat Penyakit (Ditambah): ${name}`, oldValue: '-', newValue: name }));
  oldMedical.filter(name => !nextMedical.includes(name)).forEach(name => changes.push({ fieldName: 'medicalHistory', label: `Riwayat Penyakit (Dihapus): ${name}`, oldValue: name, newValue: '-' }));
  const oldFamily = existingFamily.map(familyKey);
  const newFamily = nextFamily.map(familyKey);
  newFamily.filter(key => !oldFamily.includes(key)).forEach(key => changes.push({ fieldName: 'familyHistory', label: `Riwayat Penyakit Keluarga (Ditambah): ${key}`, oldValue: '-', newValue: key }));
  oldFamily.filter(key => !newFamily.includes(key)).forEach(key => changes.push({ fieldName: 'familyHistory', label: `Riwayat Penyakit Keluarga (Dihapus): ${key}`, oldValue: key, newValue: '-' }));
  return changes;
}

/* Lab: kolom kosong pada item yang sudah ada berarti dihapus; yang tidak berubah dilewati. */
export function diffLabs(existing, inputs, nameOf) {
  const byItem = new Map(existing.map(row => [Number(row.lab_item_id), row]));
  const creates = [], updates = [], deletes = [], changes = [];
  inputs.forEach(({ labItemId, value, notes = null }) => {
    const id = Number(labItemId);
    const row = byItem.get(id);
    const filled = !blank(value);
    if (!filled) {
      if (row) { deletes.push({ id: row.id, labItemId: id }); changes.push({ label: `Hasil Lab (Dihapus): ${nameOf(id)}`, oldValue: String(row.value), newValue: '-' }); }
      return;
    }
    const number = parseFloat(value);
    if (!row) { creates.push({ labItemId: id, value: number, notes }); changes.push({ label: `Hasil Lab (Baru): ${nameOf(id)}`, oldValue: '-', newValue: String(number) }); return; }
    if (parseFloat(row.value) !== number || (row.notes || null) !== (notes || null)) {
      updates.push({ id: row.id, labItemId: id, value: number, notes });
      changes.push({ label: `Hasil Lab (Update): ${nameOf(id)}`, oldValue: String(parseFloat(row.value)), newValue: String(number) });
    }
  });
  return { creates, updates, deletes, changes };
}
