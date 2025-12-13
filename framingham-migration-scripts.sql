/**
 * Framingham CVD Risk Assessment - Database Migration Scripts
 * Execute in Supabase SQL Editor
 *
 * This script creates the framingham_assessment table needed for Framingham assessment feature.
 *
 * NOTE: The following columns already exist in the database and do NOT need to be added:
 * ✅ job_titles.risk_level (already exists with constraint)
 * ✅ mcus.smoking_status (already exists with constraint)
 * ✅ mcus.exercise_frequency (already exists with constraint)
 *
 * This script ONLY creates the framingham_assessment table for storing assessment results.
 */

-- ============================================
-- VERIFY EXISTING COLUMNS (Safe to run)
-- ============================================
-- The following columns should already exist in your database:
-- SELECT column_name FROM information_schema.columns WHERE table_name='job_titles' AND column_name='risk_level';
-- SELECT column_name FROM information_schema.columns WHERE table_name='mcus' AND column_name IN ('smoking_status', 'exercise_frequency');

-- ============================================
-- CREATE framingham_assessment TABLE
-- ============================================
CREATE TABLE public.framingham_assessment (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  mcu_id character varying NOT NULL UNIQUE,
  employee_id character varying NOT NULL,

  -- Raw scores per parameter
  jenis_kelamin_score integer,
  umur_score integer,
  job_risk_score integer,
  smoking_score integer,
  exercise_score integer,
  tekanan_darah_score integer,
  bmi_score integer,
  gdp_score integer,
  kolesterol_score integer,
  trigliserida_score integer,
  hdl_score integer,

  -- Final result
  total_score integer,
  risk_category character varying CHECK (risk_category IN ('low', 'medium', 'high')),

  -- Snapshot of assessment data (for audit trail & reference)
  assessment_data jsonb,

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by character varying,

  -- Foreign key constraints
  CONSTRAINT framingham_assessment_mcu_id_fkey
    FOREIGN KEY (mcu_id) REFERENCES public.mcus(mcu_id) ON DELETE CASCADE,
  CONSTRAINT framingham_assessment_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_framingham_assessment_employee_id
  ON public.framingham_assessment(employee_id);
CREATE INDEX idx_framingham_assessment_created_at
  ON public.framingham_assessment(created_at DESC);
CREATE INDEX idx_framingham_assessment_risk_category
  ON public.framingham_assessment(risk_category);

-- Add comment on table
COMMENT ON TABLE public.framingham_assessment IS 'RAHMA (Risk Assessment Health Management Analytics) - Framingham CVD Risk Score assessments';
COMMENT ON COLUMN public.framingham_assessment.assessment_data IS 'JSON snapshot of all 11 parameters and calculation details for audit trail';

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (Optional but recommended)
-- ============================================
-- Uncomment if you use RLS in your Supabase setup
-- ALTER TABLE public.framingham_assessment ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SUMMARY OF CHANGES
-- ============================================
-- ℹ️  COLUMNS ALREADY EXIST (no action needed):
-- ✅ job_titles.risk_level (default 'moderate') - ALREADY EXISTS
-- ✅ mcus.smoking_status (nullable) - ALREADY EXISTS
-- ✅ mcus.exercise_frequency (nullable) - ALREADY EXISTS
--
-- 🆕 NEW TABLE CREATED:
-- ✅ framingham_assessment - Complete schema with indexes and constraints
--
-- NEXT STEPS:
-- 1. Execute this script in Supabase SQL Editor (only creates framingham_assessment table)
-- 2. Verify table creation with query:
--    SELECT table_name FROM information_schema.tables WHERE table_name='framingham_assessment';
-- 3. The dashboard will automatically use existing columns: risk_level, smoking_status, exercise_frequency
-- 4. Start using Assessment RAHMA Dashboard feature
