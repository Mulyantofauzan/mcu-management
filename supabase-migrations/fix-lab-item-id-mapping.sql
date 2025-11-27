-- ============================================
-- FIX LAB ITEM ID MAPPING - Data Correction
-- ============================================
--
-- PROBLEM: Forms were using incorrect data-lab-id values that didn't match
-- actual Supabase database lab_item_id values.
--
-- EXAMPLE:
-- - Form had data-lab-id="1" for "Asam Urat"
-- - But database ID 1 = "SGOT"
-- - Data was saved with wrong lab_item_id, causing values to appear in wrong fields
--
-- SOLUTION: Map old incorrect IDs to correct database IDs
--
-- MAPPING (from old incorrect form IDs to actual database IDs):
-- OLD ID -> NEW ID (Correct Database ID)
-- 1 -> 32 (Asam Urat)
-- 2 -> 31 (Gula Darah 2 JPP)
-- 3 -> 13 (Kreatinin)
-- 4 -> 12 (Ureum)
-- 5 -> 11 (LDL)
-- 6 -> 10 (HDL)
-- 7 -> 9 (Trigliserida)
-- 8 -> 8 (Kolesterol Total)
-- 9 -> 7 (Glukosa Puasa)
-- 10 -> 6 (Trombosit)
-- 11 -> 5 (Leukosit)
-- 12 -> 4 (Hematocrit)
-- 13 -> 3 (Hemoglobin)
-- 14 -> 2 (SGPT)
-- [Note: ID 14 in form never maps to 1/SGOT - that's why SGOT was showing wrong values]

-- ============================================
-- STEP 1: Create mapping table to track corrections
-- ============================================
CREATE TABLE IF NOT EXISTS public.lab_item_id_corrections (
    id SERIAL PRIMARY KEY,
    old_lab_item_id INTEGER NOT NULL,
    new_lab_item_id INTEGER NOT NULL,
    old_name VARCHAR(255),
    new_name VARCHAR(255),
    correction_date TIMESTAMP DEFAULT NOW(),
    records_corrected INTEGER DEFAULT 0,
    UNIQUE(old_lab_item_id, new_lab_item_id)
);

-- ============================================
-- STEP 2: Insert correction mapping
-- ============================================
INSERT INTO public.lab_item_id_corrections (old_lab_item_id, new_lab_item_id, old_name, new_name)
VALUES
    (1, 32, 'Asam Urat (WRONG)', 'Asam Urat'),
    (2, 31, 'Gula Darah 2 JPP (WRONG)', 'Gula Darah 2 JPP'),
    (3, 13, 'Kreatinin (WRONG)', 'Kreatinin'),
    (4, 12, 'Ureum (WRONG)', 'Ureum'),
    (5, 11, 'LDL (WRONG)', 'LDL'),
    (6, 10, 'HDL (WRONG)', 'HDL'),
    (7, 9, 'Trigliserida (WRONG)', 'Trigliserida'),
    (8, 8, 'Kolesterol Total (CORRECT)', 'Kolesterol Total'),
    (9, 7, 'Glukosa Puasa (WRONG)', 'Glukosa Puasa'),
    (10, 6, 'Trombosit (WRONG)', 'Trombosit'),
    (11, 5, 'Leukosit (WRONG)', 'Leukosit'),
    (12, 4, 'Hematocrit (WRONG)', 'Hematocrit'),
    (13, 3, 'Hemoglobin (WRONG)', 'Hemoglobin'),
    (14, 2, 'SGPT (WRONG)', 'SGPT')
ON CONFLICT (old_lab_item_id, new_lab_item_id) DO NOTHING;

-- ============================================
-- STEP 3: Apply corrections to pemeriksaan_lab table
-- ============================================
-- This updates all lab results that have incorrect lab_item_id values

UPDATE public.pemeriksaan_lab pl
SET
    lab_item_id = c.new_lab_item_id,
    updated_at = NOW(),
    updated_by = 'system-correction'
FROM public.lab_item_id_corrections c
WHERE pl.lab_item_id = c.old_lab_item_id
AND NOT EXISTS (
    -- Don't update if a record with the new ID already exists for this MCU/employee
    SELECT 1 FROM public.pemeriksaan_lab pl2
    WHERE pl2.mcu_id = pl.mcu_id
    AND pl2.employee_id = pl.employee_id
    AND pl2.lab_item_id = c.new_lab_item_id
    AND pl2.deleted_at IS NULL
);

-- ============================================
-- STEP 4: Log corrections made
-- ============================================
-- Update count of corrected records
UPDATE public.lab_item_id_corrections c
SET records_corrected = (
    SELECT COUNT(*) FROM public.pemeriksaan_lab
    WHERE lab_item_id = c.new_lab_item_id
    AND updated_by = 'system-correction'
    AND DATE(updated_at) = CURRENT_DATE
);

-- ============================================
-- STEP 5: Optional - View corrections summary
-- ============================================
-- SELECT * FROM public.lab_item_id_corrections ORDER BY old_lab_item_id;
--
-- This shows:
-- - old_lab_item_id: The incorrect ID that was in forms
-- - new_lab_item_id: The correct ID from database
-- - records_corrected: How many records were fixed for this mapping

-- ============================================
-- NOTES:
-- ============================================
-- 1. This migration ONLY fixes data already in the database
-- 2. Forms have been separately updated to use correct data-lab-id values
-- 3. Future data will be saved with correct lab_item_id values
-- 4. If needed, run ROLLBACK to restore old IDs (before they get deleted)
--
-- VERIFICATION:
-- SELECT p.*, li.name FROM public.pemeriksaan_lab p
-- JOIN public.lab_items li ON p.lab_item_id = li.id
-- WHERE p.updated_by = 'system-correction'
-- ORDER BY p.mcu_id, p.lab_item_id;
