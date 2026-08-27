const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, normalizeMultipartFile } = require('../../api/compress-upload');

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

test('canonical prepare action supports every accepted attachment type', async () => {
  const calls = [];
  const handler = createHandler({
    requireAuth: () => ({ app_user_id: 'user-1' }),
    setCorsHeaders: () => {},
    directUploads: {
      async prepareFileUpload(payload) {
        calls.push(payload);
        return { objectKey: 'pending/key.png', uploadUrl: 'https://upload.example' };
      }
    }
  });
  const res = responseFixture();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      action: 'prepare-file-upload',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileName: 'scan.png',
      contentLength: 1024
    }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(calls[0].fileName, 'scan.png');
});

test('rollback action delegates with authenticated upload context', async () => {
  const calls = [];
  const handler = createHandler({
    requireAuth: () => ({ app_user_id: 'user-1' }),
    setCorsHeaders: () => {},
    directUploads: {
      async rollbackFileUpload(payload) {
        calls.push(payload);
        return { deleted: true };
      }
    }
  });
  const res = responseFixture();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      action: 'rollback-file-upload',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileId: 'file-1'
    }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls[0], {
    userId: 'user-1',
    employeeId: 'EMP-1',
    mcuId: 'MCU-1',
    fileId: 'file-1'
  });
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

test('canonical confirm action returns the uploaded file ID', async () => {
  const calls = [];
  const handler = createHandler({
    requireAuth: () => ({ app_user_id: 'user-1' }),
    setCorsHeaders: () => {},
    directUploads: {
      async confirmFileUpload(payload) {
        calls.push(payload);
        return {
          file: { id: 'file-1', name: 'scan.jpg', size: 1024, type: 'image' },
          storage: { path: 'mcu_files/EMP-1/MCU-1/file.jpg', publicUrl: 'https://files.example' }
        };
      }
    }
  });
  const res = responseFixture();

  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      action: 'confirm-file-upload',
      objectKey: 'pending/mcu-uploads/user-1/file.jpg',
      fileName: 'scan.jpg'
    }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.file.id, 'file-1');
  assert.deepEqual(calls[0], {
    userId: 'user-1',
    objectKey: 'pending/mcu-uploads/user-1/file.jpg',
    fileName: 'scan.jpg'
  });
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

test('multipart format follows filename extension instead of browser MIME', () => {
  assert.deepEqual(normalizeMultipartFile('HASIL.PDF'), {
    fileName: 'HASIL.PDF',
    contentType: 'application/pdf'
  });
  assert.deepEqual(normalizeMultipartFile('scan.PNG'), {
    fileName: 'scan.PNG',
    contentType: 'image/png'
  });
  assert.deepEqual(normalizeMultipartFile('foto.jpeg'), {
    fileName: 'foto.jpeg',
    contentType: 'image/jpeg'
  });
  assert.equal(normalizeMultipartFile('laporan.docx'), null);
});
