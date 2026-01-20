# Database Verification & Integrity Check Guide

## Overview

This guide provides instructions for verifying the integrity of the `pemeriksaan_lab` table and checking if min/max reference ranges are still corrupted or have been fixed.

## Background: The Data Corruption Issue

### What Happened
The database had corrupted min/max reference ranges where lab items had incorrect range values assigned:
- Example: `lab_item_id='11'` (LDL) had `min_range='1' max_range='200'` (should be `min='66' max='159'`)
- This caused inconsistent data that didn't match the actual lab item's reference ranges

### Root Cause
Forms were originally created with reversed/incorrect lab_item_id mappings, causing the database to store mismatched data.

### Solution
A SQL migration was created to fix the corrupted data: `fix-corrupted-min-max-ranges.sql`

---

## Verification Methods

### Method 1: Browser Console (Recommended for Quick Check)

1. Open the application in your browser
2. Open Developer Tools (F12 or Right-click → Inspect)
3. Go to the **Console** tab
4. Run the following command:

```javascript
import { verifyDatabaseIntegrity } from '/js/utils/dbVerification.js'
await verifyDatabaseIntegrity()
```

This will:
- ✅ Check all `pemeriksaan_lab` records
- ✅ Compare against the authoritative `labItemsMapping.js` file
- ✅ Identify any corrupted or mismatched ranges
- ✅ Display a detailed report in the console

### Method 2: Using Supabase Dashboard

1. Navigate to [Supabase Dashboard](https://app.supabase.com)
2. Select the project: `xqyuktsfjvdqfhulobai`
3. Go to SQL Editor
4. Run the following query to check for corruption:

```sql
-- Check for min/max mismatches
SELECT
    pl.id,
    pl.lab_item_id,
    li.name,
    li.min_range_reference as expected_min,
    li.max_range_reference as expected_max,
    pl.min_range_reference as actual_min,
    pl.max_range_reference as actual_max,
    pl.value
FROM public.pemeriksaan_lab pl
LEFT JOIN public.lab_items li ON pl.lab_item_id = li.id
WHERE pl.deleted_at IS NULL
    AND (pl.min_range_reference != li.min_range_reference
         OR pl.max_range_reference != li.max_range_reference)
ORDER BY pl.lab_item_id
LIMIT 100;
```

---

## Fixing Corrupted Data

### Applying the Migration

If you find corrupted data, you need to run the SQL migration to fix it:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select the project: `xqyuktsfjvdqfhulobai`
3. Go to **SQL Editor**
4. Create a new query and copy the contents of:
   ```
   /supabase-migrations/fix-corrupted-min-max-ranges.sql
   ```
5. **Read the file carefully** before executing:
   - The migration creates a tracking table (`min_max_corrections`)
   - It updates all mismatched records with correct values from `labItemsMapping.js`
   - It records which records were corrected

6. Click **Run** to execute the migration
7. Review the results in the `public.min_max_corrections` table

### Verification After Migration

After running the migration, verify it was successful:

```sql
-- Check the corrections tracking table
SELECT * FROM public.min_max_corrections ORDER BY lab_item_id;

-- Verify data is now clean
SELECT
    COUNT(*) as total_records,
    SUM(CASE WHEN min_range_reference IN (5,4,11,4,150,70,1,1,30,66,1,4,1,2)
             AND max_range_reference IN (34,36,17,10,400,110,200,160,200,159,187,44.1,187,7)
             THEN 1 ELSE 0 END) as correct_records
FROM public.pemeriksaan_lab
WHERE deleted_at IS NULL;
```

---

## Lab Items Reference

The authoritative source for all lab items is in `labItemsMapping.js`:

| ID | Name | Unit | Min | Max |
|----|------|------|-----|-----|
| 1 | SGOT | IU/L | 5 | 34 |
| 2 | SGPT | IU/L | 4 | 36 |
| 3 | Hemoglobin | g/dL | 11 | 17 |
| 5 | Leukosit | 10^3/μL | 4 | 10 |
| 6 | Trombosit | 10^3/μL | 150 | 400 |
| 7 | Glukosa Puasa | mg/dL | 70 | 110 |
| 8 | Kolesterol Total | mg/dL | 1 | 200 |
| 9 | Trigliserida | mg/dL | 1 | 160 |
| 10 | HDL | mg/dL | 30 | 200 |
| 11 | LDL | mg/dL | 66 | 159 |
| 12 | Ureum | mg/dL | 4 | 44.1 |
| 13 | Kreatinin | mg/dL | 0.6 | 1.3 |
| 31 | Gula Darah 2 JPP | mg/dL | 1 | 187 |
| 32 | Asam Urat | mg/dL | 2 | 7 |

---

## Files Involved

- **Database mapping file**: `/mcu-management/js/data/labItemsMapping.js`
- **Verification utility**: `/mcu-management/js/utils/dbVerification.js`
- **Migration script**: `/supabase-migrations/fix-corrupted-min-max-ranges.sql`
- **Forms with correct ordering**:
  - `/pages/kelola-karyawan.html` (Edit MCU modal - lines 459-473)
  - `/pages/kelola-karyawan.html` (Tambah MCU modal - lines 613-627) - Just updated ✅
  - `/pages/tambah-karyawan.html` (Tambah MCU modal - lines 403-417) ✅

---

## Status Check Checklist

After fixing the data corruption, verify:

- [ ] Run browser verification: `await verifyDatabaseIntegrity()`
- [ ] Check that all 14 lab items show "✅ CLEAN"
- [ ] Verify no "❌ CORRUPTED" items are found
- [ ] Test creating a new MCU with lab results - should all save correctly
- [ ] Test editing an existing MCU - should preserve all lab values
- [ ] Check the kelola-karyawan.html "Tambah MCU" modal displays items in correct order
- [ ] Check the tambah-karyawan.html "Tambah MCU" modal displays items in correct order

---

## Important Notes

⚠️ **Critical**: The lab items are displayed in a specific order (not by ID):
```
5, 6, 3, 7, 31, 8, 10, 11, 9, 32, 12, 13, 1, 2
(Leukosit, Trombosit, Hemoglobin, Glukosa Puasa, Gula Darah 2 JPP,
 Kolesterol Total, HDL, LDL, Trigliserida, Asam Urat, Ureum,
 Kreatinin, SGOT, SGPT)
```

This ordering is defined in:
- `labItemsMapping.js` → `sortLabResultsByDisplayOrder()` function
- HTML forms (all use 3-column grid layout)

✅ **Confirmed Fixed**:
- Data is being saved to the database correctly
- `employeeId` is included in all lab result payloads
- Forms validate and save partial submissions (minimum 1 item)
- Lab item ordering is now consistent across all forms

---

## Troubleshooting

### Verification shows corruption
→ Run the SQL migration `fix-corrupted-min-max-ranges.sql`

### Still seeing issues after migration
→ Contact database administrator or check Supabase logs

### Data not saving correctly
→ Check that all 14 lab items are using correct `data-lab-id` values
→ Verify `labItemsMapping.js` hasn't been modified with wrong values

### Display order wrong
→ Check HTML file's `data-lab-id` attributes match the mapping
→ Ensure 3-column grid is used for proper layout

---

Last Updated: 2025-11-27
