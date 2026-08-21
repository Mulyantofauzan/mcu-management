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

function failingWorker(code = 'PDF_CORRUPT') {
  return class FailingWorker {
    listeners = {};

    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }

    postMessage() {
      queueMicrotask(() => this.listeners.message({
        data: { type: 'error', code, message: 'PDF tidak dapat diproses.' }
      }));
    }

    terminate() {}
  };
}

test('PDF up to 5 MB passes through based on its extension', async () => {
  global.File = File;
  global.Worker = class UnexpectedWorker {
    constructor() {
      throw new Error('worker must not start');
    }
  };

  const { preparePdfForUpload } = await import(pathToFileURL(servicePath).href);
  const file = new File([Buffer.from('scanner-specific-content')], 'SMALL.PDF', {
    type: 'application/octet-stream'
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

test('failed compression falls back to the original PDF below 10 MB', async () => {
  global.File = File;
  global.Worker = failingWorker();

  const { preparePdfForUpload } = await import(pathToFileURL(servicePath).href);
  const file = new File([Buffer.alloc(5 * 1024 * 1024 + 1)], 'scanner.pdf', {
    type: 'application/octet-stream'
  });
  const progress = [];
  const result = await preparePdfForUpload(file, {
    onProgress: event => progress.push(event)
  });

  assert.equal(result.file, file);
  assert.equal(result.compressed, false);
  assert.equal(result.method, 'compression-fallback');
  assert.match(progress.at(-1).message, /file asli/i);

  delete global.File;
  delete global.Worker;
});

test('failed compression rejects an original PDF at 10 MB', async () => {
  global.File = File;
  global.Worker = failingWorker('PDF_PROCESSING_FAILED');

  const { preparePdfForUpload } = await import(pathToFileURL(servicePath).href);
  const file = new File([Buffer.alloc(10 * 1024 * 1024)], 'large.pdf', {
    type: 'application/pdf'
  });

  await assert.rejects(
    preparePdfForUpload(file),
    error => error.code === 'PDF_PROCESSING_FAILED'
  );

  delete global.File;
  delete global.Worker;
});

test('compression worker keeps a stable source buffer and has a timeout', () => {
  const source = fs.readFileSync(servicePath, 'utf8');

  assert.doesNotMatch(source, /\[sourceBuffer\]/);
  assert.match(source, /PDF_PROCESSING_TIMEOUT_MS/);
  assert.match(source, /PDF_ERROR_CODES\.PROCESSING_TIMEOUT/);
});
