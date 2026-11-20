'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('pageWindow keeps first, last and a window around the current page', async () => {
  const { pageWindow } = await load('lib/pagination.js');
  assert.deepEqual(pageWindow(1, 1), []);
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(1, 10), [1, 2, 3, 4, 5, '...', 10]);
  assert.deepEqual(pageWindow(5, 10), [1, '...', 3, 4, 5, 6, 7, '...', 10]);
  assert.deepEqual(pageWindow(10, 10), [1, '...', 6, 7, 8, 9, 10]);
  assert.deepEqual(pageWindow(2, 7), [1, 2, 3, 4, 5, '...', 7]);
});

test('day boundaries cover the whole local day', async () => {
  const { dayStartIso, dayEndIso } = await load('lib/dates.js');
  const start = new Date(dayStartIso('2026-11-20T15:00:00'));
  const end = new Date(dayEndIso('2026-11-20T03:00:00'));
  assert.equal(start.getHours(), 0);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMilliseconds(), 999);
  assert.ok(end > start);
});

test('activity CSV: header comments, filters, quoting and detail fallback', async () => {
  const { activityCsv, exportFileName, detailOf } = await load('pages/activity-log/activityLog.js');
  const now = new Date('2026-11-20T10:00:00');
  const rows = [{ timestamp: '2026-11-19T10:00:00Z', userName: '', action: 'create', target: 'MCU', details: 'Type: Annual, Date: 2026-01-01' }, { timestamp: null, userName: 'Admin', action: 'delete', target: 'Employee', targetId: 'KRY-1', details: '' }];
  const csv = activityCsv(rows, { action: 'create', target: '', userName: '', fromDate: '', toDate: '' }, now);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = csv.slice(1).split('\n');
  assert.equal(lines[0], '# Activity Log Export');
  assert.ok(lines.includes('# - Action: create'));
  assert.ok(!lines.some(line => line.startsWith('# - Target')));
  assert.equal(lines[lines.indexOf('Waktu,User,Aksi,Target,Detail') + 1].endsWith('"Type: Annual, Date: 2026-01-01"'), true);
  assert.ok(lines.at(-1).startsWith('-,Admin,delete,Employee,KRY-1'));
  assert.ok(!activityCsv(rows, { action: '' }, now).includes('Filters Applied'));
  assert.equal(detailOf({ details: '', targetId: '' }), '-');
  assert.equal(exportFileName({ action: 'update', target: 'MCU' }, now), 'activity-log-action-update-target-MCU-2026-11-20.csv');
  assert.equal(exportFileName({}, now), 'activity-log-2026-11-20.csv');
});

test('activity filters build the expected query calls', async () => {
  const { applyFilters } = await load('data/activityLog.js');
  const calls = [];
  const query = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return query; } });
  applyFilters(query, { action: 'create', target: 'MCU', userName: 'ani', fromDate: '2026-11-01', toDate: '2026-11-30' });
  assert.deepEqual(calls.map(c => c[0]), ['eq', 'eq', 'ilike', 'gte', 'lte']);
  assert.deepEqual(calls[2], ['ilike', 'user_name', '%ani%']);
  calls.length = 0;
  applyFilters(query, {});
  assert.equal(calls.length, 0);
});
