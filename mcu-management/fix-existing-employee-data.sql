-- ============================================
-- Fix Existing Employee Data
-- Convert job_title and department from IDs to names
-- ============================================

-- This script fixes employees that have IDs instead of names
-- Run this ONCE in Supabase SQL Editor after deploying the code fix

-- Update job_title: Convert ID to name
UPDATE employees e
SET job_title = jt.name
FROM job_titles jt
WHERE e.job_title::integer = jt.id
  AND e.job_title ~ '^[0-9]+$'; -- Only update if job_title is numeric

-- Update department: Convert ID to name
UPDATE employees e
SET department = d.name
FROM departments d
WHERE e.department::integer = d.id
  AND e.department ~ '^[0-9]+$'; -- Only update if department is numeric

-- Verify the fix
SELECT
  employee_id,
  name,
  job_title,
  department
FROM employees
ORDER BY created_at DESC
LIMIT 10;
