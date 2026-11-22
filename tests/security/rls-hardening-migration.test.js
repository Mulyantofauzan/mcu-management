const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(
  path.join(__dirname, '../../migrations/20261122_01_harden_rls_and_function_grants.sql'),
  'utf8'
);

test('migration is a single transaction', () => {
  const text = sql.trim();
  assert.match(text, /^(--[^\n]*\n|\s)*BEGIN;/);
  assert.match(text, /COMMIT;(--[^\n]*(\n|$)|\s)*$/);
});

test('it drops every policy on a data table, not only *_authenticated names', () => {
  assert.match(sql, /SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl/);
  assert.doesNotMatch(sql, /_select_authenticated/);
});

test('hard delete is Admin only for the core record tables', () => {
  assert.match(sql, /admin_delete text\[\] := ARRAY\['employees', 'mcus', 'mcufiles'/);
  assert.match(sql, /_delete_admin/);
  assert.match(sql, /\(auth\.jwt\(\) ->> 'app_role'\) = 'Admin'/);
});

test('audit tables get no UPDATE or DELETE policy', () => {
  assert.match(sql, /append_only text\[\] := ARRAY\['activity_log', 'mcu_changes', 'audit_log_archive'\]/);
  assert.match(sql, /IF NOT \(tbl = ANY \(append_only\)\) THEN/);
});

test('tables missed by the old allowlists get RLS', () => {
  for (const name of ['risk_scores', 'lab_item_id_corrections', 'min_max_corrections']) {
    assert.ok(sql.includes(`'${name}'`), name);
  }
});

test('password_hash is not readable by browser roles', () => {
  assert.match(sql, /REVOKE SELECT ON public\.users FROM authenticated/);
  const grant = sql.match(/GRANT SELECT \(([^)]*)\) ON public\.users TO authenticated/);
  assert.ok(grant, 'column grant present');
  assert.doesNotMatch(grant[1], /password_hash|mfa_/);
});

test('workflow definer functions are revoked from anon and authenticated', () => {
  assert.match(sql, /REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION %s TO service_role/);
  assert.match(sql, /p\.proname <> 'workflow_analytics_config'/);
});

test('activity_log attribution and restore are guarded by triggers', () => {
  assert.match(sql, /CREATE TRIGGER activity_log_bind_user/);
  assert.match(sql, /CREATE TRIGGER guard_restore_admin_only/);
  assert.match(sql, /Only an Admin can restore deleted records/);
});

test('the SPA still only selects the users columns the migration grants', () => {
  const users = fs.readFileSync(path.join(__dirname, '../../web/src/data/users.js'), 'utf8');
  const columns = users.match(/const COLUMNS = '([^']+)'/)[1].split(',').map((c) => c.trim());
  const grant = sql.match(/GRANT SELECT \(([^)]*)\) ON public\.users/)[1].split(',').map((c) => c.trim());
  for (const column of columns) assert.ok(grant.includes(column), column);
});
