'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const mcu = (id, date, initial, extra = {}) => ({ mcuId: id, mcuDate: date, initialResult: initial, status: initial, ...extra });

test('period filters', async () => {
  const { filterByPeriod } = await load('pages/health-history/healthHistory.js');
  const now = new Date('2026-11-20T12:00:00');
  const list = [mcu('a', '2026-11-01', 'Fit'), mcu('b', '2026-08-01', 'Fit'), mcu('c', '2026-03-01', 'Fit'), mcu('d', '2025-12-31', 'Fit')];
  assert.equal(filterByPeriod(list, 'all', now).length, 4);
  assert.deepEqual(filterByPeriod(list, 'year', now).map(m => m.mcuId), ['a', 'b', 'c']);
  assert.deepEqual(filterByPeriod(list, '6months', now).map(m => m.mcuId), ['a', 'b']);
  assert.deepEqual(filterByPeriod(list, '3months', now).map(m => m.mcuId), ['a']);
});

test('summary counts initial results and reports the latest', async () => {
  const { summarize } = await load('pages/health-history/healthHistory.js');
  const list = [mcu('a', '2025-01-01', 'Fit'), mcu('b', '2026-01-01', 'Follow-Up'), mcu('c', '2024-01-01', 'Unfit'), mcu('d', '2023-01-01', 'Fit')];
  assert.deepEqual(summarize(list), { fit: 2, unfit: 1, followUp: 1, latest: 'Follow-Up' });
  assert.deepEqual(summarize([]), { fit: 0, unfit: 0, followUp: 0, latest: '-' });
  assert.equal(summarize([{ mcuId: 'x', mcuDate: '2026-01-01', status: 'Unfit' }]).unfit, 1);
});

test('timeline is oldest first with levels per result', async () => {
  const { timelinePoints } = await load('pages/health-history/healthHistory.js');
  const points = timelinePoints([mcu('b', '2026-02-01', 'Unfit'), mcu('a', '2026-01-01', 'Fit'), mcu('c', '2026-03-01', 'Follow-Up'), mcu('d', '2026-04-01', 'Whatever')]);
  assert.deepEqual(points.map(p => [p.mcuId, p.level]), [['a', 3], ['b', 1], ['c', 2], ['d', 0]]);
});

test('notes helpers', async () => {
  const { noteOf, shortNote } = await load('pages/health-history/healthHistory.js');
  assert.equal(noteOf({ initialNotes: '  ', finalNotes: 'akhir' }), '');
  assert.equal(noteOf({ initialNotes: ' awal ', finalNotes: 'akhir' }), 'awal');
  assert.equal(shortNote({ initialNotes: 'x'.repeat(130) }).length, 103);
});
