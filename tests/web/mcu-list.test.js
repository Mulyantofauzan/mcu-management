'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const today = new Date('2026-11-20');
const employees = [{ employeeId: 'E1', name: 'Budi Santoso', gender: 'Laki-laki', birthDate: '1989-01-01' }, { employeeId: 'E2', name: 'Siti Rahma', gender: 'Perempuan', birthDate: '1960-01-01' }];
const mcus = [
  { mcuId: 'M1', employeeId: 'E1', mcuDate: '2026-03-01', mcuType: 'Annual', initialResult: 'Fit', finalResult: null, bloodPressure: '120/80', bmi: '22', smokingStatus: 'Tidak merokok', exerciseFrequency: '1-2x seminggu' },
  { mcuId: 'M2', employeeId: 'E2', mcuDate: '2025-08-01', mcuType: 'Pre-Employee', initialResult: 'Follow-Up', finalResult: 'Unfit', bloodPressure: '190/120', bmi: '33', smokingStatus: 'Perokok aktif', exerciseFrequency: 'Tidak pernah' },
  { mcuId: 'M3', employeeId: 'GONE', mcuDate: '2024-01-01', mcuType: 'Annual', initialResult: 'Fit' }
];

test('rows carry the Jakarta score, level and the effective result', async () => {
  const { buildMcuRows } = await load('pages/kelola-karyawan/mcuList.js');
  const rows = buildMcuRows(mcus, employees, new Map([['M2', [{ diseaseName: 'Diabetes' }]]]), today);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].score, 1 - 3 + 0 + 0 + 0 + 0 + 0);
  assert.equal(rows[0].level, 1);
  assert.equal(rows[1].result, 'Unfit');
  assert.equal(rows[1].level, 3);
  assert.equal(rows[1].score, 0 + 3 + 4 + 2 + 4 + 2 + 2);
  assert.equal(rows[2].name, 'Unknown');
  assert.equal(rows[2].level, 0);
  assert.equal(rows[0].year, 2026);
});

test('filters by text (name, employee id, MCU id), year, type and result', async () => {
  const { buildMcuRows, filterMcuRows, yearsOfRows } = await load('pages/kelola-karyawan/mcuList.js');
  const rows = buildMcuRows(mcus, employees, new Map(), today);
  assert.deepEqual(filterMcuRows(rows, { q: 'budi' }).map(r => r.mcuId), ['M1']);
  assert.deepEqual(filterMcuRows(rows, { q: 'e2' }).map(r => r.mcuId), ['M2']);
  assert.deepEqual(filterMcuRows(rows, { q: 'm3' }).map(r => r.mcuId), ['M3']);
  assert.deepEqual(filterMcuRows(rows, { year: '2025' }).map(r => r.mcuId), ['M2']);
  assert.deepEqual(filterMcuRows(rows, { type: 'Annual' }).map(r => r.mcuId), ['M1', 'M3']);
  assert.deepEqual(filterMcuRows(rows, { result: 'Unfit' }).map(r => r.mcuId), ['M2']);
  assert.equal(filterMcuRows(rows, {}).length, 3);
  assert.deepEqual(yearsOfRows(rows), [2026, 2025, 2024]);
});
