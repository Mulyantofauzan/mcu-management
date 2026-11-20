'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('sameValue treats blanks, numbers and whitespace like the old isDifferent plus numeric tolerance', async () => {
  const { sameValue } = await load('lib/mcuDiff.js');
  assert.equal(sameValue(null, ''), true);
  assert.equal(sameValue(undefined, null), true);
  assert.equal(sameValue('24.5', ' 24.5 '), true);
  assert.equal(sameValue(92, '92.0'), true);
  assert.equal(sameValue('7', 7), true);
  assert.equal(sameValue('Normal', 'normal'), false);
  assert.equal(sameValue(null, 'x'), false);
  assert.equal(sameValue('x', null), false);
});

test('diffMcu only compares keys present in the patch and ignores date time suffixes', async () => {
  const { diffMcu } = await load('lib/mcuDiff.js');
  const old = { mcuDate: '2026-09-03', bmi: '24.5', bloodPressure: '120/80', finalResult: null, status: 'Follow-Up', doctor: 7 };
  const diffs = diffMcu(old, { mcuDate: '2026-09-03T00:00:00', bmi: '24.5', bloodPressure: '130/85', finalResult: 'Fit', status: 'Fit', doctor: '7', notTracked: 'x' });
  assert.deepEqual(diffs.map(d => d.field), ['bloodPressure', 'finalResult', 'status']);
  assert.deepEqual(diffs[0], { field: 'bloodPressure', oldValue: '120/80', newValue: '130/85' });
  assert.deepEqual(diffMcu(old, {}), []);
});

test('every tracked field has a database column and matches toMcuRow', async () => {
  const { TRACKED_FIELDS } = await load('lib/mcuDiff.js');
  const { FIELD_COLUMN } = await load('lib/mcuColumns.js');
  const { toMcuRow } = await load('data/mcuCreate.js');
  TRACKED_FIELDS.forEach(field => assert.ok(FIELD_COLUMN[field], `no column for ${field}`));
  const probe = {};
  Object.keys(FIELD_COLUMN).forEach(key => { probe[key] = `v-${key}`; });
  const row = toMcuRow({ ...probe, mcuId: 'M', employeeId: 'E' });
  Object.entries(FIELD_COLUMN).filter(([key]) => !['finalResult', 'finalNotes', 'status'].includes(key)).forEach(([key, column]) => {
    assert.equal(row[column], `v-${key}`, `${key} -> ${column} disagrees with toMcuRow`);
  });
});

test('buildPatchRow maps changed fields to columns and stamps updated_at', async () => {
  const { buildPatchRow } = await load('data/mcuUpdate.js');
  const row = buildPatchRow([{ field: 'finalResult', newValue: 'Fit' }, { field: 'visionNearUnaidedLeft', newValue: '6/9' }]);
  assert.equal(row.final_result, 'Fit');
  assert.equal(row.vision_near_unaided_left, '6/9');
  assert.ok(row.updated_at);
});

test('diffHistories reports added and removed entries with the old labels', async () => {
  const { diffHistories } = await load('lib/mcuDiff.js');
  const changes = diffHistories(
    [{ diseaseName: 'Asma' }, { diseaseName: 'Hipertensi' }], [{ diseaseName: 'Diabetes', familyMember: 'Ayah' }],
    ['Hipertensi', 'Stroke'], [{ disease: 'Diabetes', member: 'Ayah' }, { disease: 'Asma', member: 'Ibu' }]);
  assert.deepEqual(changes.map(c => c.label), ['Riwayat Penyakit (Ditambah): Stroke', 'Riwayat Penyakit (Dihapus): Asma', 'Riwayat Penyakit Keluarga (Ditambah): Asma:Ibu']);
  assert.deepEqual(changes.map(c => c.fieldName), ['medicalHistory', 'medicalHistory', 'familyHistory']);
  assert.deepEqual(diffHistories([], [], [], []), []);
});

test('diffLabs creates, updates, deletes and skips unchanged', async () => {
  const { diffLabs } = await load('lib/mcuDiff.js');
  const name = id => `Item${id}`;
  const existing = [{ id: 'r1', lab_item_id: 3, value: 14, notes: null }, { id: 'r2', lab_item_id: 5, value: '4.0', notes: null }, { id: 'r3', lab_item_id: 7, value: 100, notes: null }];
  const plan = diffLabs(existing, [
    { labItemId: 3, value: '14' }, { labItemId: 5, value: '5.5' }, { labItemId: 7, value: '' }, { labItemId: 8, value: '180' }, { labItemId: 9, value: '' }
  ], name);
  assert.deepEqual(plan.creates, [{ labItemId: 8, value: 180, notes: null }]);
  assert.deepEqual(plan.updates.map(u => [u.id, u.value]), [['r2', 5.5]]);
  assert.deepEqual(plan.deletes.map(d => d.id), ['r3']);
  assert.deepEqual(plan.changes.map(c => c.label), ['Hasil Lab (Update): Item5', 'Hasil Lab (Dihapus): Item7', 'Hasil Lab (Baru): Item8']);
  assert.deepEqual(plan.changes[0], { label: 'Hasil Lab (Update): Item5', oldValue: '4', newValue: '5.5' });
});
