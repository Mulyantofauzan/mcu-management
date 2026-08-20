const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { File } = require('node:buffer');
const { pathToFileURL } = require('node:url');

const servicePath = path.join(
  __dirname,
  '../../mcu-management/js/services/pdfCompressionService.js'
);

test('small PDF passes through without starting a worker', async () => {
  global.File = File;
  global.Worker = class UnexpectedWorker {
    constructor() {
      throw new Error('worker must not start');
    }
  };

  const { preparePdfForUpload } = await import(pathToFileURL(servicePath).href);
  const file = new File([Buffer.from('%PDF-1.4\n%%EOF')], 'small.pdf', {
    type: 'application/pdf'
  });
  const progress = [];
  const result = await preparePdfForUpload(file, {
    onProgress: (event) => progress.push(event)
  });

  assert.equal(result.file, file);
  assert.equal(result.compressed, false);
  assert.equal(result.method, 'passthrough');
  assert.equal(result.pageCount, null);
  assert.equal(progress.at(-1).percent, 100);

  delete global.File;
  delete global.Worker;
});

test('compression worker keeps a stable source buffer and has a timeout', () => {
  const source = fs.readFileSync(servicePath, 'utf8');

  assert.doesNotMatch(source, /\[sourceBuffer\]/);
  assert.match(source, /PDF_PROCESSING_TIMEOUT_MS/);
  assert.match(source, /PDF_ERROR_CODES\.PROCESSING_TIMEOUT/);
});
