const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const readerPath = path.join(
  __dirname,
  '../../mcu-management/js/utils/mcuFormReader.js'
);

test('reads values only from the submitted MCU form', async () => {
  const { createMcuFormReader } = await import(pathToFileURL(readerPath).href);
  const controls = new Map([
    ['#mcu-doctor', { value: '12' }],
    ['#mcu-result', { value: 'Fit' }]
  ]);
  const readValue = createMcuFormReader({
    querySelector: selector => controls.get(selector) || null
  });

  assert.equal(readValue('mcu-doctor'), '12');
  assert.equal(readValue('mcu-result'), 'Fit');
});

test('reports the missing MCU field instead of throwing a raw null error', async () => {
  const { createMcuFormReader } = await import(pathToFileURL(readerPath).href);
  const readValue = createMcuFormReader({ querySelector: () => null });

  assert.throws(() => readValue('mcu-doctor'), error => {
    assert.equal(error.code, 'MCU_FORM_FIELD_MISSING');
    assert.equal(error.fieldId, 'mcu-doctor');
    return true;
  });
});
