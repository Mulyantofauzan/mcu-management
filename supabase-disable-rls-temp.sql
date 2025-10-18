-- TEMPORARY: Disable RLS for initial seeding
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcus DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcu_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;

-- NOTE: This is NOT secure for production!
-- After seeding data, run supabase-enable-rls-with-policies.sql
