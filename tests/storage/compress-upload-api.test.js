const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../../api/compress-upload');

function responseFixture() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    end() {
      return this;
    }
  };
}

test('JSON prepare action delegates with authenticated user ID', async () => {
  const calls = [];
  const handler = createHandler({
    requireAuth: () => ({ app_user_id: 'user-1' }),
    setCorsHeaders: () => {},
    directUploads: {
      async preparePdfUpload(payload) {
        calls.push(payload);
        return { objectKey: 'pending/key.pdf', uploadUrl: 'https://upload.example' };
      }
    }
  });
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      action: 'prepare-pdf-upload',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileName: 'hasil.pdf',
      contentType: 'application/pdf',
      contentLength: 1024
    }
  };
  const res = responseFixture();

  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(calls[0].userId, 'user-1');
});

test('JSON confirm action returns the legacy-compatible response shape', async () => {
  const handler = createHandler({
    requireAuth: () => ({ sub: 'user-1' }),
    setCorsHeaders: () => {},
    directUploads: {
      async confirmPdfUpload() {
        return {
          file: { name: 'hasil.pdf', size: 1024, type: 'pdf' },
          storage: { path: 'mcu_files/EMP-1/MCU-1/file.pdf', publicUrl: 'https://files.example' }
        };
      }
    }
  });
  const res = responseFixture();
  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { action: 'confirm-pdf-upload', objectKey: 'pending/key.pdf', fileName: 'hasil.pdf' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.file.name, 'hasil.pdf');
  assert.equal(res.payload.storage.path, 'mcu_files/EMP-1/MCU-1/file.pdf');
});

test('unknown JSON action returns a specific 400 response', async () => {
  const handler = createHandler({
    requireAuth: () => ({ sub: 'user-1' }),
    setCorsHeaders: () => {},
    directUploads: {}
  });
  const res = responseFixture();
  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { action: 'unknown' }
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'UPLOAD_ACTION_INVALID');
});
