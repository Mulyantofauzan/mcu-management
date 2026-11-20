'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('selection helpers', async () => {
  const { toggle, toggleAll, prune } = await load('pages/data-terhapus/selection.js');
  assert.deepEqual(toggle([], 'a'), ['a']);
  assert.deepEqual(toggle(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(toggleAll(['a'], ['a', 'b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(toggleAll(['a', 'b'], ['a', 'b']), []);
  assert.deepEqual(toggleAll([], []), []);
  assert.deepEqual(prune(['a', 'x'], ['a', 'b']), ['a']);
});

test('runBatch keeps going after a failure and reports it', async () => {
  const { runBatch, batchMessage } = await load('pages/data-terhapus/selection.js');
  const seen = [];
  const result = await runBatch(['a', 'b', 'c'], async id => { seen.push(id); if (id === 'b') throw new Error('mati'); });
  assert.deepEqual(seen, ['a', 'b', 'c']);
  assert.equal(result.ok, 2);
  assert.deepEqual(result.failed, [{ id: 'b', message: 'mati' }]);
  assert.deepEqual(batchMessage('MCU', 'di-restore', { ok: 3, failed: [] }), { text: '3 MCU berhasil di-restore', warning: false });
  assert.deepEqual(batchMessage('karyawan', 'dihapus permanen', result), { text: '2 berhasil, 1 gagal (mati)', warning: true });
});
