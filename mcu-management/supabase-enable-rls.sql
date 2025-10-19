-- ============================================
-- MCU Management System - Row Level Security Policies
-- ============================================
-- Run this AFTER supabase-schema.sql
-- This enables RLS and creates permissive policies for all tables

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcus ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcu_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE PERMISSIVE POLICIES
-- ============================================
-- These policies allow full access when using the anon key
-- For production, you should replace these with more restrictive policies

-- USERS TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON users
  FOR DELETE USING (true);

-- EMPLOYEES TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON employees
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON employees
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON employees
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON employees
  FOR DELETE USING (true);

-- MCUS TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON mcus
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON mcus
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON mcus
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON mcus
  FOR DELETE USING (true);

-- MCU_CHANGES TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON mcu_changes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON mcu_changes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON mcu_changes
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON mcu_changes
  FOR DELETE USING (true);

-- JOB_TITLES TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON job_titles
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON job_titles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON job_titles
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON job_titles
  FOR DELETE USING (true);

-- DEPARTMENTS TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON departments
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON departments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON departments
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON departments
  FOR DELETE USING (true);

-- VENDORS TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON vendors
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON vendors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON vendors
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON vendors
  FOR DELETE USING (true);

-- ACTIVITY_LOG TABLE POLICIES
CREATE POLICY "Enable read access for all users" ON activity_log
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON activity_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON activity_log
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON activity_log
  FOR DELETE USING (true);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that RLS is enabled and policies exist

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'employees', 'mcus', 'mcu_changes', 'job_titles', 'departments', 'vendors', 'activity_log');

-- This query should show rowsecurity = true for all tables
