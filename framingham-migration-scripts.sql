/**
 * Framingham CVD Risk Assessment - Database Migration Scripts
 * Execute in Supabase SQL Editor
 *
 * This script creates/alters tables needed for Framingham assessment feature:
 * 1. Add risk_level to job_titles
 * 2. Add smoking_status & exercise_frequency to mcus
 * 3. Create framingham_assessment table for storing results
 */

-- ============================================
-- 1. ALTER job_titles TABLE - Add risk_level
-- ============================================
ALTER TABLE public.job_titles
ADD COLUMN risk_level VARCHAR(20) DEFAULT 'moderate'
  CHECK (risk_level IN ('low', 'moderate', 'high'));

-- Add comment for clarity
COMMENT ON COLUMN public.job_titles.risk_level IS 'Job occupational risk level for Framingham assessment: low, moderate, or high';

-- ============================================
-- 2. ALTER mcus TABLE - Add lifestyle fields
-- ============================================
ALTER TABLE public.mcus
ADD COLUMN smoking_status VARCHAR(50) DEFAULT NULL
  CHECK (smoking_status IS NULL OR smoking_status IN ('tidak_merokok', 'mantan_perokok', 'perokok'));

ALTER TABLE public.mcus
ADD COLUMN exercise_frequency VARCHAR(50) DEFAULT NULL
  CHECK (exercise_frequency IS NULL OR exercise_frequency IN ('>2x_seminggu', '1-2x_seminggu', '1-2x_sebulan', 'tidak_pernah'));

-- Add comments
COMMENT ON COLUMN public.mcus.smoking_status IS 'Smoking status: tidak_merokok (non-smoker), mantan_perokok (former), perokok (current)';
COMMENT ON COLUMN public.mcus.exercise_frequency IS 'Exercise frequency: >2x_seminggu (>2x/week), 1-2x_seminggu (1-2x/week), 1-2x_sebulan (1-2x/month), tidak_pernah (never)';

-- ============================================
-- 3. CREATE framingham_assessment TABLE
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
-- ✅ job_titles: Added risk_level (default 'moderate')
-- ✅ mcus: Added smoking_status and exercise_frequency (nullable)
-- ✅ framingham_assessment: New table created with complete schema
--
-- NEXT STEPS:
-- 1. Execute this script in Supabase SQL Editor
-- 2. Update masterDataService.js to handle risk_level field
-- 3. Update data-master.js form to include risk_level dropdown
-- 4. Start using Assessment RAHMA feature
