-- ============================================
-- ANALYZE LAB DATA CORRUPTION
-- ============================================
-- Run this FIRST to understand the scale of the problem
-- Do NOT modify data yet - this is read-only analysis
--
-- NOTE: Copy-paste the results into a spreadsheet to track the corruption

-- ============================================
-- STEP 1: Count total lab records by lab_item_id
-- ============================================
SELECT
    pl.lab_item_id,
    li.name,
    COUNT(*) as total_records,
    MIN(pl.created_at) as first_record,
    MAX(pl.created_at) as last_record
FROM public.pemeriksaan_lab pl
LEFT JOIN public.lab_items li ON pl.lab_item_id = li.id
WHERE pl.deleted_at IS NULL
GROUP BY pl.lab_item_id, li.name
ORDER BY pl.lab_item_id;

-- ============================================
-- STEP 2: Identify which IDs have most records
-- (Likely candidates for being wrong)
-- ============================================
SELECT
    pl.lab_item_id,
    li.name,
    COUNT(*) as record_count,
    COUNT(DISTINCT pl.mcu_id) as unique_mcus,
    COUNT(DISTINCT pl.employee_id) as unique_employees
FROM public.pemeriksaan_lab pl
LEFT JOIN public.lab_items li ON pl.lab_item_id = li.id
WHERE pl.deleted_at IS NULL
GROUP BY pl.lab_item_id, li.name
ORDER BY record_count DESC
LIMIT 20;

-- ============================================
-- STEP 3: Check for duplicate lab results in same MCU
-- (This indicates data corruption - should only have 1 value per lab item per MCU)
-- ============================================
SELECT
    pl.mcu_id,
    pl.lab_item_id,
    li.name,
    COUNT(*) as duplicate_count,
    STRING_AGG(pl.value::text, ', ') as values,
    STRING_AGG(pl.id::text, ', ') as record_ids
FROM public.pemeriksaan_lab pl
LEFT JOIN public.lab_items li ON pl.lab_item_id = li.id
WHERE pl.deleted_at IS NULL
GROUP BY pl.mcu_id, pl.lab_item_id, li.name
HAVING COUNT(*) > 1
ORDER BY pl.mcu_id, pl.lab_item_id
LIMIT 50;

-- ============================================
-- STEP 4: Sample some records with their values
-- To verify what kind of data is being stored
-- ============================================
SELECT
    pl.mcu_id,
    pl.employee_id,
    pl.lab_item_id,
    li.name as correct_lab_name,
    pl.value,
    pl.unit,
    pl.min_range_reference,
    pl.max_range_reference,
    pl.created_at,
    pl.created_by
FROM public.pemeriksaan_lab pl
LEFT JOIN public.lab_items li ON pl.lab_item_id = li.id
WHERE pl.deleted_at IS NULL
ORDER BY pl.created_at DESC
LIMIT 100;

-- ============================================
-- STEP 5: Find all MCUs with lab data
-- ============================================
SELECT
    m.mcu_id,
    m.employee_id,
    e.employee_name,
    COUNT(DISTINCT pl.lab_item_id) as unique_lab_items,
    COUNT(*) as total_lab_records,
    MIN(m.created_at) as mcu_created,
    MAX(pl.created_at) as last_lab_record
FROM public.mcus m
LEFT JOIN public.pemeriksaan_lab pl ON m.mcu_id = pl.mcu_id
LEFT JOIN public.employees e ON m.employee_id = e.employee_id
WHERE pl.id IS NOT NULL AND pl.deleted_at IS NULL
GROUP BY m.mcu_id, m.employee_id, e.employee_name
ORDER BY m.created_at DESC
LIMIT 100;

-- ============================================
-- SUMMARY QUERIES
-- ============================================

-- Total corrupted records
SELECT COUNT(*) as total_lab_records FROM public.pemeriksaan_lab WHERE deleted_at IS NULL;

-- Total MCUs with lab data
SELECT COUNT(DISTINCT mcu_id) as mcus_with_lab_data FROM public.pemeriksaan_lab WHERE deleted_at IS NULL;

-- Average records per MCU
SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT mcu_id) as total_mcus,
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT mcu_id), 2) as avg_records_per_mcu
FROM public.pemeriksaan_lab
WHERE deleted_at IS NULL;
