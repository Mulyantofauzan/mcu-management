'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const employee = { name: 'Budi <b>Santoso</b>', age: 37, gender: 'Laki-laki', jobTitle: 'Operator', employeeType: 'Karyawan PST' };
const mcu = { recipient: 'dr. Sp.PD "Penyakit Dalam"', bloodPressure: '150/95', respiratoryRate: '18', pulse: '80', temperature: '36.6', keluhanUtama: 'Sakit kepala', diagnosisKerja: 'Hipertensi', alasanRujuk: 'Kontrol <script>x</script>' };

test('letter fills the referral fields and the doctor, with the old date format', async () => {
  const { buildRujukanHtml } = await load('features/rujukan/rujukanLetter.js');
  const html = buildRujukanHtml(employee, mcu, 'dr. Anindya', new Date('2026-11-05T10:00:00'));
  assert.match(html, /SURAT RUJUKAN<\/h2>/);
  assert.match(html, /SURAT RUJUKAN BALIK<\/h2>/);
  assert.match(html, />150\/95</);
  assert.match(html, />Sakit kepala</);
  assert.match(html, /05 November<\/span> 2026/);
  assert.match(html, /<strong>dr\. Anindya<\/strong>/);
  assert.match(html, /PT\. Putra Sarana Transborneo \/ Operator/);
  assert.match(html, /Perhatian:<\/strong> Surat rujukan harus sesuai dengan asli/);
});

test('every interpolated value is escaped (the letter is written into a print window)', async () => {
  const { buildRujukanHtml, esc } = await load('features/rujukan/rujukanLetter.js');
  const html = buildRujukanHtml(employee, mcu, '<img src=x onerror=alert(1)>', new Date('2026-11-05'));
  assert.doesNotMatch(html, /<b>Santoso<\/b>/);
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /Budi &lt;b&gt;Santoso&lt;\/b&gt;/);
  assert.match(html, /dr\. Sp\.PD &quot;Penyakit Dalam&quot;/);
  assert.equal(esc(null), '');
  assert.equal(esc("a&b'c"), 'a&amp;b&#39;c');
});

test('company name and doctor lookup', async () => {
  const { companyName, doctorNameOf } = await load('features/rujukan/rujukanLetter.js');
  assert.equal(companyName({ employeeType: 'Karyawan PST' }), 'PT. Putra Sarana Transborneo');
  assert.equal(companyName({ employeeType: 'Vendor', vendorName: 'PT Mitra' }), 'PT Mitra');
  assert.equal(companyName({ employeeType: 'Vendor' }), '');
  assert.equal(doctorNameOf('7', [{ id: 7, name: 'dr. A' }]), 'dr. A');
  assert.equal(doctorNameOf(null, []), 'Dr. -');
});

test('print window: blocked pop-up is reported, otherwise the letter is written and closed', async () => {
  const { openPrintWindow } = await load('features/rujukan/rujukanLetter.js');
  assert.throws(() => openPrintWindow('<p>x</p>', { open: () => null }), /pop-up/);
  const written = [];
  const fake = { document: { write: html => written.push(html), close() {} }, focus() {}, print() {}, close() {} };
  openPrintWindow('<p>surat</p>', { open: () => fake });
  assert.deepEqual(written, ['<p>surat</p>']);
});
