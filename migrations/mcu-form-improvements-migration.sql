/**
 * MCU Form Improvements - Database Migration Script (UPDATED)
 *
 * This script adds new columns for:
 * 1. Vision: Detailed 8-field structure with unaided + with-spectacles for both eyes, distant + near
 *    - vision_distant_unaided_left
 *    - vision_distant_unaided_right
 *    - vision_distant_spectacles_left
 *    - vision_distant_spectacles_right
 *    - vision_near_unaided_left
 *    - vision_near_unaided_right
 *    - vision_near_spectacles_left
 *    - vision_near_spectacles_right
 * 2. Framingham preparation: smoking_status, exercise_frequency
 * 3. Job risk level: for Framingham assessment
 *
 * NOTE: Examination fields (audiometry, spirometry, xray, ekg, treadmill, napza, colorblind)
 * already exist in mcus table. These will store dropdown values OR manual input when user
 * selects "Lainnya" (Other).
 *
 * IMPORTANT: Test on backup first! Execute in Supabase SQL Editor
 */

-- ============================================
-- 1. VISION FIELDS - Detailed 8-field structure
-- ============================================

-- Distant Vision - Unaided
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_distant_unaided_left VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_distant_unaided_right VARCHAR(50) DEFAULT NULL;

-- Distant Vision - With Spectacles
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_distant_spectacles_left VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_distant_spectacles_right VARCHAR(50) DEFAULT NULL;

-- Near Vision - Unaided
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_near_unaided_left VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_near_unaided_right VARCHAR(50) DEFAULT NULL;

-- Near Vision - With Spectacles
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_near_spectacles_left VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_near_spectacles_right VARCHAR(50) DEFAULT NULL;

-- Add constraints for valid vision acuity values (all 8 fields)
ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_unaided_left
CHECK (vision_distant_unaided_left IS NULL OR vision_distant_unaided_left IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_unaided_right
CHECK (vision_distant_unaided_right IS NULL OR vision_distant_unaided_right IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_spectacles_left
CHECK (vision_distant_spectacles_left IS NULL OR vision_distant_spectacles_left IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_distant_spectacles_right
CHECK (vision_distant_spectacles_right IS NULL OR vision_distant_spectacles_right IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_unaided_left
CHECK (vision_near_unaided_left IS NULL OR vision_near_unaided_left IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_unaided_right
CHECK (vision_near_unaided_right IS NULL OR vision_near_unaided_right IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_spectacles_left
CHECK (vision_near_spectacles_left IS NULL OR vision_near_spectacles_left IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD CONSTRAINT check_vision_near_spectacles_right
CHECK (vision_near_spectacles_right IS NULL OR vision_near_spectacles_right IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

-- Comments for clarity
COMMENT ON COLUMN public.mcus.vision_distant_unaided_left IS 'Distance vision - unaided - left eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_distant_unaided_right IS 'Distance vision - unaided - right eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_distant_spectacles_left IS 'Distance vision - with spectacles - left eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_distant_spectacles_right IS 'Distance vision - with spectacles - right eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_near_unaided_left IS 'Near vision - unaided - left eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_near_unaided_right IS 'Near vision - unaided - right eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_near_spectacles_left IS 'Near vision - with spectacles - left eye (6/X notation)';
COMMENT ON COLUMN public.mcus.vision_near_spectacles_right IS 'Near vision - with spectacles - right eye (6/X notation)';

-- Create indexes for queries
CREATE INDEX IF NOT EXISTS idx_mcus_vision_distant_unaided_left ON public.mcus(vision_distant_unaided_left);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_distant_unaided_right ON public.mcus(vision_distant_unaided_right);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_distant_spectacles_left ON public.mcus(vision_distant_spectacles_left);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_distant_spectacles_right ON public.mcus(vision_distant_spectacles_right);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_near_unaided_left ON public.mcus(vision_near_unaided_left);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_near_unaided_right ON public.mcus(vision_near_unaided_right);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_near_spectacles_left ON public.mcus(vision_near_spectacles_left);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_near_spectacles_right ON public.mcus(vision_near_spectacles_right);

-- ============================================
-- 2. FRAMINGHAM PREPARATION FIELDS
-- ============================================

-- Smoking Status: Tidak Merokok, Mantan Perokok, Perokok
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50) DEFAULT NULL
CHECK (smoking_status IS NULL OR smoking_status IN ('Tidak Merokok', 'Mantan Perokok', 'Perokok'));

COMMENT ON COLUMN public.mcus.smoking_status IS 'Smoking status for Framingham: Tidak Merokok, Mantan Perokok, Perokok';

-- Exercise Frequency: >2x Seminggu, 1-2x Seminggu, 1-2x Sebulan, Tidak Pernah
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS exercise_frequency VARCHAR(50) DEFAULT NULL
CHECK (exercise_frequency IS NULL OR exercise_frequency IN ('>2x Seminggu', '1-2x Seminggu', '1-2x Sebulan', 'Tidak Pernah'));

COMMENT ON COLUMN public.mcus.exercise_frequency IS 'Exercise frequency for Framingham: >2x Seminggu, 1-2x Seminggu, 1-2x Sebulan, Tidak Pernah';

-- ============================================
-- 3. JOB TITLES - Add Risk Level for Framingham
-- ============================================

ALTER TABLE public.job_titles
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'moderate'
CHECK (risk_level IN ('low', 'moderate', 'high'));

COMMENT ON COLUMN public.job_titles.risk_level IS 'Occupational risk level for Framingham assessment: low, moderate, high';

-- ============================================
-- 4. VERIFY CHANGES
-- ============================================

-- Check MCU table new vision columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mcus'
  AND column_name LIKE 'vision_%'
ORDER BY column_name;

-- Check Framingham fields
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mcus'
  AND column_name IN ('smoking_status', 'exercise_frequency')
ORDER BY column_name;

-- Check job_titles new column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_titles' AND column_name = 'risk_level';

-- ============================================
-- SUMMARY OF CHANGES
-- ============================================
-- ✅ MCU Table:
--   - vision_distant_unaided_left, vision_distant_unaided_right
--   - vision_distant_spectacles_left, vision_distant_spectacles_right
--   - vision_near_unaided_left, vision_near_unaided_right
--   - vision_near_spectacles_left, vision_near_spectacles_right
--   - smoking_status (for Framingham)
--   - exercise_frequency (for Framingham)
--
-- ✅ Job Titles Table:
--   - risk_level (for Framingham)
--
-- NEXT STEPS:
-- 1. Execute this script in Supabase SQL Editor
-- 2. Update tambah-karyawan form with detailed 8-cell vision table
-- 3. Update kelola-karyawan form (both edit and add sections)
-- 4. Update MCU service to handle 8 new vision fields
-- 5. Update form handlers to collect all 8 vision values
-- 6. Update analysis dashboard vision rendering
