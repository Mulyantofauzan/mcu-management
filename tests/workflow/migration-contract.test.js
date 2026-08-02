const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const migrationFiles = [
  'migrations/20260802_01_mcu_workflow_schema.sql',
  'migrations/20260802_02_mcu_workflow_backfill.sql',
  'migrations/20260802_03_mcu_workflow_functions.sql',
  'migrations/20260802_04_mcu_workflow_security.sql',
  'migrations/20260802_05_mcu_workflow_operations.sql'
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('workflow migrations have ordered transaction boundaries', () => {
  migrationFiles.forEach(relativePath => {
    const sql = read(relativePath);
    assert.match(sql, /\bBEGIN;\s/i, relativePath);
    assert.match(sql, /\bCOMMIT;\s*$/i, relativePath);
    assert.equal((sql.match(/\$\$/g) || []).length % 2, 0, relativePath);
    assert.doesNotMatch(sql, /^PERFORM\s/im, relativePath);
  });
});

test('schema keeps employee type, active state, and joining state separate', () => {
  const schema = read(migrationFiles[0]);
  const backfill = read(migrationFiles[1]);

  assert.match(schema, /joining_status/);
  assert.doesNotMatch(schema, /employment_status/);
  assert.match(backfill, /SET joining_status = 'joined'/);
  assert.doesNotMatch(backfill, /SET employee_type\s*=/);
  assert.doesNotMatch(backfill, /SET is_active\s*=/);
});

test('feature flag is off and legacy records bypass new queues', () => {
  const schema = read(migrationFiles[0]);
  const backfill = read(migrationFiles[1]);

  assert.match(schema, /mcu_approval_workflow_enabled', 'false'::jsonb/);
  assert.match(backfill, /workflow_status = 'approved_legacy'/);
  assert.match(backfill, /NEW\.workflow_status := 'draft'/);
});

test('clinical history and generated documents are append-only', () => {
  const schema = read(migrationFiles[0]);
  const security = read(migrationFiles[3]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.mcu_review_cycles/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.mcu_review_documents/);
  assert.match(security, /mcu_review_cycles/);
  assert.match(security, /mcu_review_documents/);
  assert.match(security, /WF_IMMUTABLE_RECORD/);
});

test('workflow functions are service-role only and versioned', () => {
  const functions = read(migrationFiles[2]);
  const operations = read(migrationFiles[4]);

  assert.match(functions, /FROM PUBLIC/);
  assert.match(functions, /TO service_role/);
  assert.match(functions, /WF_VERSION_CONFLICT/);
  assert.match(functions, /FOR UPDATE/);
  assert.match(functions, /idempotency_key/);
  assert.match(operations, /workflow_confirm_doctor_signature/);
  assert.match(operations, /workflow_record_document_failure/);
  assert.match(operations, /workflow_update_expiry_months/);
  assert.match(operations, /workflow_set_feature_flag/);
  assert.match(operations, /TO service_role/);
});
