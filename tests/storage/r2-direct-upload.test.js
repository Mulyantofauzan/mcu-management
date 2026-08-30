const test = require('node:test');
const assert = require('node:assert/strict');
const {
  R2DirectUploadService,
  PDF_UPLOAD_LIMIT_BYTES,
  IMAGE_UPLOAD_LIMIT_BYTES
} = require('../../server/r2DirectUploadService');

function serviceFixture(overrides = {}) {
  const commands = [];
  const signedCommands = [];
  const client = {
    async send(command) {
      commands.push(command);
      const name = command.constructor.name;
      if (name === 'HeadObjectCommand') {
        return {
          ContentType: 'application/pdf',
          ContentLength: 1024
        };
      }
      return {};
    }
  };
  let uuid = 0;
  const service = new R2DirectUploadService({
    config: {
      endpoint: 'https://example.r2.cloudflarestorage.com',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      bucket: 'mcu-files'
    },
    client,
    signUrl: async (signedClient, command, options) => {
      signedCommands.push({ signedClient, command, options });
      return 'https://upload.example/signed';
    },
    uuid: () => `uuid-${++uuid}`,
    saveMetadata: async () => ({ fileid: 'file-1' }),
    employeeExists: async () => true,
    findMetadata: async () => ({
      fileid: 'file-1',
      employeeid: 'EMP-1',
      mcuid: 'MCU-1',
      uploadedby: 'user-1',
      supabase_storage_path: 'mcu_files/EMP-1/MCU-1/uuid-1.pdf'
    }),
    deleteMetadata: async () => true,
    publicUrl: key => `https://files.example/${key}`,
    ...overrides
  });
  return { service, commands, signedCommands };
}

test('prepare binds a five-minute PDF upload to an identity-bearing object key', async () => {
  const { service, signedCommands } = serviceFixture();
  const result = await service.preparePdfUpload({
    userId: 'user-1',
    employeeId: 'EMP-1',
    mcuId: 'MCU-1',
    fileName: 'hasil mcu.pdf',
    contentType: 'application/pdf',
    contentLength: PDF_UPLOAD_LIMIT_BYTES - 1
  });

  assert.equal(result.expiresIn, 300);
  assert.equal(result.objectKey, 'pending/mcu-uploads/user-1/EMP-1/MCU-1/uuid-1.pdf');
  assert.equal(signedCommands[0].command.input.ContentLength, PDF_UPLOAD_LIMIT_BYTES - 1);
  assert.equal(signedCommands[0].command.input.Metadata, undefined);
  assert.equal(signedCommands[0].options.expiresIn, 300);
});

test('prepare normalizes and accepts the reported production employee ID', async () => {
  const lookedUp = [];
  const { service, signedCommands } = serviceFixture({
    employeeExists: async employeeId => {
      lookedUp.push(employeeId);
      return true;
    }
  });

  await service.prepareFileUpload({
    userId: ' user-1 ',
    employeeId: ' EMP-20251128-miix34l2-JE5CH\n',
    mcuId: ' MCU-1 ',
    fileName: 'hasil MCU.PDF',
    contentLength: PDF_UPLOAD_LIMIT_BYTES - 1
  });

  assert.deepEqual(lookedUp, ['EMP-20251128-miix34l2-JE5CH']);
  assert.equal(
    signedCommands[0].command.input.Key,
    'pending/mcu-uploads/user-1/EMP-20251128-miix34l2-JE5CH/MCU-1/uuid-1.pdf'
  );
});

test('prepare distinguishes a missing employee from an invalid ID', async () => {
  const { service } = serviceFixture({ employeeExists: async () => false });

  await assert.rejects(
    service.prepareFileUpload({
      userId: 'user-1',
      employeeId: 'EMP-404',
      mcuId: 'MCU-1',
      fileName: 'hasil.pdf',
      contentLength: 1024
    }),
    error => error.code === 'UPLOAD_EMPLOYEE_NOT_FOUND' && error.status === 404
  );
});

test('prepare rejects an employee ID with unsafe path characters', async () => {
  const { service } = serviceFixture();

  await assert.rejects(
    service.prepareFileUpload({
      userId: 'user-1',
      employeeId: 'EMP/../../OTHER',
      mcuId: 'MCU-1',
      fileName: 'hasil.pdf',
      contentLength: 1024
    }),
    error => error.code === 'UPLOAD_VALIDATION_FAILED'
  );
});

test('prepare uses direct upload for every accepted extension', async () => {
  const accepted = [
    ['hasil.PDF', 'pdf', 'application/pdf', PDF_UPLOAD_LIMIT_BYTES - 1],
    ['scan.PNG', 'png', 'image/png', IMAGE_UPLOAD_LIMIT_BYTES],
    ['foto.JPG', 'jpg', 'image/jpeg', IMAGE_UPLOAD_LIMIT_BYTES],
    ['foto.JPEG', 'jpeg', 'image/jpeg', IMAGE_UPLOAD_LIMIT_BYTES]
  ];

  for (const [fileName, extension, contentType, contentLength] of accepted) {
    const { service, signedCommands } = serviceFixture();
    const result = await service.prepareFileUpload({
      userId: 'user-1',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileName,
      contentLength
    });

    assert.match(result.objectKey, new RegExp(`\\.${extension}$`));
    assert.equal(result.requiredHeaders['Content-Type'], contentType);
    assert.equal(signedCommands[0].command.input.ContentLength, contentLength);
  }
});

test('prepare enforces the inclusive image limit', async () => {
  const { service } = serviceFixture();

  await assert.rejects(
    service.prepareFileUpload({
      userId: 'user-1',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileName: 'scan.jpg',
      contentLength: IMAGE_UPLOAD_LIMIT_BYTES + 1
    }),
    error => error.code === 'UPLOAD_SIZE_INVALID'
  );
});

test('prepare rejects a stored PDF at the exclusive 10 MB limit', async () => {
  const { service } = serviceFixture();
  await assert.rejects(
    service.preparePdfUpload({
      userId: 'user-1',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileName: 'hasil.pdf',
      contentType: 'application/pdf',
      contentLength: PDF_UPLOAD_LIMIT_BYTES
    }),
    error => error.code === 'UPLOAD_SIZE_INVALID'
  );
});

test('presigned PUT binds content type without unsupported SDK checksums', async () => {
  const service = new R2DirectUploadService({
    config: {
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      bucket: 'mcu-files'
    },
    uuid: () => '00000000-0000-4000-8000-000000000000',
    employeeExists: async () => true
  });
  const prepared = await service.preparePdfUpload({
    userId: 'user-1',
    employeeId: 'EMP-1',
    mcuId: 'MCU-1',
    fileName: 'hasil.pdf',
    contentType: 'application/pdf',
    contentLength: 1024
  });
  const url = new URL(prepared.uploadUrl);

  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /content-type/);
  assert.equal([...url.searchParams.keys()].some(key => key.startsWith('x-amz-meta-')), false);
  assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
  assert.equal(url.searchParams.has('x-amz-sdk-checksum-algorithm'), false);
});

test('confirm succeeds without custom R2 metadata', async () => {
  const savedCalls = [];
  const { service, commands } = serviceFixture({
    saveMetadata: async (...args) => {
      savedCalls.push(args);
      return { fileid: 'file-1' };
    }
  });
  const result = await service.confirmPdfUpload({
    userId: 'user-1',
    objectKey: 'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.pdf',
    fileName: 'hasil mcu.pdf'
  });

  assert.equal(result.file.size, 1024);
  assert.equal(result.file.id, 'file-1');
  assert.equal(result.storage.path, 'mcu_files/EMP-1/MCU-1/uuid-1.pdf');
  assert.equal(savedCalls.length, 1);
  assert.deepEqual(
    commands.map(command => command.constructor.name),
    ['HeadObjectCommand', 'CopyObjectCommand', 'DeleteObjectCommand']
  );
});

test('confirm preserves the server-controlled JPG extension and content type', async () => {
  const commands = [];
  const { service } = serviceFixture({
    client: {
      async send(command) {
        commands.push(command);
        if (command.constructor.name === 'HeadObjectCommand') {
          return {
            ContentType: 'image/jpeg',
            ContentLength: 2048
          };
        }
        return {};
      }
    }
  });

  const result = await service.confirmFileUpload({
    userId: 'user-1',
    objectKey: 'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.jpg',
    fileName: 'foto MCU.JPG'
  });
  const copy = commands.find(command => command.constructor.name === 'CopyObjectCommand');

  assert.equal(result.file.type, 'image');
  assert.match(result.storage.path, /\.jpg$/);
  assert.equal(copy.input.ContentType, 'image/jpeg');
});

test('rollback deletes only a file owned by the same upload context', async () => {
  const deletedMetadata = [];
  const { service, commands } = serviceFixture({
    deleteMetadata: async fileId => {
      deletedMetadata.push(fileId);
      return true;
    }
  });

  const result = await service.rollbackFileUpload({
    userId: 'user-1',
    employeeId: 'EMP-1',
    mcuId: 'MCU-1',
    fileId: 'file-1'
  });

  assert.equal(result.deleted, true);
  assert.deepEqual(deletedMetadata, ['file-1']);
  assert.equal(
    commands.find(command => command.constructor.name === 'DeleteObjectCommand').input.Key,
    'mcu_files/EMP-1/MCU-1/uuid-1.pdf'
  );
});

test('rollback rejects a file from another employee context', async () => {
  const { service, commands } = serviceFixture();
  await assert.rejects(
    service.rollbackFileUpload({
      userId: 'user-1',
      employeeId: 'EMP-OTHER',
      mcuId: 'MCU-1',
      fileId: 'file-1'
    }),
    error => error.code === 'UPLOAD_FORBIDDEN'
  );
  assert.equal(commands.length, 0);
});

test('confirm cleans final and pending objects when metadata insertion fails', async () => {
  const { service, commands } = serviceFixture({ saveMetadata: async () => null });
  await assert.rejects(
    service.confirmPdfUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.pdf',
      fileName: 'hasil.pdf'
    }),
    error => error.code === 'UPLOAD_METADATA_FAILED'
  );

  const deletedKeys = commands
    .filter(command => command.constructor.name === 'DeleteObjectCommand')
    .map(command => command.input.Key);
  assert.deepEqual(deletedKeys, [
    'mcu_files/EMP-1/MCU-1/uuid-1.pdf',
    'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.pdf'
  ]);
});

test('confirmed final object remains valid when pending cleanup is deferred', async () => {
  const commands = [];
  const { service } = serviceFixture({
    client: {
      async send(command) {
        commands.push(command);
        const name = command.constructor.name;
        if (name === 'HeadObjectCommand') {
          return {
            ContentType: 'application/pdf',
            ContentLength: 1024
          };
        }
        if (name === 'DeleteObjectCommand') throw new Error('temporary cleanup failure');
        return {};
      }
    }
  });

  const result = await service.confirmPdfUpload({
    userId: 'user-1',
    objectKey: 'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.pdf',
    fileName: 'hasil.pdf'
  });

  assert.equal(result.storage.path, 'mcu_files/EMP-1/MCU-1/uuid-1.pdf');
  assert.equal(
    commands.filter(command => command.constructor.name === 'DeleteObjectCommand').length,
    1
  );
});

test('confirm rejects a malformed legacy pending key', async () => {
  const { service, commands } = serviceFixture();

  await assert.rejects(
    service.confirmFileUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-1/upload.pdf',
      fileName: 'hasil.pdf'
    }),
    error => error.code === 'UPLOAD_KEY_INVALID' && error.status === 400
  );
  assert.equal(commands.length, 0);
});

test('confirm rejects a pending key owned by another user', async () => {
  const { service, commands } = serviceFixture();

  await assert.rejects(
    service.confirmFileUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-2/EMP-1/MCU-1/upload.pdf',
      fileName: 'hasil.pdf'
    }),
    error => error.code === 'UPLOAD_FORBIDDEN' && error.status === 403
  );
  assert.equal(commands.length, 0);
});

test('confirm rejects a file name extension that differs from the signed key', async () => {
  const { service, commands } = serviceFixture();

  await assert.rejects(
    service.confirmFileUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.pdf',
      fileName: 'hasil.jpg'
    }),
    error => error.code === 'UPLOAD_KEY_INVALID' && error.status === 400
  );
  assert.equal(commands.length, 0);
});

test('confirm rejects an employee removed after prepare', async () => {
  const { service, commands } = serviceFixture({ employeeExists: async () => false });

  await assert.rejects(
    service.confirmFileUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-1/EMP-1/MCU-1/upload.pdf',
      fileName: 'hasil.pdf'
    }),
    error => error.code === 'UPLOAD_EMPLOYEE_NOT_FOUND' && error.status === 404
  );
  assert.deepEqual(
    commands.map(command => command.constructor.name),
    ['HeadObjectCommand', 'DeleteObjectCommand']
  );
});
