const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');
const html = () => read('mcu-management/pages/tambah-karyawan.html');
const script = () => read('mcu-management/js/pages/tambah-karyawan.js');

test('Add MCU form requires the initial result and notes again', () => {
  assert.match(html(), /<select id="mcu-result"[^>]*\brequired\b/);
  assert.match(html(), /<textarea id="mcu-notes"[^>]*\brequired\b/);
  assert.doesNotMatch(html(), /workflow-review-notice|mcu-result-section/);
});

test('Add MCU form has no runtime reordering or Surat Sehat', () => {
  assert.doesNotMatch(html(), /data-mcu-|mcuFormOrder|Surat Sehat/);
});

test('Add MCU form sections follow the original order', () => {
  const text = html();
  const order = [
    '>Pemeriksaan</h4>',
    'Status Merokok',
    'Pemeriksaan Penglihatan',
    'Pemeriksaan Lab',
    'Pemeriksaan Penunjang',
    '>Riwayat Kesehatan</h4>',
    'Data Rujukan (Opsional)',
    'mcu-file-upload-container',
    '>Hasil</h4>'
  ].map(marker => {
    const index = text.indexOf(marker);
    assert.ok(index > -1, `${marker} missing`);
    return index;
  });
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(text, /Diberikan Oleh \(Dokter\)/);
});

test('Add MCU saves directly without a review submission', () => {
  const source = script();
  assert.doesNotMatch(source, /workflow|Workflow|submitCreatedMcuForReview|savedDraft/);
  assert.match(source, /initialResult:\s*[^\n]*mcu-result/);
  assert.match(source, /initialNotes:\s*[^\n]*mcu-notes/);
  assert.match(source, /mcuBatchService\.saveMCUWithLabResults\(mcuData, labResults, currentUser\)/);
});
