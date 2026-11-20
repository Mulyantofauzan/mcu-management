'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const MB = 1024 * 1024;

test('file policy: types and size limits', async () => {
  const { checkMcuFile, extensionOf } = await load('lib/filePolicy.js');
  assert.equal(extensionOf('A.Hasil.PDF'), 'pdf');
  assert.equal(extensionOf('noext'), '');
  assert.deepEqual(checkMcuFile({ name: 'a.pdf', size: 9 * MB }), { ok: true, kind: 'pdf' });
  assert.equal(checkMcuFile({ name: 'a.pdf', size: 10 * MB }).code, 'PDF_TOO_LARGE');
  assert.deepEqual(checkMcuFile({ name: 'a.JPG', size: 3 * MB }), { ok: true, kind: 'image' });
  assert.equal(checkMcuFile({ name: 'a.png', size: 3 * MB + 1 }).code, 'IMAGE_TOO_LARGE');
  assert.equal(checkMcuFile({ name: 'a.txt', size: 10 }).code, 'FILE_TYPE_INVALID');
  assert.equal(checkMcuFile({ name: 'a.pdf', size: 0 }).code, 'FILE_EMPTY');
  assert.equal(checkMcuFile(null).code, 'FILE_TYPE_INVALID');
});

function makeUploader(createUploader, { failOn = [], flaky = {} } = {}) {
  const log = [];
  const post = async payload => {
    log.push(payload.action + (payload.fileName ? `:${payload.fileName}` : '') + (payload.fileId ? `:${payload.fileId}` : ''));
    if (payload.action === 'prepare-file-upload') return { success: true, upload: { uploadUrl: 'u', objectKey: `key-${payload.fileName}` } };
    if (payload.action === 'confirm-file-upload') return { success: true, file: { id: `id-${payload.fileName}`, name: payload.fileName, size: 1 } };
    if (payload.action === 'rollback-file-upload') return { success: true };
    throw new Error('unknown');
  };
  const attempts = {};
  const put = async file => {
    attempts[file.name] = (attempts[file.name] || 0) + 1;
    if (failOn.includes(file.name)) { const e = new Error('R2 gagal'); e.code = 'UPLOAD_R2_FAILED'; throw e; }
    if (flaky[file.name] && attempts[file.name] <= flaky[file.name]) { const e = new Error('putus'); e.code = 'UPLOAD_NETWORK_ERROR'; throw e; }
  };
  return { uploader: createUploader({ post, put }), log, attempts };
}

test('uploader: uploads all files with prepare, put, confirm', async () => {
  const { createUploader } = await load('data/files.js');
  const { uploader, log } = makeUploader(createUploader);
  const result = await uploader.uploadAll([{ name: 'a.pdf', size: 1 }, { name: 'b.png', size: 1 }], { employeeId: 'E', mcuId: 'M' });
  assert.equal(result.success, true);
  assert.deepEqual(result.results.map(r => r.fileId), ['id-a.pdf', 'id-b.png']);
  assert.deepEqual(log, ['prepare-file-upload:a.pdf', 'confirm-file-upload:a.pdf', 'prepare-file-upload:b.png', 'confirm-file-upload:b.png']);
});

test('uploader: a failing file rolls back the ones already uploaded', async () => {
  const { createUploader } = await load('data/files.js');
  const { uploader, log } = makeUploader(createUploader, { failOn: ['b.png'] });
  const result = await uploader.uploadAll([{ name: 'a.pdf', size: 1 }, { name: 'b.png', size: 1 }], { employeeId: 'E', mcuId: 'M' });
  assert.equal(result.success, false);
  assert.match(result.error, /R2 gagal/);
  assert.ok(log.includes('rollback-file-upload:id-a.pdf'));
  assert.ok(!log.some(entry => entry.startsWith('rollback-file-upload') && entry.includes('b.png')));
});

test('uploader: retries once on network error or expired URL, not on other errors', async () => {
  const { createUploader } = await load('data/files.js');
  const first = makeUploader(createUploader, { flaky: { 'a.pdf': 1 } });
  assert.equal((await first.uploader.uploadAll([{ name: 'a.pdf', size: 1 }], {})).success, true);
  assert.equal(first.attempts['a.pdf'], 2);
  const second = makeUploader(createUploader, { flaky: { 'a.pdf': 5 } });
  assert.equal((await second.uploader.uploadAll([{ name: 'a.pdf', size: 1 }], {})).success, false);
  assert.equal(second.attempts['a.pdf'], 2);
  const third = makeUploader(createUploader, { failOn: ['a.pdf'] });
  await third.uploader.uploadAll([{ name: 'a.pdf', size: 1 }], {});
  assert.equal(third.attempts['a.pdf'], 1);
});

test('uploader: rollback reports failures', async () => {
  const { createUploader } = await load('data/files.js');
  const uploader = createUploader({ post: async () => { throw new Error('mati'); }, put: async () => {} });
  const outcome = await uploader.rollback([{ success: true, fileId: 'x' }, { success: false }], { employeeId: 'E', mcuId: 'M' });
  assert.equal(outcome.success, false);
  assert.equal(outcome.deletedCount, 0);
  assert.equal(outcome.error, 'mati');
});
