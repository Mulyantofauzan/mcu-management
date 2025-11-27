-- ============================================
-- FIX CORRUPTED MIN/MAX REFERENCE RANGES
-- ============================================
--
-- PROBLEM: lab_item_id and min_range_reference/max_range_reference are mismatched
--
-- EXAMPLE FROM YOUR DATA:
-- - lab_item_id='11' (LDL) has min_max='1-200' (should be '66-159')
-- - lab_item_id='2' (SGPT) has min_max='66-159' (should be '4-36')
-- - lab_item_id='6' (Trombosit) has min_max='0.6-1.3' (should be '150-400')
--
-- ROOT CAUSE: Data created with reversed ID mappings
--
-- SOLUTION: Correct all min/max values based on lab_item_id using authoritative mapping
--
-- MAPPING (lab_item_id -> correct min-max):
-- 1 (SGOT) -> 5-34
-- 2 (SGPT) -> 4-36
-- 3 (Hemoglobin) -> 11-17
-- 5 (Leukosit) -> 4-10
-- 6 (Trombosit) -> 150-400
-- 7 (Glukosa Puasa) -> 70-110
-- 8 (Kolesterol Total) -> 1-200
-- 9 (Trigliserida) -> 1-160
-- 10 (HDL) -> 30-200
-- 11 (LDL) -> 66-159
-- 12 (Ureum) -> 4-44.1
-- 13 (Kreatinin) -> 0.6-1.3
-- 31 (Gula Darah 2 JPP) -> 1-187
-- 32 (Asam Urat) -> 2-7

-- ============================================
-- STEP 1: Create correction mapping table
-- ============================================
CREATE TABLE IF NOT EXISTS public.min_max_corrections (
    id SERIAL PRIMARY KEY,
    lab_item_id INTEGER NOT NULL UNIQUE,
    lab_item_name VARCHAR(255),
    old_min DECIMAL(10, 2),
    old_max DECIMAL(10, 2),
    correct_min DECIMAL(10, 2) NOT NULL,
    correct_max DECIMAL(10, 2) NOT NULL,
    correction_date TIMESTAMP DEFAULT NOW(),
    records_corrected INTEGER DEFAULT 0
);

-- ============================================
-- STEP 2: Insert correction mapping
-- ============================================
INSERT INTO public.min_max_corrections (lab_item_id, lab_item_name, correct_min, correct_max)
VALUES
    (1, 'SGOT', 5.00, 34.00),
    (2, 'SGPT', 4.00, 36.00),
    (3, 'Hemoglobin', 11.00, 17.00),
    (5, 'Leukosit', 4.00, 10.00),
    (6, 'Trombosit', 150.00, 400.00),
    (7, 'Gula Darah Puasa', 70.00, 110.00),
    (8, 'Kolesterol Total', 1.00, 200.00),
    (9, 'Trigliserida', 1.00, 160.00),
    (10, 'HDL Kolestrol', 30.00, 200.00),
    (11, 'LDL Kolestrol', 66.00, 159.00),
    (12, 'Ureum', 4.00, 44.10),
    (13, 'Kreatinin', 0.60, 1.30),
    (31, 'Gula Darah 2 JPP', 1.00, 187.00),
    (32, 'Asam Urat', 2.00, 7.00)
ON CONFLICT (lab_item_id) DO UPDATE SET
    correct_min = EXCLUDED.correct_min,
    correct_max = EXCLUDED.correct_max;

-- ============================================
-- STEP 3: Correct pemeriksaan_lab records
-- ============================================
UPDATE public.pemeriksaan_lab pl
SET
    min_range_reference = mc.correct_min,
    max_range_reference = mc.correct_max,
    updated_at = NOW(),
    updated_by = 'system-correction'
FROM public.min_max_corrections mc
WHERE pl.lab_item_id = mc.lab_item_id
AND (
    pl.min_range_reference != mc.correct_min
    OR pl.max_range_reference != mc.correct_max
)
AND pl.deleted_at IS NULL;

-- ============================================
-- STEP 4: Update correction tracking
-- ============================================
UPDATE public.min_max_corrections mc
SET records_corrected = (
    SELECT COUNT(*) FROM public.pemeriksaan_lab
    WHERE lab_item_id = mc.lab_item_id
    AND updated_by = 'system-correction'
    AND DATE(updated_at) = CURRENT_DATE
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check corrections applied:
-- SELECT * FROM public.min_max_corrections ORDER BY lab_item_id;

-- Verify corrected data:
-- SELECT pl.id, pl.mcu_id, pl.lab_item_id, pl.value,
--        pl.min_range_reference, pl.max_range_reference,
--        li.name, li.min_range_reference as db_min, li.max_range_reference as db_max
-- FROM public.pemeriksaan_lab pl
-- JOIN public.lab_items li ON pl.lab_item_id = li.id
-- WHERE pl.updated_by = 'system-correction'
-- ORDER BY pl.lab_item_id;
