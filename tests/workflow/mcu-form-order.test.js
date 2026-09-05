const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('all four complete MCU forms enable canonical ordering', () => {
  const pages = [
    ['mcu-management/pages/tambah-karyawan.html', 1],
    ['mcu-management/pages/kelola-karyawan.html', 2],
    ['mcu-management/pages/follow-up.html', 1]
  ];

  pages.forEach(([file, expectedForms]) => {
    const source = read(file);
    assert.equal((source.match(/data-mcu-canonical-order/g) || []).length, expectedForms, file);
    assert.equal((source.match(/data-mcu-target="metadata"/g) || []).length, expectedForms, file);
    assert.equal((source.match(/data-mcu-target="laboratory"/g) || []).length, expectedForms, file);
    assert.equal((source.match(/data-mcu-target="supporting"/g) || []).length, expectedForms, file);
    assert.match(source, /js\/utils\/mcuFormOrder\.js/, file);
  });
});

test('canonical order utility moves shared fields to approved sections', () => {
  const source = read('mcu-management/js/utils/mcuFormOrder.js');

  ['-doctor', '-hbsag', '-napza', '-colorblind', '-ekg', '-treadmill', '-xray']
    .forEach((suffix) => assert.match(source, new RegExp(suffix), suffix));
  assert.doesNotMatch(source, /:scope/);
});

test('canonical order sorting is numeric and stable', async () => {
  const moduleUrl = pathToFileURL(path.join(
    root,
    'mcu-management/js/utils/mcuFormOrder.js'
  ));
  const { sortByMcuOrder } = await import(moduleUrl.href);
  const nodes = [
    { name: 'result', dataset: { mcuOrder: '110' } },
    { name: 'history', dataset: { mcuOrder: '20' } },
    { name: 'metadata', dataset: { mcuOrder: '10' } }
  ];

  assert.deepEqual(sortByMcuOrder(nodes).map((node) => node.name), [
    'metadata',
    'history',
    'result'
  ]);
});

test('Surat Sehat uses reduced form mode and restores required fields', async () => {
  const moduleUrl = pathToFileURL(path.join(
    root,
    'mcu-management/js/utils/mcuFormOrder.js'
  ));
  const { applyMcuTypeMode, hasFullMcuHistory, normalizeMcuDataForType } = await import(moduleUrl.href);
  const control = { required: true, dataset: {} };
  const section = {
    dataset: { mcuOrder: '40' },
    classList: { hidden: false, toggle(name, state) { this[name] = state; } },
    querySelectorAll: () => [control]
  };
  const form = {
    dataset: {},
    querySelectorAll: () => [section]
  };

  applyMcuTypeMode(form, 'Surat Sehat');
  assert.equal(section.classList.hidden, true);
  assert.equal(control.required, false);
  assert.equal(form.dataset.mcuTypeMode, 'health-certificate');

  applyMcuTypeMode(form, 'Annual');
  assert.equal(section.classList.hidden, false);
  assert.equal(control.required, true);
  assert.equal(form.dataset.mcuTypeMode, 'full');

  assert.equal(hasFullMcuHistory([{ mcuId: '1', mcuType: 'Surat Sehat' }]), false);
  assert.equal(hasFullMcuHistory([{ mcuId: '1', mcuType: 'Annual' }]), true);
  const normalized = normalizeMcuDataForType({
    mcuType: 'Surat Sehat',
    bmi: 22,
    recipient: 'Dokter tujuan',
    medicalHistories: [{}]
  });
  assert.equal(normalized.bmi, null);
  assert.equal(normalized.recipient, 'Dokter tujuan');
  assert.deepEqual(normalized.medicalHistories, []);
});

test('all complete MCU forms offer Surat Sehat', () => {
  const pages = [
    ['mcu-management/pages/tambah-karyawan.html', 1],
    ['mcu-management/pages/kelola-karyawan.html', 2],
    ['mcu-management/pages/follow-up.html', 1]
  ];

  pages.forEach(([file, expected]) => {
    const source = read(file);
    assert.equal((source.match(/value="Surat Sehat"/g) || []).length, expected, file);
  });
});

test('reordering preserves unique field IDs in every complete form', () => {
  const forms = [
    ['mcu-management/pages/tambah-karyawan.html', 'mcu-form'],
    ['mcu-management/pages/kelola-karyawan.html', 'edit-mcu-form'],
    ['mcu-management/pages/kelola-karyawan.html', 'mcu-form'],
    ['mcu-management/pages/follow-up.html', 'mcu-update-form']
  ];

  forms.forEach(([file, formId]) => {
    const source = read(file);
    const form = source.match(new RegExp(`<form id="${formId}"[\\s\\S]*?<\\/form>`))?.[0];
    assert.ok(form, `${file}#${formId}`);
    const ids = [...form.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${file}#${formId} has duplicate IDs`);
  });
});
