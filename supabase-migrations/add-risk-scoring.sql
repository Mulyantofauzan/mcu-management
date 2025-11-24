-- ============================================
-- ADD RISK SCORING FIELDS & TABLES
-- ============================================
-- Migration untuk:
-- 1. Add smoking_status dan exercise_frequency ke mcus table
-- 2. Create risk_scores table untuk store calculated scores
-- 3. Log semua changes ke mcu_changes + activity_log

-- ============================================
-- STEP 1: Add lifestyle fields ke MCUs table
-- ============================================
ALTER TABLE IF EXISTS public.mcus
ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50)
  CHECK (smoking_status IN ('Tidak', 'Mantan Perokok', 'Merokok', NULL)),
ADD COLUMN IF NOT EXISTS exercise_frequency VARCHAR(50)
  CHECK (exercise_frequency IN ('>2x Seminggu', '1-2x Seminggu', '1-2x Sebulan', 'Tidak Pernah', NULL));

-- Add comments untuk dokumentasi
COMMENT ON COLUMN public.mcus.smoking_status IS 'Smoking status: Tidak (No), Mantan Perokok (Former), Merokok (Current)';
COMMENT ON COLUMN public.mcus.exercise_frequency IS 'Exercise frequency: >2x Seminggu (>2x/week), 1-2x Seminggu (1-2x/week), 1-2x Sebulan (1-2x/month), Tidak Pernah (Never)';

-- ============================================
-- STEP 2: Create risk_scores table
-- ============================================
-- Menyimpan latest risk score untuk setiap MCU
-- Diupdate setiap kali MCU di-save atau diupdate
CREATE TABLE IF NOT EXISTS public.risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mcu_id VARCHAR(50) NOT NULL UNIQUE REFERENCES public.mcus(mcu_id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,

    -- Risk score calculation results
    total_score INTEGER NOT NULL,  -- -7 to ~20+
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),

    -- Breakdown: points per category (untuk transparency)
    gender_points INTEGER DEFAULT 0,
    age_points INTEGER DEFAULT 0,
    job_level_points INTEGER DEFAULT 0,
    exercise_points INTEGER DEFAULT 0,
    smoking_points INTEGER DEFAULT 0,
    blood_pressure_points INTEGER DEFAULT 0,
    bmi_points INTEGER DEFAULT 0,
    glucose_points INTEGER DEFAULT 0,
    cholesterol_points INTEGER DEFAULT 0,
    triglyceride_points INTEGER DEFAULT 0,
    hdl_points INTEGER DEFAULT 0,

    -- Metadata
    data_completeness VARCHAR(100),  -- "complete" atau "incomplete (missing: smoking, exercise)"
    calculation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    calculated_by VARCHAR(50),  -- 'system' untuk backfill, user_id untuk manual recalc

    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes untuk fast queries
CREATE INDEX IF NOT EXISTS idx_risk_scores_employee_id ON public.risk_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_risk_level ON public.risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_calculation_timestamp ON public.risk_scores(calculation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_deleted_at ON public.risk_scores(deleted_at);

-- ============================================
-- STEP 3: Create trigger untuk auto update risk_scores
-- ============================================
-- Saat MCU created/updated, risk score akan dihitung otomatis
-- (Implementation di service layer, bukan SQL trigger)
-- Reason: need complex business logic dan data dari employees + lab results

-- ============================================
-- DOCUMENTATION
-- ============================================
-- SCORING MATRIX (from user's spreadsheet):
--
-- 1. JENIS KELAMIN: Wanita=0, Pria=1
-- 2. UMUR: 25-34=-4, 35-39=-3, 40-44=-2, 45-49=0, 50-54=1, 56-59=2, 60-64=3
-- 3. JOB: Low=0, Moderate=1, High=2
-- 4. OLAHRAGA: >2x/minggu=-3, 1-2x/minggu=0, 1-2x/bulan=1, Tidak=2
-- 5. MEROKOK: Tidak=0, Mantan=3, Merokok=4
-- 6. TEKANAN DARAH: <130/85=0, 130-139/85-89=1, 140-159/90-99=2, 160-179/100-109=3, >=180/>=110=4
-- 7. BMI: 13.79-25.99=0, 26-29.99=1, >=30=2
-- 8. GLUKOSA: <=126=0, >=127=2
-- 9. KOLESTEROL: <200=0, 200-239=1, 240-279=2, >=280=3
-- 10. TRIGLISERID: <200=0, 200-299=1, >=300=2
-- 11. HDL: >44=0, 35-44=1, <35=2
--
-- RISK CLASSIFICATION:
-- -7 to 0   = LOW (Pertahankan Pola Hidup Sehat)
-- 1 to 8    = MEDIUM (Promosi Kesehatan + Konsultasi)
-- >=9       = HIGH (Promosi Kesehatan + Follow-Up Rutin)
