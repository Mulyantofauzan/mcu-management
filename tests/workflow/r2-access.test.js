const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccessFile } = require('../../server/r2SignedUrlService');

const file = { uploadedby: 'USR-UPLOADER' };

test('active application roles can open MCU supporting files', () => {
  for (const role of ['Admin', 'Petugas', 'Dokter']) {
    assert.equal(canAccessFile(file, { userId: 'USR-OTHER', role }), true);
  }
});

test('unknown roles are limited to their own uploaded file', () => {
  assert.equal(canAccessFile(file, { userId: 'USR-OTHER', role: 'Unknown' }), false);
  assert.equal(canAccessFile(file, { userId: 'USR-UPLOADER', role: 'Unknown' }), true);
});

test('download API revalidates the active database user', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').resolve(__dirname, '../../api/download-file/index.js'),
    'utf8'
  );
  assert.match(source, /loadActiveUser\(auth, getSupabaseAdmin\(\)\)/);
  assert.doesNotMatch(source, /getAuthorizedSignedUrl\(fileId, auth\)/);
});
