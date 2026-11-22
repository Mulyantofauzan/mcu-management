const test = require('node:test');
const assert = require('node:assert/strict');
const { isManagedFileKey } = require('../../server/r2KeyPolicy');

test('managed MCU keys are accepted', () => {
  assert.equal(isManagedFileKey('mcu_files/EMP-001/MCU-9/0b9f2c6e-1111-4222-8333-444455556666.pdf'), true);
  assert.equal(isManagedFileKey('mcu_files/EMP-001/MCU-9/Hasil MCU (1).pdf'), true);
});

test('keys outside the managed namespace are rejected', () => {
  for (const key of [
    'pending/mcu-uploads/USR-1/EMP-001/MCU-9/x.pdf',
    'backups/db.sql',
    'mcu_files/EMP-001/MCU-9',
    'mcu_files/../secret/MCU-9/x.pdf',
    'mcu_files/EMP-001/../x.pdf',
    'mcu_files/EMP 001/MCU-9/x.pdf',
    'mcu_files/EMP-001/MCU-9/a/b.pdf',
    '', null, undefined, 42
  ]) {
    assert.equal(isManagedFileKey(key), false, String(key));
  }
});
