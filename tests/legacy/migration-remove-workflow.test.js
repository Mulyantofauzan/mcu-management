const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '../../migrations/20261113_01_remove_approval_workflow.sql');
const sql = () => fs.readFileSync(file, 'utf8');
const indexOfRe = (re) => sql().search(re);

test('migration is one transaction', () => {
  const text = sql().trim();
  assert.match(text, /^(--[^\n]*\n|\s)*BEGIN;/);
  assert.match(text, /COMMIT;\s*$/);
});

test('migration switches the approval flag off before normalizing data', () => {
  assert.match(sql(), /mcu_approval_workflow_enabled/);
  assert.match(sql(), /'false'::jsonb/);
  const flagOff = indexOfRe(/SET setting_value\s*=\s*'false'::jsonb/);
  const mcuUpdate = indexOfRe(/UPDATE public\.mcus\s+SET workflow_status/);
  assert.ok(flagOff > -1 && mcuUpdate > flagOff, 'flag off must come first');
});

test('migration activates queued MCUs and keeps results empty', () => {
  assert.match(sql(), /workflow_status\s*=\s*'approved_legacy'/);
  assert.match(sql(), /claimed_by\s*=\s*NULL/);
  assert.doesNotMatch(sql(), /initial_result\s*=/);
});

test('migration marks candidates as joined', () => {
  assert.match(sql(), /UPDATE public\.employees\s+SET joining_status\s*=\s*'joined'/);
});

test('migration removes the Surat Sehat type and its trigger', () => {
  assert.match(sql(), /UPDATE public\.mcus\s+SET mcu_type\s*=\s*'Annual'\s+WHERE mcu_type\s*=\s*'Surat Sehat'/);
  assert.match(sql(), /DROP TRIGGER IF EXISTS zzz_validate_health_certificate_history/);
  assert.match(sql(), /DROP FUNCTION IF EXISTS public\.workflow_validate_health_certificate_history\(\)/);
  assert.match(sql(), /CHECK \(mcu_type IN \('Pre-Employee', 'Annual', 'Khusus', 'Final'\)\)/);
});

test('migration restores fixed-expiry views and drops the validity function', () => {
  assert.match(sql(), /CREATE VIEW public\.v_mcu_expiry_overview/);
  assert.match(sql(), /INTERVAL '365 days'/);
  const createView = indexOfRe(/CREATE VIEW public\.v_mcu_expiry_overview/);
  const dropFn = indexOfRe(/DROP FUNCTION IF EXISTS public\.workflow_mcu_validity_months\(TEXT\)/);
  assert.ok(dropFn > createView, 'function dropped only after views no longer use it');
  assert.doesNotMatch(sql().slice(createView), /workflow_mcu_validity_months\(m\.mcu_type\)/);
});

test('migration deactivates Dokter accounts without deleting them', () => {
  assert.match(sql(), /UPDATE public\.users\s+SET active\s*=\s*false\s+WHERE role\s*=\s*'Dokter'/);
});

test('migration is non destructive', () => {
  assert.doesNotMatch(sql(), /DROP TABLE|DELETE FROM|TRUNCATE/i);
});
