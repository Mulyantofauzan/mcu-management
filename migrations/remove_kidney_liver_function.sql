-- Migration: Remove kidney_liver_function column from mcus table
-- Date: 2024-11-18
-- Reason: Field is redundant - SGPT and SGOT provide kidney/liver assessment

BEGIN;

-- Drop the column from mcus table
ALTER TABLE public.mcus
DROP COLUMN IF EXISTS kidney_liver_function;

-- If you want to keep the column for backward compatibility, comment out the above
-- and use this instead to just make it nullable:
-- ALTER TABLE public.mcus
-- ALTER COLUMN kidney_liver_function DROP NOT NULL;

COMMIT;
