const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');

// transformEmployee() exposes the job title as camelCase `jobTitle`; there is
// no `job_title` on the objects the page keeps in `employees`. Reading the
// snake_case key made Jabatan render "-" in the MCU detail, edit and add modals.
test('transformEmployee exposes jobTitle, not job_title', () => {
  const source = read('mcu-management/js/services/databaseAdapter-transforms.js');
  assert.match(source, /jobTitle: emp\.job_title/);
});

test('Kelola Karyawan reads the employee job title through jobTitle', () => {
  const source = read('mcu-management/js/pages/kelola-karyawan.js');
  const reads = source.match(/\b(?:emp\??|employee)\.job_title\b/g) || [];
  assert.deepEqual(reads, []);
  const lookups = source.match(/\(\s*(?:emp\?|employee)\.jobTitle\b[^)]*\|\|\s*''\s*\)\.trim\(\)/g) || [];
  assert.equal(lookups.length, 3);
});
