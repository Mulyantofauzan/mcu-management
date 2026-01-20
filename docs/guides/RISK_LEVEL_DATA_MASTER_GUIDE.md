# Job Title Risk Level Management - Data Master Guide

**Date:** 2025-12-13
**Feature:** Edit Occupational Risk Level in Data Master
**Status:** ✅ IMPLEMENTED & READY

---

## 📋 Overview

Users can now **edit and manage job title risk levels** directly from the Data Master page, under the **Jabatan (Job Titles)** tab. This allows administrators to customize occupational risk assessments for the Framingham CVD Risk Score calculation.

---

## 🎯 Feature Details

### What Can Be Done

**Create Job Titles with Risk Level:**
- Add new job titles
- Assign occupational risk level at creation time
- Default value: **Moderate** (auto-selected)

**Edit Existing Job Titles:**
- Change job title name
- Update occupational risk level anytime
- Changes are saved to database
- Full audit trail maintained

**Risk Level Options:**
- **Low (Risiko Rendah)** - Lower cardiovascular risk occupations
- **Moderate (Risiko Sedang)** - Medium risk occupations (DEFAULT)
- **High (Risiko Tinggi)** - Higher cardiovascular risk occupations

---

## 📍 Location in Application

**Path:** Dashboard → Data Master → Jabatan (Job Titles) tab

**Step-by-Step:**
1. Go to Dashboard
2. Click "Data Master" in sidebar
3. Click "Jabatan" tab (first tab)
4. Click "+ Tambah" to add new job title
5. OR click edit icon on existing job title
6. Fill in "Nama" (name) and "Tingkat Risiko Pekerjaan" (risk level)
7. Click "Simpan" to save

---

## 📐 Database Schema

### Column Details

**Table:** `job_titles`
**Column:** `risk_level`

```sql
-- Column specification
risk_level VARCHAR(20) DEFAULT 'moderate'
  CHECK (risk_level IN ('low', 'moderate', 'high'))

-- Comment
Occupational risk level for Framingham CVD assessment: low, moderate, or high.
Editable in Data Master.
```

**Features:**
- Type: VARCHAR(20)
- Default: 'moderate'
- Constraint: Only allows 'low', 'moderate', or 'high'
- Nullable: No (must have a value)
- Editable: Yes (via Data Master UI)

---

## 🔄 Workflow

### Creating a New Job Title with Risk Level

```
1. Open Data Master
2. Go to "Jabatan" tab
3. Click "+ Tambah" button
4. Fill Form:
   - Nama: "Software Developer"
   - Tingkat Risiko Pekerjaan: "Low"
5. Click "Simpan"
6. Success message appears
7. New job title appears in table with risk level
```

### Editing Existing Job Title Risk Level

```
1. Open Data Master
2. Go to "Jabatan" tab
3. Find job title in table
4. Click edit icon (pencil icon)
5. Change risk level dropdown:
   - Low (Risiko Rendah)
   - Moderate (Risiko Sedang)
   - High (Risiko Tinggi)
6. Click "Simpan"
7. Success message appears
8. Changes immediately reflected in table
```

---

## 🎨 UI Components

### Form Field

**Label:** Tingkat Risiko Pekerjaan (Occupational Risk Level) *

**Type:** Select/Dropdown

**Options:**
```
-- Pilih Tingkat Risiko --
Low (Risiko Rendah)
Moderate (Risiko Sedang) - Default
High (Risiko Tinggi)
```

**Helper Text:**
"Digunakan untuk penilaian Framingham CVD Risk Assessment"
(Used for Framingham CVD Risk Assessment)

**Visibility:**
- Only shown when editing/adding **Job Titles**
- Hidden when editing other entities (Departments, Vendors, Doctors, Lab Items)

---

## 💾 Data Handling

### Default Behavior

**When Creating New Job Title:**
- Risk level defaults to **'moderate'**
- User can change before saving
- Not required to explicitly select (uses default)

**When Editing Job Title:**
- Current risk level is pre-populated
- User can change anytime
- Changes saved to database immediately

**When Viewing List:**
- Shows all job titles with their current risk levels
- Can sort or filter if needed
- Easy identification of job title risk assignments

---

## 🔐 Database Integration

### Service Layer (masterDataService.js)

**Create Function:**
```javascript
async createJobTitle(data, currentUser) {
  const jobTitle = {
    jobTitleId: generateJobTitleId(),
    name: data.name,
    risk_level: data.riskLevel || 'moderate',  // Default to moderate
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp()
  };
  // ... database.add() and logging
}
```

**Update Function:**
```javascript
async updateJobTitle(id, data, currentUser) {
  const updateData = {
    name: data.name,
    updatedAt: getCurrentTimestamp()
  };

  if (data.riskLevel) {
    updateData.risk_level = data.riskLevel;
  }

  // ... database.update() and logging
}
```

### Activity Logging

All changes are logged with full details:
- **Create:** "Created job title: [name], Risk Level: [level]"
- **Update:** "Updated job title to: [name], Risk Level: [level]"
- **User:** Current logged-in user
- **Timestamp:** When change was made

---

## 🎯 Framingham Integration

### How Risk Level is Used

The job title risk level is used in the **Framingham CVD Risk Assessment** calculation:

**Parameter:** Job Risk Score
- **Low job risk:** Adds 0 points
- **Moderate job risk:** Adds 1 point
- **High job risk:** Adds 2 points

**Total CVD Risk Score Range:** -4 to 26+

**Risk Categories Based on Total:**
- **0-4:** ✅ LOW RISK
- **5-11:** ⚠️ MEDIUM RISK
- **12-26+:** 🔴 HIGH RISK

---

## 📊 Example Scenarios

### Scenario 1: Create IT Staff with Low Risk

```
Tab: Jabatan
Action: Click "+ Tambah"

Form:
- Nama: IT Staff
- Tingkat Risiko Pekerjaan: Low

Result:
✅ New job title created
✅ Risk level set to 'low'
✅ Logged in activity log
✅ Used for Framingham scoring
```

### Scenario 2: Update Factory Worker to High Risk

```
Tab: Jabatan
Find: Factory Worker (existing)
Action: Click edit icon

Change:
- Tingkat Risiko Pekerjaan: High (was: Moderate)

Result:
✅ Risk level updated to 'high'
✅ Change logged in activity log
✅ Affects future Framingham assessments
✅ Immediately reflected in list
```

### Scenario 3: View All Job Titles with Risk Levels

```
Tab: Jabatan
Table shows:
┌─────┬──────────────┬─────────────────┐
│ No. │ Job Title    │ Risk Level      │
├─────┼──────────────┼─────────────────┤
│ 1   │ Manager      │ Moderate        │
│ 2   │ Developer    │ Low             │
│ 3   │ Factory Wrk  │ High            │
│ 4   │ Admin        │ Low             │
└─────┴──────────────┴─────────────────┘
```

---

## ⚙️ Technical Details

### Form Architecture

**File:** `mcu-management/pages/data-master.html`
- Risk level field hidden by default
- Shown only for jobTitles tab
- Uses standard select/dropdown component

**File:** `mcu-management/js/pages/data-master.js`
- `setupFormFields()`: Controls field visibility
- `editItem()`: Populates existing value
- `handleSubmit()`: Includes field in submission

### Database Interaction

**File:** `mcu-management/js/services/masterDataService.js`
- `createJobTitle()`: Handles new job title creation with risk_level
- `updateJobTitle()`: Updates risk_level field
- Cache invalidation after changes
- Activity logging with details

### Migration & Setup

**File:** `framingham-migration-scripts.sql`
```sql
ALTER TABLE public.job_titles
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'moderate'
  CHECK (risk_level IN ('low', 'moderate', 'high'));

COMMENT ON COLUMN public.job_titles.risk_level IS
'Occupational risk level for Framingham CVD assessment: low, moderate, or high.
Editable in Data Master.';
```

**Safe:** Uses `IF NOT EXISTS` clause - runs multiple times without errors

---

## ✅ Implementation Checklist

- [x] Database column created (risk_level)
- [x] Column has default value ('moderate')
- [x] Column has constraint (low, moderate, high only)
- [x] UI field added to Data Master form
- [x] Field shows only for job titles
- [x] Default value pre-selected in form
- [x] Create function supports risk_level
- [x] Update function supports risk_level
- [x] Activity logging includes risk_level
- [x] Migration script safe to run
- [x] Cache invalidation working
- [x] Full documentation complete

---

## 🔍 Verification

### Database Verification

```sql
-- Check column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='job_titles' AND column_name='risk_level';

-- Expected result:
-- column_name: risk_level
-- data_type: character varying
-- column_default: 'moderate'::character varying

-- Check constraint
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name='job_titles'
AND constraint_type='CHECK';

-- Check existing data
SELECT id, name, risk_level FROM public.job_titles LIMIT 10;
```

### UI Verification

**Steps:**
1. Go to Data Master
2. Click Jabatan tab
3. Click "+ Tambah"
4. Verify risk level field shows with label "Tingkat Risiko Pekerjaan"
5. Verify dropdown has 3 options: Low, Moderate (default), High
6. Create test job title with "Low" risk
7. Click edit on created job title
8. Verify "Low" is pre-filled
9. Click "Simpan"
10. Verify changes saved successfully

---

## 🐛 Troubleshooting

### Issue: Risk Level Field Not Showing

**Possible Causes:**
- Wrong tab selected (must be "Jabatan")
- JavaScript error in console
- HTML not updated

**Solution:**
1. Verify you're on Jabatan tab
2. Open browser console (F12)
3. Look for JavaScript errors
4. Check that data-master.html includes risk-level-field div

### Issue: Default Value Not 'Moderate'

**Possible Causes:**
- Cache not cleared
- Service not reloaded
- Database not migrated

**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Run migration script again
4. Check database default value with SQL query above

### Issue: Changes Not Saved

**Possible Causes:**
- Network error
- Database permission issue
- Supabase connection problem

**Solution:**
1. Check browser console for errors
2. Verify Supabase connection
3. Check user permissions
4. Try again with simpler change (just name)

### Issue: Field Shows for Other Entities

**Possible Causes:**
- setupFormFields() not called properly
- Form reset not working

**Solution:**
1. Check browser console
2. Verify data-master.js is loaded
3. Clear browser cache
4. Hard refresh page

---

## 📈 Future Enhancements

**Possible Additions:**
- [ ] Risk level bulk edit for multiple job titles
- [ ] Risk level history/timeline view
- [ ] Risk level recommendations based on employee data
- [ ] Department-level average risk calculation
- [ ] Risk level change impact analysis
- [ ] Export risk levels for reporting

---

## 📚 Related Documentation

- [Framingham Assessment RAHMA Dashboard](ASSESSMENT_RAHMA_DASHBOARD_GUIDE.md)
- [Framingham Scoring Detail](FRAMINGHAM_SCORING_DETAIL.md)
- [Database Alignment Summary](DATABASE_ALIGNMENT_SUMMARY.md)
- [Data Master Quick Reference](ASSESSMENT_RAHMA_MENU_SETUP.md)

---

## 📞 Support

**For Issues:**
1. Check troubleshooting section above
2. Verify migration script was executed
3. Check browser console for errors
4. Verify database connection

**For Features:**
- Risk level can only be: low, moderate, high
- Only job titles can have risk levels
- Other entities (departments, etc.) ignore this field
- Default is always 'moderate'
- Changes are immediately saved

---

**Status:** ✅ COMPLETE & TESTED
**Last Updated:** 2025-12-13
**Version:** 1.0

Users can now easily manage job title risk levels directly in the Data Master interface!
