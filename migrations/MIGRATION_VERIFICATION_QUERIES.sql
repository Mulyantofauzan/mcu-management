-- ============================================================================
-- Database Migration Verification Queries
-- Copy & paste these queries ke Supabase SQL Editor untuk verify migration
-- ============================================================================

-- ============================================================================
-- 1. VERIFY MFA COLUMNS ADDED TO USERS TABLE
-- ============================================================================
-- Expected: Should show 6 rows with MFA columns

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name LIKE 'mfa%'
ORDER BY ordinal_position;

-- Expected output:
-- column_name         | data_type              | is_nullable
-- mfa_enabled         | boolean                | YES
-- mfa_secret          | character varying      | YES
-- mfa_backup_codes    | text[]                 | YES
-- mfa_enabled_at      | timestamp w/o time... | YES
-- mfa_failed_attempts | integer                | YES
-- mfa_lockout_until   | timestamp w/o time... | YES


-- ============================================================================
-- 2. VERIFY AUDIT_LOGS TABLE CREATED
-- ============================================================================
-- Expected: Should show 1 row "audit_logs"

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'audit_logs';

-- Expected output:
-- table_name
-- audit_logs


-- ============================================================================
-- 3. VERIFY MFA_AUDIT_LOG TABLE CREATED
-- ============================================================================
-- Expected: Should show 1 row "mfa_audit_log"

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'mfa_audit_log';

-- Expected output:
-- table_name
-- mfa_audit_log


-- ============================================================================
-- 4. VERIFY AUDIT_LOGS TABLE STRUCTURE
-- ============================================================================
-- Expected: Should show all columns with correct data types

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Expected columns:
-- id, timestamp, created_at, user_id, user_name, user_role,
-- event_type, resource_type, resource_id, result, severity,
-- ip_address, user_agent, details, recorded_at


-- ============================================================================
-- 5. VERIFY INDEXES CREATED ON AUDIT_LOGS
-- ============================================================================
-- Expected: Should show 7 indexes

SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;

-- Expected indexes:
-- idx_audit_logs_event_type
-- idx_audit_logs_resource_type
-- idx_audit_logs_result
-- idx_audit_logs_severity
-- idx_audit_logs_timestamp
-- idx_audit_logs_user_id
-- idx_audit_logs_user_time


-- ============================================================================
-- 6. VERIFY ROW LEVEL SECURITY (RLS) ENABLED ON AUDIT_LOGS
-- ============================================================================
-- Expected: Should show RLS is enabled

SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('audit_logs', 'mfa_audit_log');

-- Expected output:
-- tablename      | rowsecurity
-- audit_logs     | t
-- mfa_audit_log  | t


-- ============================================================================
-- 7. VERIFY RLS POLICIES CREATED
-- ============================================================================
-- Expected: Should show policies for both tables

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename IN ('audit_logs', 'mfa_audit_log')
ORDER BY tablename, policyname;

-- Expected policies should include:
-- - "Users can view their own audit logs"
-- - "Only system can insert audit logs"
-- - Similar for mfa_audit_log


-- ============================================================================
-- 8. VERIFY REPORTING VIEWS CREATED
-- ============================================================================
-- Expected: Should show 3 views

SELECT
  viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%audit%'
ORDER BY viewname;

-- Expected views:
-- patient_data_access_audit
-- recent_login_attempts
-- unauthorized_access_attempts


-- ============================================================================
-- 9. COMPREHENSIVE MIGRATION CHECK (All-in-One)
-- ============================================================================
-- Run this to check EVERYTHING at once

SELECT
  'MFA Columns' as check_item,
  COUNT(*) as count,
  'Should be 6' as expected
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name LIKE 'mfa%'

UNION ALL

SELECT
  'Audit Tables',
  COUNT(*),
  'Should be 2'
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('audit_logs', 'mfa_audit_log')

UNION ALL

SELECT
  'Audit Indexes',
  COUNT(*),
  'Should be 7'
FROM pg_indexes
WHERE tablename = 'audit_logs'

UNION ALL

SELECT
  'RLS Policies',
  COUNT(*),
  'Should be 4'
FROM pg_policies
WHERE tablename IN ('audit_logs', 'mfa_audit_log')

UNION ALL

SELECT
  'Audit Views',
  COUNT(*),
  'Should be 3'
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%audit%';

-- Expected output:
-- check_item      | count | expected
-- MFA Columns     | 6     | Should be 6
-- Audit Tables    | 2     | Should be 2
-- Audit Indexes   | 7     | Should be 7
-- RLS Policies    | 4     | Should be 4
-- Audit Views     | 3     | Should be 3


-- ============================================================================
-- 10. TEST MFA COLUMNS (Insert test data)
-- ============================================================================
-- OPTIONAL: Test if MFA columns work by inserting data
-- Make sure you have a user first!

-- Test: Check if user table has any users
SELECT id, email FROM users LIMIT 1;

-- If you have a user, test MFA column:
-- UPDATE users
-- SET mfa_enabled = true,
--     mfa_secret = 'TEST_SECRET_BASE32',
--     mfa_failed_attempts = 0
-- WHERE id = 'user_id_here'
-- RETURNING id, email, mfa_enabled, mfa_secret;


-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If all queries above show the expected results:
-- ✅ Migration is SUCCESSFUL
-- ✅ MFA columns added
-- ✅ Audit tables created
-- ✅ Indexes created
-- ✅ RLS enabled
-- ✅ Views created
--
-- You are ready to proceed with Step 2: Create MFA UI Pages
-- ============================================================================
