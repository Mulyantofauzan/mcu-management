/* Model form MCU: nilai awal, pembacaan "Lainnya", dan penyusunan payload. Murni dan diuji. */
import { LAB_ITEMS, labStatusNote } from '../../lib/labItems.js';
import { OTHER, VISION_FIELDS, VISION_VALUES, AUDIO, SPIRO, XRAY, EKG, TREADMILL, NAPZA, COLORBLIND } from '../../lib/mcuOptions.js';

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
  return LAB_ITEMS.map(item => ({ labItemId: item.id, value: form.labs[item.id], notes: labStatusNote(item, form.labs[item.id]) || null }));
}

const OPTIONS = { audiometry: AUDIO, spirometry: SPIRO, xray: XRAY, ekg: EKG, treadmill: TREADMILL, napza: NAPZA, colorblind: COLORBLIND };
VISION_FIELDS.forEach(({ key }) => { OPTIONS[key] = VISION_VALUES; });

/* Nilai database -> pilihan form; nilai di luar daftar menjadi "Lainnya" + isian. */
function fromStored(form, key, stored) {
  if (stored === null || stored === undefined || String(stored).trim() === '') return;
  const options = OPTIONS[key];
  if (options && !options.includes(stored)) { form[key] = OTHER; form[`${key}Other`] = String(stored); return; }
  form[key] = String(stored);
}

const TEXT_KEYS = ['mcuType', 'bmi', 'bloodPressure', 'respiratoryRate', 'pulse', 'temperature', 'chestCircumference', 'hbsag', 'smokingStatus', 'exerciseFrequency', 'recipient', 'keluhanUtama', 'diagnosisKerja', 'alasanRujuk', 'initialResult', 'initialNotes'];

export function mcuToForm(mcu, labs = [], medical = [], family = []) {
  const form = newMcuForm();
  form.mcuDate = String(mcu.mcuDate || form.mcuDate).slice(0, 10);
  TEXT_KEYS.forEach(key => { if (mcu[key] !== null && mcu[key] !== undefined) form[key] = String(mcu[key]); });
  Object.keys(OPTIONS).forEach(key => fromStored(form, key, mcu[key]));
  form.doctor = mcu.doctor === null || mcu.doctor === undefined ? '' : String(mcu.doctor);
  labs.forEach(row => { if (row.lab_item_id in form.labs) form.labs[row.lab_item_id] = String(row.value); });
  form.medical = medical.map(item => item.diseaseName);
  form.family = family.map(item => ({ disease: item.diseaseName, member: item.familyMember }));
  return form;
}

/* Hanya isian yang berbeda dari kondisi awal formulir yang dikirim sebagai perubahan. */
export function changedPayload(form, baseline, ids) {
  const now = toMcuPayload(form, ids);
  const before = toMcuPayload(baseline, ids);
  const patch = {};
  Object.keys(now).filter(key => !['mcuId', 'employeeId', 'medicalHistories', 'familyHistories'].includes(key)).forEach(key => {
    if (JSON.stringify(now[key]) !== JSON.stringify(before[key])) patch[key] = now[key];
  });
  return patch;
}
