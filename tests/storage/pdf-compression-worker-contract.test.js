const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workerSource = fs.readFileSync(path.join(
  __dirname,
  '../../mcu-management/js/workers/pdfCompressionWorker.mjs'
), 'utf8');

test('PDF worker uses DOM-free canvas and font rendering', () => {
  assert.match(workerSource, /CanvasFactory:\s*WorkerCanvasFactory/);
  assert.match(workerSource, /disableFontFace:\s*true/);
  assert.match(workerSource, /useWorkerFetch:\s*false/);
});

test('PDF worker processes original bytes through every profile', () => {
  assert.match(workerSource, /for \(const profile of PDF_COMPRESSION_PROFILES\)/);
  assert.doesNotMatch(workerSource, /buildCandidate\([^\n]*candidate/);
});
