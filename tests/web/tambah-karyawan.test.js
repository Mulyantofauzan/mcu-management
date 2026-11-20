'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('ids: same shape as the old generator', async () => {
  const { generateEmployeeId, generateMcuId } = await load('lib/ids.js');
  const now = new Date('2026-11-20T10:00:00');
  assert.match(generateEmployeeId(now), /^EMP-20261120-[a-z0-9]+-[A-Z0-9]{5}$/);
  assert.match(generateMcuId(now), /^MCU-20261120-[a-z0-9]+-[A-Z0-9]{5}$/);
  assert.notEqual(generateMcuId(now), generateMcuId(now));
});

test('lab items: 14 unique ids with ranges the DB uses', async () => {
  const { LAB_ITEMS, labItemById } = await load('lib/labItems.js');
  assert.equal(LAB_ITEMS.length, 14);
  assert.equal(new Set(LAB_ITEMS.map(i => i.id)).size, 14);
  assert.deepEqual(LAB_ITEMS.map(i => i.id).sort((a, b) => a - b), [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 31, 32]);
  assert.equal(labItemById('7').name, 'Glukosa Puasa');
  assert.equal(labItemById(4), null);
});

test('mcu form model: defaults, "Lainnya" and payload', async () => {
  const { newMcuForm, toMcuPayload, choice, labResultsFrom } = await load('pages/tambah-karyawan/mcuFormModel.js');
  const form = newMcuForm(new Date('2026-11-20T08:00:00'));
  assert.equal(form.mcuDate, '2026-11-20');
  assert.equal(form.visionNearSpectaclesRightOther, '');
  assert.equal(Object.keys(form.labs).length, 14);
  assert.equal(choice('Lainnya', ' Katarak '), 'Katarak');
  assert.equal(choice('Lainnya', ''), null);
  assert.equal(choice('Normal', 'x'), 'Normal');
  assert.equal(choice('', ''), null);
  form.mcuType = 'Annual'; form.doctor = '7'; form.bmi = ' 24.5 '; form.chestCircumference = '92';
  form.xray = 'Lainnya'; form.xrayOther = 'Infiltrat'; form.visionDistantUnaidedLeft = 'Lainnya'; form.visionDistantUnaidedLeftOther = '6/7.5';
  form.medical = ['Asma']; form.family = [{ disease: 'Hipertensi', member: 'Ibu' }]; form.initialNotes = '  ok  ';
  const p = toMcuPayload(form, { mcuId: 'MCU-1', employeeId: 'E1' });
  assert.equal(p.doctor, 7);
  assert.equal(p.bmi, '24.5');
  assert.equal(p.chestCircumference, 92);
  assert.equal(p.xray, 'Infiltrat');
  assert.equal(p.visionDistantUnaidedLeft, '6/7.5');
  assert.equal(p.recipient, null);
  assert.equal(p.initialNotes, 'ok');
  assert.deepEqual(p.medicalHistories, [{ disease_name: 'Asma', year_diagnosed: null }]);
  assert.deepEqual(p.familyHistories, [{ disease_name: 'Hipertensi', family_member: 'Ibu', status: 'current' }]);
  assert.equal(labResultsFrom(form).length, 14);
});

test('mcu validation keeps the old rules and requires every lab value', async () => {
  const { validateMcuPayload, validateLabValues } = await load('lib/mcuValidation.js');
  const today = new Date('2026-11-20');
  const ok = { mcuType: 'Annual', mcuDate: '2026-11-01', doctor: 7, initialResult: 'Fit', initialNotes: 'ok' };
  assert.equal(validateMcuPayload(ok, today).isValid, true);
  assert.deepEqual(validateMcuPayload({}, today).errors, ['Jenis MCU harus dipilih', 'Tanggal MCU harus diisi', 'Dokter pemeriksa harus dipilih', 'Hasil MCU harus dipilih', 'Catatan awal harus diisi']);
  assert.ok(validateMcuPayload({ ...ok, mcuDate: '2027-01-01' }, today).errors.includes('Tanggal MCU tidak boleh di masa depan'));
  assert.ok(validateMcuPayload({ ...ok, bloodPressure: '12080' }, today).errors.includes('Format tekanan darah harus XXX/YY (contoh: 170/80)'));
  assert.ok(validateMcuPayload({ ...ok, bloodPressure: '320/80' }, today).errors.includes('Tekanan darah sistolik tidak valid (harus 50-300)'));
  assert.ok(validateMcuPayload({ ...ok, bloodPressure: '120/20' }, today).errors.includes('Tekanan darah diastolik tidak valid (harus 30-180)'));
  assert.ok(validateMcuPayload({ ...ok, respiratoryRate: '5' }, today).errors.includes('RR (Pernapasan) tidak valid (harus 8-60 /menit)'));
  assert.ok(validateMcuPayload({ ...ok, pulse: '250' }, today).errors.includes('Nadi tidak valid (harus 30-200 bpm)'));
  assert.ok(validateMcuPayload({ ...ok, temperature: '45' }, today).errors.includes('Suhu tidak valid (harus 35-42 °C)'));
  assert.ok(validateMcuPayload({ ...ok, bmi: '5' }, today).errors.includes('BMI tidak valid (harus 10-100)'));
  const labs = Object.fromEntries([5, 6, 3, 7, 31, 8, 10, 11, 9, 32, 12, 13, 1, 2].map(id => [id, '1']));
  assert.equal(validateLabValues(labs).isValid, true);
  assert.deepEqual(validateLabValues({ ...labs, 5: '' }).errors, ['Leukosit harus diisi']);
  assert.deepEqual(validateLabValues({ ...labs, 6: '0' }).errors, ['Trombosit: nilai harus lebih dari 0']);
  assert.deepEqual(validateLabValues({ ...labs, 3: 'abc' }).errors, ['Hemoglobin: nilai harus angka']);
  assert.equal(validateLabValues({}).errors.length, 14);
});

test('history lists: duplicates, custom disease and required fields', async () => {
  const { addMedical, addFamily } = await load('pages/tambah-karyawan/historyLists.js');
  assert.deepEqual(addMedical([], '', ''), { error: 'Pilih penyakit terlebih dahulu' });
  assert.deepEqual(addMedical([], 'Lainnya (isi sendiri)', ' '), { error: 'Sebutkan nama penyakit' });
  assert.deepEqual(addMedical([], 'Lainnya (isi sendiri)', ' Vertigo '), { list: ['Vertigo'] });
  assert.deepEqual(addMedical(['Asma'], 'Asma', ''), { error: 'Penyakit sudah ditambahkan' });
  assert.deepEqual(addFamily([], 'Asma', '', ''), { error: 'Pilih penyakit dan anggota keluarga' });
  assert.deepEqual(addFamily([{ disease: 'Asma', member: 'Ayah' }], 'Asma', 'Ayah', ''), { error: 'Kombinasi penyakit dan anggota keluarga sudah ditambahkan' });
  assert.deepEqual(addFamily([{ disease: 'Asma', member: 'Ayah' }], 'Asma', 'Ibu', '').list.length, 2);
});

test('database rows: MCU, lab and new employee', async () => {
  const { toMcuRow, toLabRows } = await load('data/mcuCreate.js');
  const row = toMcuRow({ mcuId: 'M', employeeId: 'E', mcuType: 'Annual', mcuDate: '2026-01-01', initialResult: 'Fit', initialNotes: 'n', visionNearUnaidedLeft: '6/9', doctor: 7 });
  assert.equal(row.status, 'Fit');
  assert.equal(row.final_result, null);
  assert.equal(row.vision_near_unaided_left, '6/9');
  assert.equal(row.doctor, 7);
  assert.equal(row.initial_notes, 'n');
  const labs = toLabRows('M', 'E', [{ labItemId: 7, value: '95.5', notes: null }], { userId: 'U1' });
  assert.deepEqual(labs[0], { mcu_id: 'M', employee_id: 'E', lab_item_id: 7, value: 95.5, unit: 'mg/dL', min_range_reference: 70, max_range_reference: 110, notes: null, created_by: 'U1' });
  assert.throws(() => toLabRows('M', 'E', [{ labItemId: 4, value: 1 }], null), /tidak ditemukan/);
  const { toNewEmployeeRow } = await load('data/employeesCreate.js');
  const e = toNewEmployeeRow({ name: 'A', gender: '', jobTitle: 'J', department: 'D', birthDate: '1990-01-01', bloodType: 'O+', employeeType: '', vendorName: '', isActive: false, inactiveReason: 'Pensiun' }, 'EMP-1');
  assert.equal(e.jenis_kelamin, 'Laki-laki');
  assert.equal(e.employee_type, 'Karyawan PST');
  assert.equal(e.is_active, false);
  assert.equal(e.inactive_reason, 'Pensiun');
  assert.equal(e.vendor_name, null);
  assert.equal(toNewEmployeeRow({ isActive: true, inactiveReason: 'x' }, 'E').inactive_reason, null);
});
