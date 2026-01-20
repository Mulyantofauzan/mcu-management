# Database Alignment Summary - Framingham Assessment RAHMA

**Date:** 2025-12-13
**Status:** ✅ ALIGNED AND READY
**Last Updated:** After schema verification against actual database

---

## Overview

The Framingham Assessment RAHMA feature requires three database components:
1. **job_titles.risk_level** column
2. **mcus.smoking_status** column
3. **mcus.exercise_frequency** column
4. **framingham_assessment** table (new)

This document confirms the current state of your database against these requirements.

---

## 📊 Database Alignment Status

### Component 1: job_titles.risk_level

**Status:** ✅ **ALREADY EXISTS**

```sql
-- Confirmed in your database schema:
risk_level character varying DEFAULT 'moderate'
  CHECK (risk_level IN ('low', 'moderate', 'high'))
```

**What this column does:**
- Stores occupational risk level for each job title
- Used for job risk scoring in Framingham assessment
- Possible values: `'low'`, `'moderate'`, `'high'`
- Default value: `'moderate'`

**Action Required:** ✅ NONE - Already exists

---

### Component 2: mcus.smoking_status

**Status:** ✅ **ALREADY EXISTS**

```sql
-- Confirmed in your database schema:
smoking_status character varying DEFAULT NULL
  CHECK (smoking_status IS NULL OR smoking_status::text <> ''::text)
```

**What this column does:**
- Records employee smoking status during MCU
- Used for smoking risk scoring
- Can be NULL (empty/not recorded)
- Expected values:
  - `'tidak_merokok'` - Non-smoker
  - `'mantan_perokok'` - Former smoker
  - `'perokok'` - Current smoker

**Action Required:** ✅ NONE - Already exists

---

### Component 3: mcus.exercise_frequency

**Status:** ✅ **ALREADY EXISTS**

```sql
-- Confirmed in your database schema:
exercise_frequency character varying DEFAULT NULL
  CHECK (exercise_frequency IS NULL OR exercise_frequency::text <> ''::text)
```

**What this column does:**
- Records employee exercise frequency during MCU
- Used for exercise protection scoring (negative/protective score)
- Can be NULL (empty/not recorded)
- Expected values:
  - `'>2x_seminggu'` - More than 2x per week (most protective)
  - `'1-2x_seminggu'` - 1-2x per week
  - `'1-2x_sebulan'` - 1-2x per month
  - `'tidak_pernah'` - Never exercises (least protective)

**Action Required:** ✅ NONE - Already exists

---

### Component 4: framingham_assessment Table

**Status:** ❌ **DOES NOT EXIST - NEEDS CREATION**

This is the **ONLY** component that needs to be created in the database.

**Table Purpose:**
- Stores Framingham CVD risk assessment results
- One record per MCU assessment
- Contains all 11 individual parameter scores
- Contains total score and final risk category
- Includes JSONB snapshot of assessment data for audit trail

**Table Structure:**
```sql
CREATE TABLE public.framingham_assessment (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mcu_id character varying NOT NULL UNIQUE,
  employee_id character varying NOT NULL,

  -- 11 Individual Parameter Scores
  jenis_kelamin_score integer,      -- Gender (0-1)
  umur_score integer,               -- Age (-4 to +3)
  job_risk_score integer,           -- Job Risk (0-2)
  smoking_score integer,            -- Smoking (0-4)
  exercise_score integer,           -- Exercise (-3 to +2, protective)
  tekanan_darah_score integer,      -- Blood Pressure (0-4)
  bmi_score integer,                -- BMI (0-2)
  gdp_score integer,                -- Glucose (0-2)
  kolesterol_score integer,         -- Cholesterol (0-3)
  trigliserida_score integer,       -- Triglycerides (0-2)
  hdl_score integer,                -- HDL (-2 to 0, protective)

  -- Final Results
  total_score integer,              -- Sum of all 11 scores (-4 to 26+)
  risk_category character varying,  -- 'low', 'medium', or 'high'

  -- Audit Trail
  assessment_data jsonb,            -- Full calculation snapshot
  created_at timestamp,
  updated_at timestamp,
  created_by character varying,

  -- Constraints & Indexes (see migration script for details)
  FOREIGN KEY (mcu_id) REFERENCES public.mcus(mcu_id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE
);
```

**Action Required:** ✅ RUN THE MIGRATION SCRIPT
```bash
# Execute in Supabase SQL Editor:
-- Copy and run the updated framingham-migration-scripts.sql
```

---

## 🚀 What Changed in Migration Script

### Before
The original migration script attempted to:
1. ❌ ALTER job_titles to ADD risk_level (redundant)
2. ❌ ALTER mcus to ADD smoking_status (redundant)
3. ❌ ALTER mcus to ADD exercise_frequency (redundant)
4. ✅ CREATE framingham_assessment table (correct)

### After
The updated migration script now:
1. ✅ SKIPS redundant ALTER statements (avoids errors)
2. ✅ INCLUDES verification comments to confirm existing columns
3. ✅ FOCUSES ONLY on creating framingham_assessment table
4. ✅ INCLUDES clear next steps and verification queries

---

## 📋 Migration Execution Checklist

### Pre-Migration Verification

Run these queries in Supabase SQL Editor to confirm columns exist:

```sql
-- Check job_titles.risk_level
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='job_titles' AND column_name='risk_level';

-- Check mcus.smoking_status
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='mcus' AND column_name='smoking_status';

-- Check mcus.exercise_frequency
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='mcus' AND column_name='exercise_frequency';
```

**Expected Result:** All three queries should return one row each.

### Migration Execution

```sql
-- Step 1: Copy and run the updated framingham-migration-scripts.sql
-- File location: /framingham-migration-scripts.sql
```

### Post-Migration Verification

```sql
-- Verify framingham_assessment table was created
SELECT table_name FROM information_schema.tables
WHERE table_name='framingham_assessment';

-- Verify all columns exist in framingham_assessment
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='framingham_assessment'
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT indexname FROM pg_indexes
WHERE tablename='framingham_assessment';

-- Count records (should be 0 initially)
SELECT COUNT(*) as total_assessments FROM public.framingham_assessment;
```

---

## 🔄 Data Flow Now Ready

With the database aligned, the Assessment RAHMA Dashboard can now:

1. **Read existing data** from:
   - `employees` (active employees only)
   - `mcus` (latest per employee, including smoking_status & exercise_frequency)
   - `job_titles` (including risk_level)
   - `pemeriksaan_lab` (for lab values)

2. **Calculate assessments** using:
   - `framinghamCalculatorService.js` (11-parameter scoring)

3. **Display results** in:
   - `assessment-rahma-dashboard.js` (dashboard view)

4. **Store results** in:
   - `framingham_assessment` table (once created)

---

## 📁 Files Ready for Integration

### Database
- ✅ `framingham-migration-scripts.sql` - Updated, only creates framingham_assessment table

### JavaScript
- ✅ `js/services/framinghamCalculatorService.js` - 11-parameter calculator
- ✅ `js/pages/assessment-rahma-dashboard.js` - Dashboard controller

### HTML
- ✅ `html/assessment-rahma-dashboard-page.html` - Page container

### Documentation
- ✅ `ASSESSMENT_RAHMA_DASHBOARD_GUIDE.md` - Integration guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment

---

## 🎯 Next Steps

1. **Run Migration Script** (2 minutes)
   ```bash
   # Execute framingham-migration-scripts.sql in Supabase SQL Editor
   # Only creates framingham_assessment table (other columns already exist)
   ```

2. **Verify Table Creation** (1 minute)
   ```sql
   -- Run verification queries above
   ```

3. **Integrate Dashboard** (5 minutes)
   - Add menu item to sidebar
   - Import assessment-rahma-dashboard.js
   - Include HTML page

4. **Test Dashboard** (5 minutes)
   - Click menu → dashboard loads
   - View all employees with risk scores
   - Test filters and search

5. **Go Live**
   - Dashboard ready to use immediately
   - Results auto-saved to framingham_assessment table

---

## ✅ Alignment Summary

| Component | Status | Action |
|-----------|--------|--------|
| job_titles.risk_level | ✅ Exists | None |
| mcus.smoking_status | ✅ Exists | None |
| mcus.exercise_frequency | ✅ Exists | None |
| framingham_assessment table | ❌ Missing | Run migration script |
| Dashboard code | ✅ Ready | Deploy to server |
| Calculator service | ✅ Ready | Already in codebase |
| Documentation | ✅ Complete | Reference during integration |

---

## 📞 Support

**Error: "Column already exists"**
- This will NOT happen with the updated migration script
- Old ALTER statements have been removed

**Error: "Table framingham_assessment does not exist"**
- Run the migration script (framingham-migration-scripts.sql)
- Verify with: `SELECT * FROM framingham_assessment LIMIT 1;`

**Data not showing in dashboard?**
- Check: Active employees exist (is_active = true)
- Check: MCUs with final_result exist
- Check: framingham_assessment table was created

---

**Database Alignment Status: ✅ COMPLETE**

Your database is now properly aligned with the Framingham Assessment RAHMA requirements. Only the framingham_assessment table creation is needed, then the dashboard is ready to go live!
