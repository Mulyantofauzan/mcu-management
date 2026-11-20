'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('master config: six types with the expected tables', async () => {
  const { MASTER_TYPES, typeByKey } = await load('lib/masterConfig.js');
  assert.deepEqual(MASTER_TYPES.map(t => t.table), ['job_titles', 'departments', 'vendors', 'doctors', 'lab_items', 'diseases']);
  assert.equal(typeByKey('labItems').softDelete, true);
  assert.equal(typeByKey('doctors').softDelete, undefined);
});

test('form <-> row mapping per type', async () => {
  const { typeByKey } = await load('lib/masterConfig.js');
  assert.deepEqual(typeByKey('jobTitles').toRow({ name: ' Operator ', riskLevel: 'high' }), { name: 'Operator', risk_level: 'high' });
  assert.deepEqual(typeByKey('jobTitles').fromRow({ name: 'X' }), { name: 'X', riskLevel: 'moderate' });
  assert.deepEqual(typeByKey('departments').toRow({ name: ' IT ' }), { name: 'IT' });
  const lab = typeByKey('labItems').toRow({ name: 'Ureum', description: ' ', unit: ' mg/dL ', min: '4', max: '44.1', isActive: false });
  assert.deepEqual(lab, { name: 'Ureum', description: null, unit: 'mg/dL', min_range_reference: 4, max_range_reference: 44.1, is_active: false });
  assert.equal(typeByKey('labItems').toRow({ name: 'x', unit: 'u', min: '', max: 'abc' }).min_range_reference, null);
  const disease = typeByKey('diseases').toRow({ name: 'Asma', category: 'respiratory', icd10: ' J45 ', isActive: true });
  assert.deepEqual(disease, { name: 'Asma', category: 'respiratory', icd_10_code: 'J45', is_active: true });
  assert.equal(typeByKey('diseases').toRow({ name: 'x', category: 'other', icd10: '' }).icd_10_code, null);
});

test('master validation', async () => {
  const { typeByKey, validateMasterForm } = await load('lib/masterConfig.js');
  assert.deepEqual(validateMasterForm(typeByKey('departments'), { name: '  ' }).errors, ['Nama wajib diisi']);
  assert.equal(validateMasterForm(typeByKey('departments'), { name: 'IT' }).isValid, true);
  assert.deepEqual(validateMasterForm(typeByKey('diseases'), { name: 'Asma', category: '' }).errors, ['Kategori harus dipilih']);
  assert.deepEqual(validateMasterForm(typeByKey('labItems'), { name: 'Ureum', unit: '' }).errors, ['Satuan wajib diisi']);
  assert.deepEqual(validateMasterForm(typeByKey('labItems'), { name: 'Ureum', unit: 'u', min: '9', max: '3' }).errors, ['Rentang minimum tidak boleh lebih besar dari maksimum']);
  assert.equal(validateMasterForm(typeByKey('labItems'), { name: 'Ureum', unit: 'u', min: '3', max: '9' }).isValid, true);
});

test('master columns render values and statuses', async () => {
  const { typeByKey } = await load('lib/masterConfig.js');
  const lab = typeByKey('labItems').columns;
  assert.equal(lab[2].value({ min_range_reference: 4, max_range_reference: null }), '4 - -');
  assert.equal(lab[3].status({ is_active: false }), false);
  assert.equal(lab[3].status({}), true);
  const job = typeByKey('jobTitles').columns;
  assert.equal(job[2].value({ risk_level: 'low' }), 'Rendah');
  assert.equal(job[2].value({}), 'Sedang');
  assert.equal(typeByKey('diseases').columns[2].value({ category: 'cardiovascular' }), 'Kardiovaskular');
});
