const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PrivateStorageService,
  getPrivateStorageConfig,
  assertObjectKey,
  assertSignatureMetadata,
  MAX_SIGNATURE_BYTES
} = require('../../server/workflow/privateStorageService');

const config = {
  endpoint: 'https://example.invalid',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'private'
};

test('missing private storage configuration does not expose environment details', () => {
  assert.throws(
    () => getPrivateStorageConfig({}),
    error => {
      assert.equal(error.message, 'Penyimpanan dokumen privat belum siap. Hubungi Administrator.');
      assert.doesNotMatch(error.message, /bucket|accessKey|secretAccessKey|endpoint/i);
      return true;
    }
  );
});

test('signature metadata accepts only PNG/JPEG up to 2 MB', () => {
  assert.deepEqual(assertSignatureMetadata('image/png', 100), {
    contentType: 'image/png',
    contentLength: 100
  });
  assert.throws(() => assertSignatureMetadata('image/svg+xml', 100));
  assert.throws(() => assertSignatureMetadata('image/png', MAX_SIGNATURE_BYTES + 1));
});

test('private object keys reject traversal and wrong ownership', () => {
  assert.equal(assertObjectKey('doctor-signatures/USR-1/file.png'), 'doctor-signatures/USR-1/file.png');
  assert.throws(() => assertObjectKey('../secret'));
  assert.throws(() => assertObjectKey('doctor-signatures/USR-2/file.png', 'doctor-signatures/USR-1/'));
});

test('signature upload uses private versioned key and five-minute URL', async () => {
  let signedCommand;
  const service = new PrivateStorageService({
    config,
    client: { send: async () => ({}) },
    uuid: () => 'signature-id',
    signUrl: async (_client, command) => {
      signedCommand = command;
      return 'https://signed.invalid/upload';
    }
  });

  const result = await service.createSignatureUpload({
    userId: 'USR-1',
    contentType: 'image/jpeg',
    contentLength: 1234
  });

  assert.equal(result.objectKey, 'doctor-signatures/USR-1/signature-id.jpg');
  assert.equal(result.expiresIn, 300);
  assert.equal(signedCommand.input.Bucket, 'private');
  assert.equal(signedCommand.input.ContentLength, 1234);
});
