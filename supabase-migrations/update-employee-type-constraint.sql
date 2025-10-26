-- Migration: Update employee_type constraint and data
-- This migration updates the employee_type CHECK constraint from ('Company', 'Vendor')
-- to ('Karyawan PST', 'Vendor') and converts existing 'Company' values to 'Karyawan PST'

BEGIN;

-- Step 1: Update all existing 'Company' records to 'Karyawan PST'
UPDATE public.employees
SET employee_type = 'Karyawan PST'
WHERE employee_type = 'Company' AND deleted_at IS NULL;

-- Step 2: Drop the old constraint (need to drop the table constraint)
ALTER TABLE public.employees
DROP CONSTRAINT employees_employee_type_check;

-- Step 3: Add the new constraint
ALTER TABLE public.employees
ADD CONSTRAINT employees_employee_type_check
CHECK (employee_type IN ('Karyawan PST', 'Vendor'));

COMMIT;
