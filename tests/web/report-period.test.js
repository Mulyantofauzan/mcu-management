'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const emp = (id, extra = {}) => ({ employeeId: id, name: `Nama ${id}`, department: 'Produksi', jobTitle: 'Staf', birthDate: '1990-01-01', gender: 'Laki-laki', bloodType: 'O+', deletedAt: null, ...extra });
const mcu = (id, employeeId, extra = {}) => ({ mcuId: id, employeeId, mcuDate: '2026-11-10', mcuType: 'Annual', initialResult: 'Fit', finalResult: null, doctor: 7, ...extra });

test('default range is the last 30 days', async () => {
  const { defaultRange } = await load('pages/report-period/report.js');
  assert.deepEqual(defaultRange(new Date('2026-11-20T12:00:00')), { from: '2026-10-21', to: '2026-11-20' });
});

test('report rows: skips deleted/unknown, filters by department and initial result, counts unique employees', async () => {
  const { buildReport, reportStats } = await load('pages/report-period/report.js');
  const employees = [emp('A'), emp('B', { department: 'IT' }), emp('C', { deletedAt: '2026-01-01' })];
  const mcus = [mcu('1', 'A'), mcu('2', 'A', { initialResult: 'Unfit' }), mcu('3', 'B', { initialResult: 'Follow-Up' }), mcu('4', 'C'), mcu('5', 'ZZ'), mcu('6', 'A', { deletedAt: 'x' })];
  const all = buildReport(mcus, employees);
  assert.equal(all.rows.length, 3);
  assert.equal(all.employeeCount, 2);
  assert.equal(all.rows[0].finalResult, '-');
  assert.deepEqual(buildReport(mcus, employees, { department: 'IT' }).rows.map(r => r.employeeId), ['B']);
  assert.deepEqual(buildReport(mcus, employees, { status: 'Unfit' }).rows.map(r => r.employeeId), ['A']);
  const stats = reportStats(all.rows, all.employeeCount);
  assert.deepEqual([stats.mcus, stats.fit, stats.fitPercent, stats.unfit, stats.unfitPercent], [3, 1, '33,3%', 2, '66,7%']);
  assert.equal(reportStats([], 0).fitPercent, '0%');
});

test('consolidated export: one row per employee (newest first), lab columns, doctor name', async () => {
  const { consolidate, consolidatedCsv, labColumn, reportFileName } = await load('pages/report-period/report.js');
  const rows = consolidate([mcu('new', 'A', { mcuDate: '2026-11-10' }), mcu('old', 'A', { mcuDate: '2026-01-01' }), mcu('b', 'B')], [emp('A'), emp('B')], {
    labsByMcu: new Map([['new', [{ lab_item_id: 3, value: 14.2 }, { lab_item_id: 5, value: '' }]], ['b', []]]),
    labItems: [{ id: 5, name: 'Leukosit' }, { id: 3, name: 'Hemoglobin' }, { id: 7, name: 'Gula Darah 2 JPP' }],
    doctors: [{ id: 7, name: 'dr. Anindya' }]
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].dokter, 'dr. Anindya');
  assert.equal(rows[0].lab_hemoglobin, '14.2');
  assert.equal(rows[0].lab_leukosit, '-');
  assert.equal(labColumn('Gula Darah 2 JPP'), 'lab_gula_darah_2_jpp');
  const csv = consolidatedCsv(rows);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const [header, first] = csv.slice(1).split('\n');
  assert.ok(header.startsWith('"NAMA KARYAWAN","DEPARTEMEN","JABATAN"'));
  assert.ok(header.endsWith('"LAB GULA DARAH 2 JPP","LAB HEMOGLOBIN","LAB LEUKOSIT"'));
  assert.ok(first.includes('" 14.2"'));
  assert.equal(consolidatedCsv([]), '');
  assert.match(reportFileName(new Date('2026-11-20T09:05:07')), /^laporan-mcu-lengkap-2026-11-20-09-05-07\.csv$/);
});
