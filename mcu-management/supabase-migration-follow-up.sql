-- ============================================
-- MCU Management - Migration: Add "Follow-Up" Option
-- ============================================
-- Date: 2025-10-18
-- Purpose: Update MCU result constraints to include "Follow-Up" option
--
-- Run this ONLY if you already deployed the old schema.
-- For new deployments, use supabase-schema.sql instead.
--
-- Instructions:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy-paste this entire file
-- 3. Click "Run"
-- 4. Verify: Check Table Editor → mcus → any existing data should still be valid
-- ============================================

-- Step 1: Drop existing constraints
ALTER TABLE mcus
DROP CONSTRAINT IF EXISTS mcus_initial_result_check;

ALTER TABLE mcus
DROP CONSTRAINT IF EXISTS mcus_final_result_check;

ALTER TABLE mcus
DROP CONSTRAINT IF EXISTS mcus_status_check;

-- Step 2: Add new constraints with "Follow-Up" option
ALTER TABLE mcus
ADD CONSTRAINT mcus_initial_result_check
CHECK (initial_result IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit'));

ALTER TABLE mcus
ADD CONSTRAINT mcus_final_result_check
CHECK (final_result IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit'));

ALTER TABLE mcus
ADD CONSTRAINT mcus_status_check
CHECK (status IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit'));

-- Step 3: Update status default if needed
ALTER TABLE mcus
ALTER COLUMN status SET DEFAULT 'Fit';

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the migration was successful:

-- Check constraints were added correctly
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'mcus'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Check if any existing data violates new constraints (should return 0 rows)
SELECT * FROM mcus
WHERE initial_result NOT IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit')
   OR final_result NOT IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit', NULL)
   OR status NOT IN ('Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit');

-- ============================================
-- DONE! Migration Complete
-- ============================================
-- You can now use "Follow-Up" as a valid option for:
-- - initial_result
-- - final_result
-- - status
--
-- Redeploy your frontend application to use the new option.
-- ============================================
