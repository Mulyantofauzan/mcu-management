const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const policyPath = path.join(
  __dirname,
  '../../mcu-management/js/services/mcuFilePolicy.mjs'
);

async function policy() {
  return import(pathToFileURL(policyPath).href);
}

test('accepts supported MCU attachments without reading their contents', async () => {
  const { validateMcuFile } = await policy();

  for (const name of ['hasil.PDF', 'scan.png', 'foto.JPG', 'foto.jpeg']) {
    const file = { name, size: 1024 };
    const result = validateMcuFile(file);
    assert.equal(result.file, file);
  }
});

test('rejects unsupported and empty MCU attachments', async () => {
  const { validateMcuFile } = await policy();

  assert.throws(() => validateMcuFile({ name: 'hasil.docx', size: 1024 }), {
    code: 'FILE_TYPE_INVALID'
  });
  assert.throws(() => validateMcuFile({ name: 'hasil.pdf', size: 0 }), {
    code: 'FILE_EMPTY'
  });
});

test('enforces PDF and image size boundaries', async () => {
  const {
    PDF_MAX_BYTES,
    IMAGE_MAX_BYTES,
    validateMcuFile
  } = await policy();

  assert.equal(validateMcuFile({ name: 'hasil.pdf', size: PDF_MAX_BYTES - 1 }).kind, 'pdf');
  assert.throws(() => validateMcuFile({ name: 'hasil.pdf', size: PDF_MAX_BYTES }), {
    code: 'PDF_TOO_LARGE'
  });
  assert.equal(validateMcuFile({ name: 'hasil.png', size: IMAGE_MAX_BYTES }).kind, 'image');
  assert.throws(() => validateMcuFile({ name: 'hasil.jpg', size: IMAGE_MAX_BYTES + 1 }), {
    code: 'IMAGE_TOO_LARGE'
  });
});
