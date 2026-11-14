const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');

test('Follow-Up script has no approval workflow or Surat Sehat logic', () => {
  const source = read('mcu-management/js/pages/follow-up.js');
  assert.doesNotMatch(source, /workflow|Workflow|isHealthCertificate|applyMcuTypeMode|mcuFormOrder|Surat Sehat/);
});

test('Follow-Up page has no reordering attributes or Surat Sehat', () => {
  const html = read('mcu-management/pages/follow-up.html');
  assert.doesNotMatch(html, /data-mcu-|mcuFormOrder|Surat Sehat/);
});

test('Follow-Up completes with a required final result and notes', () => {
  const source = read('mcu-management/js/pages/follow-up.js');
  assert.match(source, /!finalResult \|\| !finalNotes\.trim\(\)/);
  assert.match(source, /downloadRujukanPDFAction/);
  assert.doesNotMatch(source, /referralButton|downloadWorkflowReferralAction/);
});
