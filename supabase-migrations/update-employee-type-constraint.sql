-- Migration: Update employee_type constraint and data
-- This migration updates the employee_type CHECK constraint from ('Company', 'Vendor')
-- to ('Karyawan PST', 'Vendor') and converts existing 'Company' values to 'Karyawan PST'

-- IMPORTANT: Run these commands one at a time in Supabase SQL Editor

-- Step 1: Update all existing 'Company' records to 'Karyawan PST'
UPDATE public.employees
SET employee_type = 'Karyawan PST'
WHERE employee_type = 'Company';

-- Step 2: Drop the employee_type constraint
-- This will allow any value temporarily
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_employee_type_check;

-- Step 3: Add the new constraint with correct values
ALTER TABLE public.employees
ADD CONSTRAINT employees_employee_type_check
CHECK (employee_type IN ('Karyawan PST', 'Vendor'));
