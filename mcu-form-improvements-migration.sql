/**
 * MCU Form Improvements - Database Migration Script
 *
 * This script adds new columns for:
 * 1. Vision: Split into vision_distant and vision_near
 * 2. Examination dropdowns: audiometry, spirometry, xray, ekg, treadmill, napza, colorblind
 * 3. Framingham preparation: smoking_status, exercise_frequency
 * 4. Job risk level: for Framingham assessment
 *
 * IMPORTANT: Test on backup first! Execute in Supabase SQL Editor
 */

-- ============================================
-- 1. VISION FIELDS - Split into Distant & Near
-- ============================================
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_distant VARCHAR(50) DEFAULT NULL
CHECK (vision_distant IS NULL OR vision_distant IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS vision_near VARCHAR(50) DEFAULT NULL
CHECK (vision_near IS NULL OR vision_near IN ('6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'));

-- Comments for clarity
COMMENT ON COLUMN public.mcus.vision_distant IS 'Distance vision acuity (6/X notation) - unaided';
COMMENT ON COLUMN public.mcus.vision_near IS 'Near vision acuity (6/X notation) - unaided';

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_mcus_vision_distant ON public.mcus(vision_distant);
CREATE INDEX IF NOT EXISTS idx_mcus_vision_near ON public.mcus(vision_near);

-- ============================================
-- 2. EXAMINATION FIELDS - Replace free text with structured values
-- ============================================

-- Audiometry: Normal, Gangguan Ringan, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS audiometry_status VARCHAR(50) DEFAULT NULL
CHECK (audiometry_status IS NULL OR audiometry_status IN ('Normal', 'Gangguan Ringan', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS audiometry_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.audiometry_status IS 'Audiometry status: Normal, Gangguan Ringan, or other findings';
COMMENT ON COLUMN public.mcus.audiometry_notes IS 'Additional audiometry notes if status is Lainnya';

-- Spirometry: Normal, Restriktif, Obstruktif, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS spirometry_status VARCHAR(50) DEFAULT NULL
CHECK (spirometry_status IS NULL OR spirometry_status IN ('Normal', 'Restriktif', 'Obstruktif', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS spirometry_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.spirometry_status IS 'Spirometry status: Normal, Restriktif, Obstruktif, or other';
COMMENT ON COLUMN public.mcus.spirometry_notes IS 'Additional spirometry notes if status is Lainnya';

-- X-Ray: Normal, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS xray_status VARCHAR(50) DEFAULT NULL
CHECK (xray_status IS NULL OR xray_status IN ('Normal', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS xray_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.xray_status IS 'X-Ray status: Normal or other findings';
COMMENT ON COLUMN public.mcus.xray_notes IS 'X-Ray findings if status is Lainnya';

-- EKG: Normal, Normal Resting ECG, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS ekg_status VARCHAR(50) DEFAULT NULL
CHECK (ekg_status IS NULL OR ekg_status IN ('Normal', 'Normal Resting ECG', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS ekg_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.ekg_status IS 'EKG status: Normal, Normal Resting ECG, or other findings';
COMMENT ON COLUMN public.mcus.ekg_notes IS 'Additional EKG notes if status is Lainnya';

-- Treadmill: Normal, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS treadmill_status VARCHAR(50) DEFAULT NULL
CHECK (treadmill_status IS NULL OR treadmill_status IN ('Normal', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS treadmill_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.treadmill_status IS 'Treadmill test status: Normal or other findings';
COMMENT ON COLUMN public.mcus.treadmill_notes IS 'Treadmill findings if status is Lainnya';

-- NAPZA: Negatif, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS napza_status VARCHAR(50) DEFAULT NULL
CHECK (napza_status IS NULL OR napza_status IN ('Negatif', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS napza_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.napza_status IS 'NAPZA test status: Negatif or other findings';
COMMENT ON COLUMN public.mcus.napza_notes IS 'NAPZA findings if status is Lainnya';

-- Colorblind: Normal, Buta Warna Parsial, Lainnya
ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS colorblind_status VARCHAR(50) DEFAULT NULL
CHECK (colorblind_status IS NULL OR colorblind_status IN ('Normal', 'Buta Warna Parsial', 'Lainnya'));

ALTER TABLE public.mcus
ADD COLUMN IF NOT EXISTS colorblind_notes VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN public.mcus.colorblind_status IS 'Color blindness status: Normal, Buta Warna Parsial, or other';
COMMENT ON COLUMN public.mcus.colorblind_notes IS 'Color blindness details if status is Lainnya';

-- ============================================
-- 3. FRAMINGHAM PREPARATION FIELDS
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
-- 4. JOB TITLES - Add Risk Level for Framingham
-- ============================================

ALTER TABLE public.job_titles
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'moderate'
CHECK (risk_level IN ('low', 'moderate', 'high'));

COMMENT ON COLUMN public.job_titles.risk_level IS 'Occupational risk level for Framingham assessment: low, moderate, high';

-- ============================================
-- 5. VERIFY CHANGES
-- ============================================

-- Check MCU table new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mcus'
  AND column_name IN (
    'vision_distant', 'vision_near',
    'audiometry_status', 'audiometry_notes',
    'spirometry_status', 'spirometry_notes',
    'xray_status', 'xray_notes',
    'ekg_status', 'ekg_notes',
    'treadmill_status', 'treadmill_notes',
    'napza_status', 'napza_notes',
    'colorblind_status', 'colorblind_notes',
    'smoking_status', 'exercise_frequency'
  )
ORDER BY column_name;

-- Check job_titles new column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_titles' AND column_name = 'risk_level';

-- ============================================
-- SUMMARY OF CHANGES
-- ============================================
-- ✅ MCU Table:
--   - vision_distant & vision_near (split from vision)
--   - audiometry_status & audiometry_notes
--   - spirometry_status & spirometry_notes
--   - xray_status & xray_notes
--   - ekg_status & ekg_notes
--   - treadmill_status & treadmill_notes
--   - napza_status & napza_notes
--   - colorblind_status & colorblind_notes
--   - smoking_status (for Framingham)
--   - exercise_frequency (for Framingham)
--
-- ✅ Job Titles Table:
--   - risk_level (for Framingham)
--
-- NEXT STEPS:
-- 1. Execute this script in Supabase SQL Editor
-- 2. Update forms in tambah-karyawan.html with new dropdowns
-- 3. Update kelola-karyawan form for editing
-- 4. Update MCU service to handle new fields
-- 5. Migrate old vision data if needed
