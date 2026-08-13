const test = require('node:test');
const assert = require('node:assert/strict');
const {
  R2DirectUploadService,
  PDF_MAX_BYTES
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
          ContentLength: 1024,
          Metadata: {
            owner: 'user-1',
            employeeid: 'EMP-1',
            mcuid: 'MCU-1',
            purpose: 'mcu-pdf-upload'
          }
        };
      }
      if (name === 'GetObjectCommand') {
        return { Body: { transformToByteArray: async () => Buffer.from('%PDF-') } };
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
    publicUrl: key => `https://files.example/${key}`,
    ...overrides
  });
  return { service, commands, signedCommands };
}

test('prepare binds a five-minute PDF upload to user and MCU metadata', async () => {
  const { service, signedCommands } = serviceFixture();
  const result = await service.preparePdfUpload({
    userId: 'user-1',
    employeeId: 'EMP-1',
    mcuId: 'MCU-1',
    fileName: 'hasil mcu.pdf',
    contentType: 'application/pdf',
    contentLength: PDF_MAX_BYTES
  });

  assert.equal(result.expiresIn, 300);
  assert.match(result.objectKey, /^pending\/mcu-uploads\/user-1\//);
  assert.equal(signedCommands[0].command.input.ContentLength, PDF_MAX_BYTES);
  assert.deepEqual(signedCommands[0].command.input.Metadata, {
    owner: 'user-1',
    employeeid: 'EMP-1',
    mcuid: 'MCU-1',
    purpose: 'mcu-pdf-upload'
  });
  assert.equal(signedCommands[0].options.expiresIn, 300);
});

test('prepare rejects a stored PDF over 5 MB', async () => {
  const { service } = serviceFixture();
  await assert.rejects(
    service.preparePdfUpload({
      userId: 'user-1',
      employeeId: 'EMP-1',
      mcuId: 'MCU-1',
      fileName: 'hasil.pdf',
      contentType: 'application/pdf',
      contentLength: PDF_MAX_BYTES + 1
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
    uuid: () => '00000000-0000-4000-8000-000000000000'
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
  assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
  assert.equal(url.searchParams.has('x-amz-sdk-checksum-algorithm'), false);
});

test('confirm verifies PDF header, saves metadata, and removes pending object', async () => {
  const savedCalls = [];
  const { service, commands } = serviceFixture({
    saveMetadata: async (...args) => {
      savedCalls.push(args);
      return { fileid: 'file-1' };
    }
  });
  const result = await service.confirmPdfUpload({
    userId: 'user-1',
    objectKey: 'pending/mcu-uploads/user-1/upload.pdf',
    fileName: 'hasil mcu.pdf'
  });

  assert.equal(result.file.size, 1024);
  assert.equal(result.storage.path, 'mcu_files/EMP-1/MCU-1/uuid-1.pdf');
  assert.equal(savedCalls.length, 1);
  assert.deepEqual(
    commands.map(command => command.constructor.name),
    ['HeadObjectCommand', 'GetObjectCommand', 'CopyObjectCommand', 'DeleteObjectCommand']
  );
});

test('confirm deletes pending object when the uploaded header is not PDF', async () => {
  const { service, commands } = serviceFixture({
    client: {
      async send(command) {
        commands.push(command);
        if (command.constructor.name === 'HeadObjectCommand') {
          return {
            ContentType: 'application/pdf',
            ContentLength: 1024,
            Metadata: {
              owner: 'user-1',
              employeeid: 'EMP-1',
              mcuid: 'MCU-1',
              purpose: 'mcu-pdf-upload'
            }
          };
        }
        if (command.constructor.name === 'GetObjectCommand') {
          return { Body: { transformToByteArray: async () => Buffer.from('HELLO') } };
        }
        return {};
      }
    }
  });

  await assert.rejects(
    service.confirmPdfUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-1/upload.pdf',
      fileName: 'hasil.pdf'
    }),
    error => error.code === 'UPLOAD_PDF_INVALID'
  );
  assert.equal(commands.at(-1).constructor.name, 'DeleteObjectCommand');
});

test('confirm cleans final and pending objects when metadata insertion fails', async () => {
  const { service, commands } = serviceFixture({ saveMetadata: async () => null });
  await assert.rejects(
    service.confirmPdfUpload({
      userId: 'user-1',
      objectKey: 'pending/mcu-uploads/user-1/upload.pdf',
      fileName: 'hasil.pdf'
    }),
    error => error.code === 'UPLOAD_METADATA_FAILED'
  );

  const deletedKeys = commands
    .filter(command => command.constructor.name === 'DeleteObjectCommand')
    .map(command => command.input.Key);
  assert.deepEqual(deletedKeys, [
    'mcu_files/EMP-1/MCU-1/uuid-1.pdf',
    'pending/mcu-uploads/user-1/upload.pdf'
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
            ContentLength: 1024,
            Metadata: {
              owner: 'user-1',
              employeeid: 'EMP-1',
              mcuid: 'MCU-1',
              purpose: 'mcu-pdf-upload'
            }
          };
        }
        if (name === 'GetObjectCommand') {
          return { Body: { transformToByteArray: async () => Buffer.from('%PDF-') } };
        }
        if (name === 'DeleteObjectCommand') throw new Error('temporary cleanup failure');
        return {};
      }
    }
  });

  const result = await service.confirmPdfUpload({
    userId: 'user-1',
    objectKey: 'pending/mcu-uploads/user-1/upload.pdf',
    fileName: 'hasil.pdf'
  });

  assert.equal(result.storage.path, 'mcu_files/EMP-1/MCU-1/uuid-1.pdf');
  assert.equal(
    commands.filter(command => command.constructor.name === 'DeleteObjectCommand').length,
    1
  );
});
