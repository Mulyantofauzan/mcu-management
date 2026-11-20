'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('lab: display order follows the clinic order and unknown items go last', async () => {
  const { sortLabResults } = await load('lib/lab.js');
  const ids = sortLabResults([{ lab_item_id: 1 }, { lab_item_id: 99 }, { lab_item_id: 5 }, { lab_item_id: 3 }, { lab_item_id: 7 }]).map(r => r.lab_item_id);
  assert.deepEqual(ids, [5, 3, 7, 1, 99]);
});

test('lab: status compares against the reference range', async () => {
  const { labStatus, labRange } = await load('lib/lab.js');
  const r = (value, min, max) => ({ value, min_range_reference: min, max_range_reference: max });
  assert.equal(labStatus(r('3.1', 4, 10)).label, 'Rendah');
  assert.equal(labStatus(r('14', 11, 17)).label, 'Normal');
  assert.equal(labStatus(r('126', 70, 110)).label, 'Tinggi');
  assert.equal(labStatus(r('11', 11, 17)).label, 'Normal');
  assert.equal(labStatus(r('17', 11, 17)).label, 'Normal');
  assert.equal(labStatus(r('abc', 1, 2)).label, '-');
  assert.equal(labStatus(r('5', null, 10)).label, '-');
  assert.equal(labStatus(r('5', 0, 10)).cls, 'p0');
  assert.equal(labRange(r('1', 4, 10)), '4 - 10');
  assert.equal(labRange(r('1', null, 10)), '-');
  assert.equal(labRange(r('1', 0, 0)), '0 - 0');
});

test('changes: labels and changed flag', async () => {
  const { changeRows } = await load('lib/changes.js');
  const rows = changeRows([
    { fieldName: 'bloodPressure', oldValue: '148/92', newValue: '138/88', changedAt: 't' },
    { fieldName: 'finalResult', oldValue: null, newValue: null },
    { fieldName: 'mystery', oldValue: 'a', newValue: 'a' }
  ]);
  assert.deepEqual(rows.map(r => r.label), ['Tekanan Darah', 'Hasil Akhir', 'mystery']);
  assert.deepEqual(rows.map(r => r.changed), [true, false, false]);
  assert.equal(rows[1].before, '-');
});

test('sections: units only on numeric values, dashes for blanks, doctor lookup', async () => {
  const { withUnit, examRows, visionRows, doctorName, referralRows, infoRows } = await load('pages/kelola-karyawan/mcu/buildSections.js');
  assert.equal(withUnit('138/88', 'mmHg'), '138/88 mmHg');
  assert.equal(withUnit('26,4', 'kg/m²'), '26,4 kg/m²');
  assert.equal(withUnit('Normal', 'cm'), 'Normal');
  assert.equal(withUnit('', 'cm'), '-');
  assert.equal(withUnit(null, 'cm'), '-');
  assert.equal(examRows({}).length, 16);
  assert.ok(examRows({}).every(([, value]) => value === '-'));
  const vision = visionRows({ visionDistantUnaidedLeft: '6/9', visionNearSpectaclesRight: '' });
  assert.deepEqual(vision[0].cells, ['6/9', '-', '-', '-']);
  assert.deepEqual(vision[1].cells, ['-', '-', '-', '-']);
  assert.equal(doctorName('7', [{ id: 7, name: 'dr. A' }]), 'dr. A');
  assert.equal(doctorName(9, [{ id: 7, name: 'dr. A' }]), 'ID: 9');
  assert.equal(doctorName(null, []), '-');
  assert.equal(referralRows({ doctor: 7, recipient: 'Sp.PD' }, [{ id: 7, name: 'dr. A' }])[0][1], 'dr. A');
  assert.equal(infoRows({ mcuId: 'MCU-1', mcuDate: '2026-09-03', mcuType: 'Annual' })[1][1], '03 Sep 2026');
  assert.equal(infoRows({ mcuId: 'MCU-1' })[3][1], '-');
});

test('formatFileSize and dialogStack', async () => {
  const { formatFileSize } = await load('lib/format.js');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2,0 KB');
  assert.equal(formatFileSize(1258291), '1,2 MB');
  assert.equal(formatFileSize(null), '-');
  const { pushDialog, popDialog, isTopDialog } = await load('lib/dialogStack.js');
  const a = Symbol('a'), b = Symbol('b');
  pushDialog(a); pushDialog(b);
  assert.equal(isTopDialog(a), false);
  assert.equal(isTopDialog(b), true);
  popDialog(b);
  assert.equal(isTopDialog(a), true);
  popDialog(a);
  assert.equal(isTopDialog(a), false);
});
