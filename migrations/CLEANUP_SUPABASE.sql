-- ⚠️ CLEANUP SCRIPT - REMOVE TABLES CREATED BY WEEK 2 IMPLEMENTATION
-- Run this in Supabase SQL Editor to remove all changes from today

-- Drop tables if they exist
DROP TABLE IF EXISTS public.mfa_audit_log CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Drop indexes if they exist (they should be dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_audit_logs_user_id CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_event_type CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_timestamp CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_resource_type CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_result CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_created_at CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_user_timestamp CASCADE;
DROP INDEX IF EXISTS idx_mfa_audit_log_user_id CASCADE;
DROP INDEX IF EXISTS idx_mfa_audit_log_timestamp CASCADE;
DROP INDEX IF EXISTS idx_mfa_audit_log_event_type CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS public.audit_logs_by_event CASCADE;
DROP VIEW IF EXISTS public.audit_logs_by_user CASCADE;
DROP VIEW IF EXISTS public.audit_logs_by_resource CASCADE;

-- Verify - check what tables remain
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Note: All audit_logs and mfa_audit_log data will be permanently deleted
-- Make sure you have a backup if you need the data!
