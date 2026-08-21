const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const policyUrl = pathToFileURL(path.join(
  __dirname,
  '../../mcu-management/js/services/pdfCompressionPolicy.mjs'
));

test('PDF size policy enforces approved thresholds', async () => {
  const policy = await import(policyUrl.href);

  assert.equal(policy.getPdfSizePolicy(5 * policy.MB), 'passthrough');
  assert.equal(policy.getPdfSizePolicy(5 * policy.MB + 1), 'compress');
  assert.equal(policy.getPdfSizePolicy(25 * policy.MB), 'compress');
  assert.equal(policy.getPdfSizePolicy(25 * policy.MB + 1), 'reject');
  assert.equal(policy.getPdfSizePolicy(0), 'invalid');
});

test('PDF header validation rejects lookalike files', async () => {
  const { hasPdfHeader } = await import(policyUrl.href);

  assert.equal(hasPdfHeader(Buffer.from('%PDF-1.7')), true);
  assert.equal(hasPdfHeader(Buffer.from('PK\u0003\u0004')), false);
  assert.equal(hasPdfHeader(Buffer.alloc(0)), false);
});

test('image coverage follows the active graphics transform', async () => {
  const { estimateImageCoverage } = await import(policyUrl.href);
  const ops = { save: 1, restore: 2, transform: 3, paintImageXObject: 4 };
  const result = estimateImageCoverage({
    fnArray: [ops.save, ops.transform, ops.paintImageXObject, ops.restore],
    argsArray: [[], [80, 0, 0, 50, 10, 20], ['image'], []]
  }, ops, 100, 100);

  assert.equal(result.imageCount, 1);
  assert.equal(result.imageCoverage, 0.4);
});

test('page classification is conservative for ambiguous mixed pages', async () => {
  const { classifyPdfPage } = await import(policyUrl.href);

  assert.equal(classifyPdfPage({ textCharacters: 20, imageCount: 1, imageCoverage: 0.8 }), 'scan');
  assert.equal(classifyPdfPage({ textCharacters: 300, imageCount: 1, imageCoverage: 0.6 }), 'scan');
  assert.equal(classifyPdfPage({ textCharacters: 900, imageCount: 1, imageCoverage: 0.6 }), 'text');
  assert.equal(classifyPdfPage({ textCharacters: 40, imageCount: 1, imageCoverage: 0.45 }), 'ambiguous');
  assert.equal(classifyPdfPage({ textCharacters: 300, imageCount: 0, imageCoverage: 0 }), 'text');
});

test('candidate acceptance requires the page count and hard size limit', async () => {
  const policy = await import(policyUrl.href);

  assert.equal(policy.shouldAcceptPdfCandidate(5 * policy.MB, 24, 24), true);
  assert.equal(policy.shouldAcceptPdfCandidate(5 * policy.MB + 1, 24, 24), false);
  assert.equal(policy.shouldAcceptPdfCandidate(4 * policy.MB, 23, 24), false);
});
