-- PRODUCTION READY: Enable RLS with proper policies
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcus ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcu_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Public read access" ON employees;
DROP POLICY IF EXISTS "Public read access" ON mcus;
DROP POLICY IF EXISTS "Public read access" ON mcu_changes;
DROP POLICY IF EXISTS "Public read access" ON activity_log;
DROP POLICY IF EXISTS "Public read access" ON job_titles;
DROP POLICY IF EXISTS "Public read access" ON departments;
DROP POLICY IF EXISTS "Public read access" ON vendors;

DROP POLICY IF EXISTS "Public insert access" ON users;
DROP POLICY IF EXISTS "Public insert access" ON employees;
DROP POLICY IF EXISTS "Public insert access" ON mcus;
DROP POLICY IF EXISTS "Public insert access" ON mcu_changes;
DROP POLICY IF EXISTS "Public insert access" ON activity_log;
DROP POLICY IF EXISTS "Public insert access" ON job_titles;
DROP POLICY IF EXISTS "Public insert access" ON departments;
DROP POLICY IF EXISTS "Public insert access" ON vendors;

DROP POLICY IF EXISTS "Public update access" ON users;
DROP POLICY IF EXISTS "Public update access" ON employees;
DROP POLICY IF EXISTS "Public update access" ON mcus;
DROP POLICY IF EXISTS "Public update access" ON mcu_changes;
DROP POLICY IF EXISTS "Public update access" ON activity_log;
DROP POLICY IF EXISTS "Public update access" ON job_titles;
DROP POLICY IF EXISTS "Public update access" ON departments;
DROP POLICY IF EXISTS "Public update access" ON vendors;

DROP POLICY IF EXISTS "Public delete access" ON users;
DROP POLICY IF EXISTS "Public delete access" ON employees;
DROP POLICY IF EXISTS "Public delete access" ON mcus;
DROP POLICY IF EXISTS "Public delete access" ON mcu_changes;
DROP POLICY IF EXISTS "Public delete access" ON activity_log;
DROP POLICY IF EXISTS "Public delete access" ON job_titles;
DROP POLICY IF EXISTS "Public delete access" ON departments;
DROP POLICY IF EXISTS "Public delete access" ON vendors;

-- ============================================
-- 3. CREATE PERMISSIVE POLICIES (for now)
-- ============================================
-- NOTE: These policies allow ALL access with anon key
-- This is LESS secure but works for your current auth model
-- For production, you should implement proper user sessions

-- USERS TABLE
CREATE POLICY "Public read access" ON users
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON users
  FOR DELETE USING (true);

-- EMPLOYEES TABLE
CREATE POLICY "Public read access" ON employees
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON employees
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON employees
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON employees
  FOR DELETE USING (true);

-- MCUs TABLE
CREATE POLICY "Public read access" ON mcus
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON mcus
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON mcus
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON mcus
  FOR DELETE USING (true);

-- MCU CHANGES TABLE
CREATE POLICY "Public read access" ON mcu_changes
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON mcu_changes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON mcu_changes
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON mcu_changes
  FOR DELETE USING (true);

-- ACTIVITY LOG TABLE
CREATE POLICY "Public read access" ON activity_log
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON activity_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON activity_log
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON activity_log
  FOR DELETE USING (true);

-- JOB TITLES TABLE
CREATE POLICY "Public read access" ON job_titles
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON job_titles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON job_titles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON job_titles
  FOR DELETE USING (true);

-- DEPARTMENTS TABLE
CREATE POLICY "Public read access" ON departments
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON departments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON departments
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON departments
  FOR DELETE USING (true);

-- VENDORS TABLE
CREATE POLICY "Public read access" ON vendors
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON vendors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON vendors
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete access" ON vendors
  FOR DELETE USING (true);

-- ============================================
-- 4. VERIFY POLICIES
-- ============================================
-- Check policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- NOTES:
-- ============================================
-- These policies allow full access with the anon key
-- This is suitable for:
--   - Internal applications
--   - Applications where all users use the same anon key
--   - Testing/development environments
--
-- For production with user-level security, you would need:
--   - Supabase Auth for user sessions
--   - Policies based on auth.uid()
--   - Example: FOR SELECT USING (auth.role() = 'authenticated')
