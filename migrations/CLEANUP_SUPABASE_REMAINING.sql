-- ✅ CLEANUP REMAINING TABLES - Run this if main tables already deleted
-- This handles the case where audit_logs table doesn't exist

-- Drop child archive tables first (if they still exist)
DROP TABLE IF EXISTS public.audit_logs_archive_202501 CASCADE;
DROP TABLE IF EXISTS public.audit_logs_archive_202502 CASCADE;

-- Drop parent archive table (if it still exists)
DROP TABLE IF EXISTS public.audit_logs_archive CASCADE;

-- Drop mfa_audit_log if still exists
DROP TABLE IF EXISTS public.mfa_audit_log CASCADE;

-- ✅ Verify cleanup - check what audit-related tables remain
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%audit%' OR table_name LIKE '%mfa%')
ORDER BY table_name;

-- Expected result: (0 rows) - no audit or mfa tables should remain

-- ✅ List all remaining public tables
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: Only original tables (employees, mcus, users, departments, etc)
-- Should NOT see anything with 'audit' or 'mfa' in the name
