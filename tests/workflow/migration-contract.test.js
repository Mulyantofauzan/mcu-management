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
  'migrations/20260802_05_mcu_workflow_operations.sql',
  'migrations/20260802_06_mcu_followup_evidence.sql',
  'migrations/20260802_07_mcu_analytics_views.sql',
  'migrations/20260825_01_admin_operational_access.sql',
  'migrations/20260902_01_legacy_followup_compatibility.sql'
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

test('permission signatures match declared workflow functions', () => {
  migrationFiles.slice(2).forEach(relativePath => {
    const sql = read(relativePath);
    const declared = new Set(
      [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\s*\(([\s\S]*?)\)\s*RETURNS/g)]
        .map(match => {
          const types = match[2]
            .split(',')
            .filter(parameter => parameter.trim())
            .map(parameter => parameter.trim().split(/\s+/).slice(1).join(' ').toLowerCase());
          return `${match[1].toLowerCase()}(${types.join(',')})`;
        })
    );
    const permissionSignatures = [
      ...sql.matchAll(/'(workflow_\w+\([^']*\))'/g)
    ].map(match => match[1].toLowerCase());

    permissionSignatures.forEach(signature => {
      assert.ok(declared.has(signature), `${relativePath}: unknown signature ${signature}`);
    });
  });
});

test('follow-up evidence is immutable and carries no medical decision', () => {
  const evidence = read(migrationFiles[5]);
  assert.match(evidence, /mcu_followup_submissions/);
  assert.match(evidence, /workflow_submit_followup_evidence/);
  assert.match(evidence, /workflow_reject_immutable_change/);
  assert.doesNotMatch(evidence, /p_medical_result|final_result|current_medical_result\s*=/);
});

test('analytics eligibility uses reviewed activation and calendar months', () => {
  const analytics = read(migrationFiles[6]);
  assert.match(analytics, /v_current_reviewed_mcu/);
  assert.match(analytics, /v_analytics_eligible_current/);
  assert.match(analytics, /v_reviewed_mcu_history/);
  assert.match(analytics, /v_mcu_expiry_overview/);
  assert.match(analytics, /activated_at IS NOT NULL/);
  assert.match(analytics, /MAKE_INTERVAL\(months => config\.expiry_months\)/);
  assert.match(analytics, /Asia\/Makassar/);
  assert.doesNotMatch(analytics, /UPDATE\s+public\.employees[\s\S]*is_active/i);
});

test('expiry preview is server-authorized and bounded', () => {
  const analytics = read(migrationFiles[6]);
  assert.match(analytics, /workflow_preview_expiry_impact/);
  assert.match(analytics, /workflow_require_actor\(p_actor_user_id, ARRAY\['Admin'\]\)/);
  assert.match(analytics, /p_expiry_months < 1 OR p_expiry_months > 120/);
  assert.match(analytics, /TO service_role/);
});

test('Administrator inherits Petugas database operations', () => {
  const access = read(migrationFiles[7]);

  assert.match(access, /actor_role = 'Admin'[\s\S]*'Petugas' = ANY\(p_allowed_roles\)/);
  assert.match(access, /actor_role NOT IN \('Admin', 'Petugas'\)/);
  assert.match(access, /workflow_guard_mcus/);
  assert.match(access, /workflow_guard_raw_child/);
  assert.doesNotMatch(access, /doctor_decision|ARRAY\['Dokter', 'Admin'\]/);
});

test('legacy looping results can enter review without a fabricated cycle', () => {
  const compatibility = read(migrationFiles[8]);

  assert.match(compatibility, /ALTER COLUMN prior_review_cycle_id DROP NOT NULL/);
  assert.match(compatibility, /workflow_status = 'approved_legacy'/);
  assert.match(compatibility, /current_medical_result IN \('Follow-Up', 'Temporary Unfit'\)/);
  assert.match(compatibility, /mcu_record\.workflow_status/);
  assert.match(compatibility, /'legacyFollowup', is_legacy_followup/);
  assert.doesNotMatch(compatibility, /INSERT INTO public\.mcu_review_cycles/);
});
