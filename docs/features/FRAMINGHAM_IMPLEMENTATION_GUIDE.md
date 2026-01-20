# FRAMINGHAM IMPLEMENTATION GUIDE
## RAHMA (Risk Assessment Health Management Analytics) - Integration Steps

This guide explains how to integrate the Framingham CVD Risk Score calculator into your MCU management system.

---

## 📋 TABLE OF CONTENTS

1. [Service Files Overview](#service-files-overview)
2. [Integration Steps](#integration-steps)
3. [Database Setup](#database-setup)
4. [UI/Form Integration](#uiform-integration)
5. [API Endpoints](#api-endpoints)
6. [Error Handling](#error-handling)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 SERVICE FILES OVERVIEW

### Primary Files

| File | Purpose | Status |
|------|---------|--------|
| `framinghamCalculatorService.js` | Core calculation engine for all 11 parameters | ✅ Created |
| `framinghamCalculatorService.examples.js` | Example usage, test cases, and demonstrations | ✅ Created |
| `FRAMINGHAM_SCORING_DETAIL.md` | Detailed scoring documentation | ✅ Created |
| `FRAMINGHAM_RAHMA_SCORING_CORRECT.md` | Scoring table reference | ✅ Created |
| `framingham-migration-scripts.sql` | Database schema migration | ✅ Provided |

### Key Location

```
mcu-management/
├── js/
│   ├── services/
│   │   ├── framinghamCalculatorService.js          ← Main calculator
│   │   ├── framinghamCalculatorService.examples.js ← Examples & tests
│   │   ├── mcuService.js                           ← Already has smoking_status & exercise_frequency
│   │   ├── labService.js                           ← Lab results retrieval
│   │   └── database.js                             ← Database operations
│   ├── pages/
│   │   └── assessment-rahma.js                     ← (To be created) Assessment form page
│   └── utils/
│       └── dateHelpers.js                          ← Date calculation utilities
```

---

## 🚀 INTEGRATION STEPS

### Step 1: Import the Calculator Service

In any file where you need to calculate Framingham scores:

```javascript
import { framinghamCalculatorService } from '../services/framinghamCalculatorService.js';
```

### Step 2: Prepare Assessment Data

Gather all 11 parameters from your MCU and lab data:

```javascript
const assessmentData = {
  // Demographics (from employee master)
  gender: employee.gender,           // 'wanita' or 'pria'
  age: mcu.ageAtMCU,                 // Integer age in years

  // Job & Lifestyle (from MCU form)
  jobRiskLevel: jobData.riskLevel,   // 'low', 'moderate', 'high'
  exerciseFrequency: mcu.exerciseFrequency,      // '>2x_seminggu', '1-2x_seminggu', '1-2x_sebulan', 'tidak_pernah'
  smokingStatus: mcu.smokingStatus,  // 'tidak_merokok', 'mantan_perokok', 'perokok'

  // Vital Signs (from MCU examination)
  systolic: mcu.bloodPressure.systolic,   // mmHg
  diastolic: mcu.bloodPressure.diastolic, // mmHg
  bmi: mcu.bmi,                           // kg/m²

  // Lab Results (from lab results table)
  glucose: labResults[7]?.value,         // mg/dL (lab_item_id 7 = Gula Darah Puasa)
  cholesterol: labResults[8]?.value,     // mg/dL (lab_item_id 8 = Kolesterol Total)
  triglycerides: labResults[9]?.value,   // mg/dL (lab_item_id 9 = Trigliserida)
  hdl: labResults[10]?.value             // mg/dL (lab_item_id 10 = HDL Kolestrol)
};
```

### Step 3: Calculate Assessment

```javascript
try {
  const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

  console.log(`Total Score: ${result.total_score}`);
  console.log(`Risk Category: ${result.risk_category}`);
  console.log(`CVD Risk: ${result.cvd_risk_percentage}`);

} catch (error) {
  console.error('Assessment calculation failed:', error);
  // Handle error - show user message
}
```

### Step 4: Save Result to Database

```javascript
import { database } from '../services/database.js';

// Save the assessment result
const assessment = {
  mcuId: mcu.mcuId,
  employeeId: employee.employeeId,

  // Individual scores
  jenis_kelamin_score: result.jenis_kelamin_score,
  umur_score: result.umur_score,
  job_risk_score: result.job_risk_score,
  exercise_score: result.exercise_score,
  smoking_score: result.smoking_score,
  tekanan_darah_score: result.tekanan_darah_score,
  bmi_score: result.bmi_score,
  gdp_score: result.gdp_score,
  kolesterol_score: result.kolesterol_score,
  trigliserida_score: result.trigliserida_score,
  hdl_score: result.hdl_score,

  // Final result
  total_score: result.total_score,
  risk_category: result.risk_category,

  // Audit trail
  assessment_data: result.assessment_data,
  created_at: new Date().toISOString(),
  created_by: currentUser.userId
};

const savedAssessment = await database.add('framingham_assessment', assessment);
```

### Step 5: Display Result in UI

```javascript
function displayAssessmentResult(result) {
  // Color-code by risk level
  const riskColors = {
    low: '#27ae60',    // Green
    medium: '#f39c12', // Orange
    high: '#e74c3c'    // Red
  };

  const color = riskColors[result.risk_category];

  // Show total score
  document.getElementById('totalScore').textContent = result.total_score;
  document.getElementById('totalScore').style.color = color;

  // Show risk category
  document.getElementById('riskCategory').textContent = result.risk_category.toUpperCase();
  document.getElementById('riskCategory').style.backgroundColor = color;

  // Show CVD risk percentage
  document.getElementById('cVDRisk').textContent = result.cvd_risk_percentage;

  // Show component breakdown
  const labels = framinghamCalculatorService.getParameterLabels();
  const parameters = framinghamCalculatorService.getParameterNames();

  parameters.forEach(param => {
    const score = result[param];
    const label = labels[param];
    const description = framinghamCalculatorService.getScoreDescription(param, score);

    document.getElementById(`score_${param}`).innerHTML = `
      <div class="score-component">
        <span class="label">${label}</span>
        <span class="score">${score}</span>
        <span class="description">${description}</span>
      </div>
    `;
  });
}
```

---

## 📊 DATABASE SETUP

### Migration Script (Already Provided)

The migration script in `framingham-migration-scripts.sql` contains:

1. **ALTER `job_titles` table**
   - Add `risk_level` column (low, moderate, high)

2. **ALTER `mcus` table**
   - Add `smoking_status` column (tidak_merokok, mantan_perokok, perokok)
   - Add `exercise_frequency` column (>2x_seminggu, 1-2x_seminggu, 1-2x_sebulan, tidak_pernah)

3. **CREATE `framingham_assessment` table**
   - Stores all 11 individual parameter scores
   - Stores total score and risk category
   - Includes assessment_data JSONB for audit trail

### Execute Migration in Supabase

```sql
-- Option 1: Copy and paste entire framingham-migration-scripts.sql into Supabase SQL Editor
-- Option 2: Run via command line if using Supabase CLI:
-- supabase db push

-- Verify table was created:
SELECT * FROM framingham_assessment LIMIT 1;

-- Verify columns were added to mcus:
\d mcus;  -- Shows all columns
```

---

## 🎯 UI/FORM INTEGRATION

### Assessment Page Structure (assessment-rahma.js)

```javascript
/**
 * Assessment RAHMA Page
 * Handles Framingham CVD Risk Score assessment
 */

import { mcuService } from '../services/mcuService.js';
import { labService } from '../services/labService.js';
import { framinghamCalculatorService } from '../services/framinghamCalculatorService.js';
import { database } from '../services/database.js';

class AssessmentRAHMAPage {
  async initialize(mcuId) {
    // Load MCU data
    const mcu = await mcuService.getById(mcuId);

    // Load employee data
    const employee = await database.get('employees', mcu.employeeId);

    // Load lab results
    const labResults = await labService.getPemeriksaanLabByMcuId(mcuId);

    // Load job data
    const jobData = await database.get('job_titles', employee.jobId);

    // Prepare form data
    this.populateForm({
      mcu,
      employee,
      labResults,
      jobData
    });
  }

  async submitAssessment(formData) {
    try {
      // Validate required fields
      this.validateForm(formData);

      // Prepare assessment data
      const assessmentData = this.prepareAssessmentData(formData);

      // Calculate Framingham score
      const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

      // Save to database
      const assessment = {
        mcuId: formData.mcuId,
        employeeId: formData.employeeId,
        ...result,
        created_by: currentUser.userId
      };

      await database.add('framingham_assessment', assessment);

      // Display result
      this.displayResult(result);

    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

### Form Fields Required

```html
<!-- Demographics (Auto-filled) -->
<div class="form-group">
  <label>Jenis Kelamin</label>
  <input type="text" name="gender" readonly />
</div>

<div class="form-group">
  <label>Umur (tahun)</label>
  <input type="number" name="age" readonly />
</div>

<!-- Job Risk (Auto-filled from job_titles) -->
<div class="form-group">
  <label>Tingkat Risiko Pekerjaan</label>
  <select name="jobRiskLevel">
    <option value="low">Rendah (Low)</option>
    <option value="moderate" selected>Sedang (Moderate)</option>
    <option value="high">Tinggi (High)</option>
  </select>
</div>

<!-- Lifestyle -->
<div class="form-group">
  <label>Frekuensi Olahraga</label>
  <select name="exerciseFrequency">
    <option value=">2x_seminggu">>2x per minggu (>2x/week)</option>
    <option value="1-2x_seminggu">1-2x per minggu (1-2x/week)</option>
    <option value="1-2x_sebulan">1-2x per bulan (1-2x/month)</option>
    <option value="tidak_pernah">Tidak pernah (Never)</option>
  </select>
</div>

<div class="form-group">
  <label>Status Merokok</label>
  <select name="smokingStatus">
    <option value="tidak_merokok">Tidak merokok (Non-smoker)</option>
    <option value="mantan_perokok">Mantan perokok (Former)</option>
    <option value="perokok">Merokok (Current)</option>
  </select>
</div>

<!-- Vital Signs (Auto-filled from MCU) -->
<div class="form-group">
  <label>Tekanan Darah (SBP/DBP)</label>
  <input type="text" name="bloodPressure" readonly placeholder="120/80" />
</div>

<div class="form-group">
  <label>BMI</label>
  <input type="number" name="bmi" readonly step="0.01" />
</div>

<!-- Lab Results (Auto-filled from lab table) -->
<div class="form-group">
  <label>Gula Darah Puasa (mg/dL)</label>
  <input type="number" name="glucose" readonly />
</div>

<div class="form-group">
  <label>Kolesterol Total (mg/dL)</label>
  <input type="number" name="cholesterol" readonly />
</div>

<div class="form-group">
  <label>Trigliserida (mg/dL)</label>
  <input type="number" name="triglycerides" readonly />
</div>

<div class="form-group">
  <label>HDL Kolesterol (mg/dL)</label>
  <input type="number" name="hdl" readonly />
</div>

<!-- Results Display (Calculated) -->
<div class="results-container">
  <div class="result-box">
    <h3>Total Score</h3>
    <div id="totalScore" class="score-value"></div>
  </div>

  <div class="result-box">
    <h3>Risk Category</h3>
    <div id="riskCategory" class="risk-badge"></div>
  </div>

  <div class="result-box">
    <h3>10-Year CVD Risk</h3>
    <div id="cVDRisk" class="risk-percentage"></div>
  </div>
</div>

<!-- Component Breakdown -->
<div class="scores-breakdown">
  <h3>Scoring Breakdown (Komponen Skor)</h3>
  <table>
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Score</th>
        <th>Range</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody id="scoresTable">
      <!-- Populated by JavaScript -->
    </tbody>
  </table>
</div>

<!-- Recommendations -->
<div class="recommendations-container">
  <h3>Recommendations (Rekomendasi)</h3>
  <ul id="recommendationsList">
    <!-- Populated by JavaScript based on risk category -->
  </ul>
</div>
```

---

## 🔌 API ENDPOINTS

### Create/Save Assessment

```
POST /api/framingham-assessment
Content-Type: application/json

{
  "mcuId": "MCU-2025-001",
  "employeeId": "EMP-12345",
  "jenis_kelamin_score": 1,
  "umur_score": 1,
  ... (all 11 individual scores)
  "total_score": 18,
  "risk_category": "high",
  "assessment_data": { ... }
}

Response:
{
  "id": "uuid",
  "success": true,
  "data": { assessment record }
}
```

### Get Assessment by MCU ID

```
GET /api/framingham-assessment/:mcuId

Response:
{
  "success": true,
  "data": { assessment record }
}
```

### Get Assessments by Employee ID

```
GET /api/framingham-assessment/employee/:employeeId

Response:
{
  "success": true,
  "data": [ { assessment records } ]
}
```

### Get High-Risk Assessments (For Dashboard)

```
GET /api/framingham-assessment/risk-category/high

Response:
{
  "success": true,
  "data": [ { high-risk assessment records } ],
  "count": 45
}
```

---

## ⚠️ ERROR HANDLING

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Assessment data is required" | Empty/null input | Check all form fields are filled |
| "Invalid lab value: NaN" | Non-numeric lab value | Validate lab value is numeric |
| "Blood pressure parsing failed" | Invalid BP format | Use format: "120/80" |
| "Missing required field: glucose" | Lab result not found | Ensure lab test was performed |

### Error Handling in Code

```javascript
try {
  const result = framinghamCalculatorService.performCompleteAssessment(data);
} catch (error) {
  // Log error for debugging
  console.error('Framingham calculation error:', error);

  // Show user-friendly message
  showErrorNotification(`Assessment failed: ${error.message}`);

  // Could also:
  // - Send to error tracking service
  // - Save to audit log
  // - Suggest action to user
}
```

---

## 🔧 TROUBLESHOOTING

### Issue: "Database table not found: framingham_assessment"

**Solution:**
1. Run migration script in Supabase SQL Editor
2. Verify table exists: `SELECT * FROM framingham_assessment LIMIT 1;`
3. Check Supabase project/database selection

### Issue: Lab values showing as null/undefined

**Solution:**
1. Verify lab results exist for the MCU: Check `pemeriksaan_lab` table
2. Check correct `lab_item_id` is being used:
   - ID 7 = Gula Darah Puasa
   - ID 8 = Kolesterol Total
   - ID 9 = Trigliserida
   - ID 10 = HDL Kolestrol
3. Ensure lab values are numeric and > 0

### Issue: Score calculation seems incorrect

**Solution:**
1. Check all inputs are provided (no null/undefined values)
2. Verify field naming matches exactly (gender, age, jobRiskLevel, etc.)
3. Check value ranges are valid:
   - Age: 0-100+
   - BMI: 10-50
   - BP: 80-200 (systolic)
   - Glucose: 50-300 (mg/dL)
   - Cholesterol: 100-400 (mg/dL)
4. Run unit tests from examples file to validate calculator

### Issue: Smoking status / Exercise frequency not saving to MCU

**Solution:**
1. Verify fields are in `mcuService.js` configuration (they are)
2. Check databaseAdapter is mapping fields correctly
3. Ensure values match exactly: `'tidak_merokok'`, `'>2x_seminggu'`, etc.
4. Check database constraints allow these values

---

## 📝 NEXT STEPS

1. ✅ Create `framinghamCalculatorService.js` - DONE
2. ✅ Create `framinghamCalculatorService.examples.js` - DONE
3. ✅ Run database migration in Supabase - PENDING
4. Create `assessment-rahma.js` page (UI form)
5. Create API endpoints for saving/retrieving assessments
6. Create dashboard widget showing high-risk employees
7. Create alert system for high-risk flagging
8. Create follow-up recommendation module

---

## 📚 REFERENCE FILES

- **Scoring Documentation:** `FRAMINGHAM_SCORING_DETAIL.md`
- **Correct Scoring Table:** `FRAMINGHAM_RAHMA_SCORING_CORRECT.md`
- **Database Migration:** `framingham-migration-scripts.sql`
- **Calculator Service:** `mcu-management/js/services/framinghamCalculatorService.js`
- **Examples & Tests:** `mcu-management/js/services/framinghamCalculatorService.examples.js`

---

## 🔗 LAB ITEM ID REFERENCE

| Lab Item | ID | Field Name | Unit | Normal Range |
|----------|----|----|------|------|
| Gula Darah Puasa (Fasting Glucose) | 7 | gdp_score | mg/dL | ≤126 |
| Kolesterol Total (Total Cholesterol) | 8 | kolesterol_score | mg/dL | <200 |
| Trigliserida (Triglycerides) | 9 | trigliserida_score | mg/dL | <200 |
| HDL Kolestrol (HDL Cholesterol) | 10 | hdl_score | mg/dL | >44 |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-13
**Status:** Ready for Implementation
