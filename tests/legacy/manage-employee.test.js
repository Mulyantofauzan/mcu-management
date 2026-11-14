const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');

test('Kelola Karyawan script has no approval workflow or Surat Sehat logic', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  assert.doesNotMatch(source, /workflow|Workflow|isHealthCertificate|hasFullMcuHistory|normalizeMcuDataForType|applyMcuTypeMode|mcuFormOrder|Surat Sehat/);
});

test('Kelola Karyawan page has no correction queue and no reordering attributes', () => {
  const html = read('mcu-management/pages/kelola-karyawan.html');
  assert.doesNotMatch(html, /workflow-correction|data-mcu-|mcuFormOrder|Surat Sehat/);
});

test('Kelola Karyawan add and edit forms require the medical result again', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  const html = read('mcu-management/pages/kelola-karyawan.html');
  assert.match(source, /validateMCUForm\(mcuData\)/);
  assert.doesNotMatch(source, /requireMedicalResult/);
  assert.match(html, /<select id="mcu-result"[^>]*\brequired\b/);
  assert.match(html, /<textarea id="mcu-notes"[^>]*\brequired\b/);
});

test('MCUs without a result show a placeholder badge instead of "undefined"', async () => {
  const source = read('mcu-management/js/utils/uiHelpers.js');
  assert.match(source, /if \(!status\) return '<span class="badge badge-secondary">Belum ada hasil<\/span>'/);
  assert.match(read('mcu-management/js/pages/kelola-karyawan.js'), /getStatusBadge\(mcu\.initialResult\)/);
});

test('Edit MCU saves final result and notes directly', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  assert.match(source, /updateData\.finalResult = finalResult/);
  assert.doesNotMatch(source, /!workflowEnabled/);
});
