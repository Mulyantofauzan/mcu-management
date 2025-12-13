/**
 * Relax Smoking Status & Exercise Frequency Constraints - Allow Custom Values
 *
 * Problem: smoking_status and exercise_frequency fields have CHECK constraints
 * that only accept specific values, preventing custom input via "Lainnya" field
 *
 * Solution: Remove strict constraints and allow ANY text value
 * Users can now enter standard values OR custom values
 *
 * Migration script for Supabase
 */

-- ============================================
-- REMOVE STRICT SMOKING STATUS CONSTRAINT
-- ============================================

-- Drop strict smoking status constraint
ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS mcus_smoking_status_check;

-- Add relaxed constraint (allow NULL or any text)
ALTER TABLE public.mcus
ADD CONSTRAINT mcus_smoking_status_check_relaxed
CHECK (smoking_status IS NULL OR smoking_status != '');

-- ============================================
-- REMOVE STRICT EXERCISE FREQUENCY CONSTRAINT
-- ============================================

-- Drop strict exercise frequency constraint
ALTER TABLE public.mcus
DROP CONSTRAINT IF EXISTS mcus_exercise_frequency_check;

-- Add relaxed constraint (allow NULL or any text)
ALTER TABLE public.mcus
ADD CONSTRAINT mcus_exercise_frequency_check_relaxed
CHECK (exercise_frequency IS NULL OR exercise_frequency != '');

-- ============================================
-- NOTES
-- ============================================
-- ✅ After running this migration:
--   1. smoking_status now accepts ANY text value (standard options OR custom)
--   2. exercise_frequency now accepts ANY text value (standard options OR custom)
--   3. Relaxed constraints only prevent empty strings (still allow NULL)
--   4. Form "Lainnya" custom input will be accepted by database
--   5. Backward compatible - existing standard values still work
--
-- ✅ Original constraints were:
--   - smoking_status: ('Tidak', 'Mantan Perokok', 'Merokok', NULL)
--   - exercise_frequency: ('>2x Seminggu', '1-2x Seminggu', '1-2x Sebulan', 'Tidak Pernah', NULL)
--
-- ✅ To revert if needed:
--   ALTER TABLE public.mcus DROP CONSTRAINT mcus_smoking_status_check_relaxed;
--   ALTER TABLE public.mcus DROP CONSTRAINT mcus_exercise_frequency_check_relaxed;
--   Then restore original constraints from add-risk-scoring.sql
