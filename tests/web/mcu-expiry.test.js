'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const row = (id, status, days, department = 'Produksi') => ({ employeeId: id, name: id, department, jobTitle: 'Staf', expiryStatus: status, daysLeft: days, lastMcuDate: '2025-10-10', expiryDate: '2026-10-10' });

test('expiry: only EXPIRED and WARNING need attention', async () => {
  const { attentionRows, kpiStats } = await load('pages/mcu-expiry/expiry.js');
  const data = [row('a', 'EXPIRED', -5), row('b', 'WARNING', 20), row('c', 'OK', 200), row('d', 'NO_MCU', null)];
  assert.deepEqual(attentionRows(data).map(r => r.employeeId), ['a', 'b']);
  const stats = kpiStats(data);
  assert.deepEqual([stats.expired, stats.warning, stats.total], [1, 1, 2]);
  assert.deepEqual([stats.expiredShare, stats.warningShare, stats.totalShare], [50, 50, 50]);
  assert.equal(kpiStats([]).totalShare, 0);
});

test('expiry: sort by days puts the most urgent first; sort by status puts EXPIRED first (old code had it last)', async () => {
  const { filterAndSort } = await load('pages/mcu-expiry/expiry.js');
  const data = [row('w', 'WARNING', 10), row('e1', 'EXPIRED', -30), row('e2', 'EXPIRED', -2), row('n', 'WARNING', null)];
  assert.deepEqual(filterAndSort(data, { sort: 'days' }).map(r => r.employeeId), ['e1', 'e2', 'w', 'n']);
  assert.equal(filterAndSort(data, { sort: 'status' })[0].expiryStatus, 'EXPIRED');
  assert.deepEqual(filterAndSort(data, { status: 'WARNING' }).map(r => r.employeeId), ['w', 'n']);
  assert.deepEqual(filterAndSort([row('a', 'EXPIRED', -1, 'IT'), row('b', 'EXPIRED', -1)], { department: 'IT' }).map(r => r.employeeId), ['a']);
});

test('expiry: day text and export rows', async () => {
  const { daysText, exportRows, departmentsOf } = await load('pages/mcu-expiry/expiry.js');
  assert.equal(daysText(-41), '41 hari lewat');
  assert.equal(daysText(0), 'Hari ini');
  assert.equal(daysText(28), '28 hari');
  assert.equal(daysText(null), '-');
  const rows = exportRows([row('a', 'EXPIRED', -3)]);
  assert.deepEqual(Object.keys(rows[0]), ['No', 'ID Karyawan', 'Nama', 'Departemen', 'Jabatan', 'Tanggal Pemeriksaan', 'Berlaku Sampai', 'Hari Tersisa', 'Status']);
  assert.equal(rows[0]['Hari Tersisa'], -3);
  assert.equal(rows[0]['Tanggal Pemeriksaan'], '10 Okt 2025');
  assert.deepEqual(departmentsOf([row('a', 'OK', 1, 'IT'), row('b', 'OK', 1, 'Produksi'), row('c', 'OK', 1, 'IT')]), ['IT', 'Produksi']);
});
