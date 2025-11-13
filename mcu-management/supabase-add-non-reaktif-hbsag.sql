-- ============================================
-- Migration: Add 'Non-Reaktif' to HBsAg constraint
-- ============================================
-- This migration adds 'Non-Reaktif' as a valid option for the HBsAg field
-- Run this SQL in Supabase SQL Editor if the table already exists

-- Step 1: Drop the existing constraint
ALTER TABLE mcus DROP CONSTRAINT IF EXISTS mcus_hbsag_check;

-- Step 2: Add the new constraint with 'Non-Reaktif' option
ALTER TABLE mcus ADD CONSTRAINT mcus_hbsag_check
  CHECK (hbsag IN ('', 'Negatif', 'Positif', 'Reaktif', 'Non-Reaktif'));

-- Verify the constraint was added
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name='mcus' AND constraint_name LIKE '%hbsag%';
