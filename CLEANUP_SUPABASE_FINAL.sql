-- ⚠️ FINAL CLEANUP SCRIPT - REMOVE ALL WEEK 2 TABLES FROM SUPABASE
-- Run this in Supabase SQL Editor to fully clean up

-- Drop archive tables
DROP TABLE IF EXISTS public.audit_logs_archive_202501 CASCADE;
DROP TABLE IF EXISTS public.audit_logs_archive_202502 CASCADE;

-- Drop all RLS policies on audit tables
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable audit log writes for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON public.audit_logs;

DROP POLICY IF EXISTS "Enable mfa audit log reads for authenticated users" ON public.mfa_audit_log;
DROP POLICY IF EXISTS "Enable mfa audit log writes for authenticated users" ON public.mfa_audit_log;
DROP POLICY IF EXISTS "Users can view own mfa audit logs" ON public.mfa_audit_log;
DROP POLICY IF EXISTS "Users can insert own mfa audit logs" ON public.mfa_audit_log;

-- Drop views
DROP VIEW IF EXISTS public.audit_logs_by_event CASCADE;
DROP VIEW IF EXISTS public.audit_logs_by_user CASCADE;
DROP VIEW IF EXISTS public.audit_logs_by_resource CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_audit_logs_user_id CASCADE;
DROP INDEX IF EXISTS public.idx_audit_logs_event_type CASCADE;
DROP INDEX IF EXISTS public.idx_audit_logs_timestamp CASCADE;
DROP INDEX IF EXISTS public.idx_audit_logs_resource_type CASCADE;
DROP INDEX IF EXISTS public.idx_audit_logs_result CASCADE;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at CASCADE;
DROP INDEX IF EXISTS public.idx_audit_logs_user_timestamp CASCADE;
DROP INDEX IF EXISTS public.idx_mfa_audit_log_user_id CASCADE;
DROP INDEX IF EXISTS public.idx_mfa_audit_log_timestamp CASCADE;
DROP INDEX IF EXISTS public.idx_mfa_audit_log_event_type CASCADE;

-- Drop main tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.mfa_audit_log CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Verify cleanup was successful - should show NO audit-related tables
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%audit%' OR table_name LIKE '%mfa%')
ORDER BY table_name;

-- List all public tables (to verify what remains)
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
