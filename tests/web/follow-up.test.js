'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const model = (id, mcu = {}, employee = {}) => ({ employee: { employeeId: id, name: `Nama ${id}`, department: 'Produksi', isActive: true, ...employee }, mcu: { mcuId: `M-${id}`, mcuDate: '2026-11-10', initialResult: 'Follow-Up', finalResult: null, updatedAt: '2026-11-11', ...mcu } });

test('follow-up list: initial Follow-Up without a final result (or still Follow-Up), active employees only', async () => {
  const { followUpRows } = await load('pages/follow-up/followUp.js');
  const models = [model('a'), model('b', { finalResult: 'Follow-Up' }), model('c', { finalResult: 'Fit' }), model('d', { initialResult: 'Fit' }), model('e', {}, { isActive: false })];
  assert.deepEqual(followUpRows(models).map(r => r.employee.employeeId), ['a', 'b']);
});

test('follow-up stats: completed this month counts finished ones (old code could never count them), critical = older than 14 days', async () => {
  const { followUpStats } = await load('pages/follow-up/followUp.js');
  const now = new Date('2026-11-20T12:00:00');
  const models = [
    model('a', { mcuDate: '2026-11-15' }), model('b', { mcuDate: '2026-10-01' }), model('c', { mcuDate: '2026-11-01' }),
    model('done1', { finalResult: 'Fit', updatedAt: '2026-11-05' }),
    model('done2', { finalResult: 'Unfit', updatedAt: '2026-10-28' }),
    model('still', { finalResult: 'Follow-Up', mcuDate: '2026-11-18' })
  ];
  const stats = followUpStats(models, now);
  assert.equal(stats.total, 4);
  assert.equal(stats.completed, 1);
  assert.equal(stats.critical, 2);
});

test('follow-up search and notes', async () => {
  const { searchRows, departmentsOf, shortNotes } = await load('pages/follow-up/followUp.js');
  const rows = [model('A1', {}, { name: 'Budi Santoso' }), model('B2', {}, { name: 'Siti', department: 'IT' })];
  assert.deepEqual(searchRows(rows, { q: 'budi' }).map(r => r.employee.employeeId), ['A1']);
  assert.deepEqual(searchRows(rows, { q: 'b2' }).map(r => r.employee.employeeId), ['B2']);
  assert.deepEqual(searchRows(rows, { department: 'IT' }).map(r => r.employee.employeeId), ['B2']);
  assert.deepEqual(departmentsOf(rows), ['IT', 'Produksi']);
  assert.equal(shortNotes(''), '-');
  assert.equal(shortNotes('x'.repeat(120)).length, 103);
  assert.equal(shortNotes('pendek'), 'pendek');
});
