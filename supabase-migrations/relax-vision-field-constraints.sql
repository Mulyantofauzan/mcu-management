/**
 * Relax Vision Field Constraints - Allow Custom Values
 *
 * Problem: Vision field CHECK constraints only accept specific 6/X values
 * This prevents users from entering custom values via "Lainnya" field
 *
 * Solution: Remove strict constraints and allow ANY text value for vision fields
 * Users can now enter standard values (6/6, 6/9, etc.) OR custom values
 *
 * Migration script for Supabase
 */

-- ============================================
-- REMOVE STRICT VISION FIELD CONSTRAINTS
-- ============================================

-- Drop all vision field constraints to allow custom values
ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_distant_unaided_left;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_distant_unaided_right;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_distant_spectacles_left;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_distant_spectacles_right;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_near_unaided_left;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_near_unaided_right;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_near_spectacles_left;

ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS check_vision_near_spectacles_right;

-- ============================================
-- ADD RELAXED CONSTRAINTS (OPTIONAL - Just for NULL/empty check)
-- ============================================

-- Optional: Add simple constraint to allow NULL or any text
-- This is more permissive but still prevents completely invalid values
ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_unaided_left_relaxed
CHECK (vision_distant_unaided_left IS NULL OR vision_distant_unaided_left != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_unaided_right_relaxed
CHECK (vision_distant_unaided_right IS NULL OR vision_distant_unaided_right != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_spectacles_left_relaxed
CHECK (vision_distant_spectacles_left IS NULL OR vision_distant_spectacles_left != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_spectacles_right_relaxed
CHECK (vision_distant_spectacles_right IS NULL OR vision_distant_spectacles_right != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_unaided_left_relaxed
CHECK (vision_near_unaided_left IS NULL OR vision_near_unaided_left != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_unaided_right_relaxed
CHECK (vision_near_unaided_right IS NULL OR vision_near_unaided_right != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_spectacles_left_relaxed
CHECK (vision_near_spectacles_left IS NULL OR vision_near_spectacles_left != '');

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_spectacles_right_relaxed
CHECK (vision_near_spectacles_right IS NULL OR vision_near_spectacles_right != '');

-- ============================================
-- NOTES
-- ============================================
-- ✅ After running this migration:
--   1. Vision fields now accept ANY text value (standard 6/X OR custom)
--   2. Relaxed constraints only prevent empty strings (still allow NULL)
--   3. Form "Lainnya" custom input will be accepted by database
--   4. Backward compatible - existing 6/X values still work
--
-- ✅ To revert if needed:
--   ALTER TABLE public.mcus DROP CONSTRAINT check_vision_*_relaxed;
--   Then restore original constraints from mcu-form-improvements-migration.sql
