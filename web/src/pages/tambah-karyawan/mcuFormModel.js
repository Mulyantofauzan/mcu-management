/* Model form MCU: nilai awal, pembacaan "Lainnya", dan penyusunan payload. Murni dan diuji. */
import { LAB_ITEMS } from '../../lib/labItems.js';
import { OTHER, VISION_FIELDS } from '../../lib/mcuOptions.js';

const SELECT_FIELDS = ['audiometry', 'spirometry', 'xray', 'ekg', 'treadmill', 'napza', 'colorblind'];
const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function newMcuForm(now = new Date()) {
  const form = {
    mcuType: '', mcuDate: todayIso(now), bmi: '', bloodPressure: '', respiratoryRate: '', pulse: '', temperature: '', chestCircumference: '',
    hbsag: 'Negatif', smokingStatus: 'Tidak Merokok', exerciseFrequency: 'Tidak Pernah',
    audiometry: 'Normal', spirometry: 'Normal', xray: 'Normal', ekg: 'Normal', treadmill: 'Normal', napza: 'Negatif', colorblind: 'Normal',
    doctor: '', recipient: '', keluhanUtama: '', diagnosisKerja: '', alasanRujuk: '', initialResult: '', initialNotes: '',
    labs: Object.fromEntries(LAB_ITEMS.map(item => [item.id, ''])),
    medical: [], family: []
  };
  SELECT_FIELDS.forEach(key => { form[`${key}Other`] = ''; });
  VISION_FIELDS.forEach(({ key }) => { form[key] = '6/6'; form[`${key}Other`] = ''; });
  return form;
}

/* Pilihan "Lainnya" diganti isian bebas; kosong menjadi null. */
export const choice = (value, other) => (value === OTHER ? (other || '').trim() || null : value || null);
const text = value => (String(value ?? '').trim() || null);

export function toMcuPayload(form, { mcuId, employeeId }) {
  const payload = {
    mcuId, employeeId,
    mcuType: form.mcuType, mcuDate: form.mcuDate,
    bmi: text(form.bmi), bloodPressure: text(form.bloodPressure), respiratoryRate: text(form.respiratoryRate),
    pulse: text(form.pulse), temperature: text(form.temperature),
    chestCircumference: text(form.chestCircumference) ? parseFloat(form.chestCircumference) : null,
    hbsag: text(form.hbsag), smokingStatus: text(form.smokingStatus), exerciseFrequency: text(form.exerciseFrequency),
    doctor: form.doctor ? parseInt(form.doctor, 10) : null,
    recipient: text(form.recipient), keluhanUtama: text(form.keluhanUtama), diagnosisKerja: text(form.diagnosisKerja), alasanRujuk: text(form.alasanRujuk),
    initialResult: form.initialResult, initialNotes: (form.initialNotes || '').trim(),
    medicalHistories: form.medical.map(disease => ({ disease_name: disease, year_diagnosed: null })),
    familyHistories: form.family.map(entry => ({ disease_name: entry.disease, family_member: entry.member, status: 'current' }))
  };
  SELECT_FIELDS.forEach(key => { payload[key] = choice(form[key], form[`${key}Other`]); });
  VISION_FIELDS.forEach(({ key }) => { payload[key] = choice(form[key], form[`${key}Other`]); });
  return payload;
}

export function labResultsFrom(form) {
  return LAB_ITEMS.map(item => ({ labItemId: item.id, value: form.labs[item.id], notes: null }));
}
