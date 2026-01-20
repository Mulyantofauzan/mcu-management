/**
 * Vision Field Data Cleanup Script
 *
 * This script normalizes inconsistent vision field values in the mcus table.
 * The vision field had inconsistent formats like:
 * - "visus jauh 6/6", "visus dekat 6/6"
 * - "distand vods 6/6", "nearvods 6/6"
 * - "6/6", "6/9", "6/12", etc.
 *
 * Normalization rules:
 * 1. Extract just the acuity value (6/X) from complex strings
 * 2. If contains "jauh" or "distance" or "distand" → "6/X (Far)"
 * 3. If contains "dekat" or "near" or "nearvods" → "6/X (Near)"
 * 4. If just "6/X" → keep as is
 *
 * IMPORTANT: Test on a backup copy first!
 * Execute this in Supabase SQL Editor
 */

-- Step 1: Review current vision field values (check before cleanup)
SELECT DISTINCT vision, COUNT(*) as count
FROM public.mcus
WHERE vision IS NOT NULL AND vision != ''
GROUP BY vision
ORDER BY count DESC;

-- Step 2: Update vision field with normalized values
-- Pattern: Extract "6/X" and add context if available
UPDATE public.mcus
SET vision = CASE
  -- Far vision entries
  WHEN vision ILIKE '%visus jauh%' OR vision ILIKE '%jauh%' OR vision ILIKE '%distance%' OR vision ILIKE '%distand%' THEN
    (regexp_matches(vision, '\d/\d+', 'g'))[1] || ' (Far)'

  -- Near vision entries
  WHEN vision ILIKE '%visus dekat%' OR vision ILIKE '%dekat%' OR vision ILIKE '%near%' OR vision ILIKE '%nearvods%' THEN
    (regexp_matches(vision, '\d/\d+', 'g'))[1] || ' (Near)'

  -- Already correct format (just 6/X)
  WHEN vision ~ '^\d/\d+$' THEN vision

  -- Contains 6/X but with extra text - extract and normalize
  WHEN vision ~ '\d/\d+' THEN (regexp_matches(vision, '\d/\d+', 'g'))[1]

  -- Keep original if can't parse
  ELSE vision
END
WHERE vision IS NOT NULL AND vision != ''
AND (vision ILIKE '%visus%' OR vision ILIKE '%vods%' OR vision ILIKE '%distance%' OR vision ILIKE '%near%' OR vision ILIKE '%distand%');

-- Step 3: Verify results
SELECT DISTINCT vision, COUNT(*) as count
FROM public.mcus
WHERE vision IS NOT NULL AND vision != ''
GROUP BY vision
ORDER BY count DESC;

-- Step 4: Additional cleanup - handle remaining inconsistencies
UPDATE public.mcus
SET vision = TRIM(vision)
WHERE vision IS NOT NULL;

-- Step 5: Handle vision values with trailing/leading spaces or special cases
UPDATE public.mcus
SET vision = '6/6'
WHERE vision ILIKE '6/6%' OR vision ILIKE '%6/6';

UPDATE public.mcus
SET vision = '6/9'
WHERE vision ILIKE '6/9%' OR vision ILIKE '%6/9';

UPDATE public.mcus
SET vision = '6/12'
WHERE vision ILIKE '6/12%' OR vision ILIKE '%6/12';

UPDATE public.mcus
SET vision = '6/18'
WHERE vision ILIKE '6/18%' OR vision ILIKE '%6/18';

-- Final verification
SELECT DISTINCT vision, COUNT(*) as count
FROM public.mcus
WHERE vision IS NOT NULL AND vision != ''
GROUP BY vision
ORDER BY count DESC;

/**
 * Expected result after cleanup:
 * - 6/6
 * - 6/9
 * - 6/12
 * - 6/18
 * - 6/6 (Far)
 * - 6/6 (Near)
 * - etc.
 *
 * All variations like "visus jauh 6/6", "distand vods 6/6" should be consolidated
 */
