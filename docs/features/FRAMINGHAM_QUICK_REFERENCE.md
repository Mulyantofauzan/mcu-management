# FRAMINGHAM CALCULATOR - QUICK REFERENCE CARD

## 📌 Import & Basic Usage

```javascript
import { framinghamCalculatorService } from '../services/framinghamCalculatorService.js';

// One-line assessment
const result = framinghamCalculatorService.performCompleteAssessment({
  gender: 'pria', age: 50, jobRiskLevel: 'moderate', exerciseFrequency: '1-2x_seminggu',
  smokingStatus: 'perokok', systolic: 155, diastolic: 98, bmi: 28.5,
  glucose: 132, cholesterol: 250, triglycerides: 220, hdl: 38
});
```

---

## 📊 SCORING REFERENCE TABLE

| Parameter | Range | Low Score | High Score | Notes |
|-----------|-------|-----------|-----------|-------|
| **Gender** | 0-1 | F=0 | M=1 | Baseline: Female |
| **Age** | -4 to +3 | 25-34=-4 | 60-64=+3 | Baseline: 45-49 |
| **Job Risk** | 0-2 | Low=0 | High=2 | - |
| **Exercise** | -3 to +2 | >2x/wk=-3 | Never=+2 | **PROTECTIVE** ↓ |
| **Smoking** | 0-4 | Non=0 | Current=+4 | Highest single risk |
| **Blood Pressure** | 0-4 | <130/85=0 | ≥180/110=+4 | Either SBP or DBP |
| **BMI** | 0-2 | <26=0 | ≥30=+2 | Calculate from ht/wt |
| **Glucose** | 0-2 | ≤126=0 | ≥127=+2 | Binary threshold |
| **Cholesterol** | 0-3 | <200=0 | ≥280=+3 | Total cholesterol |
| **Triglycerides** | 0-2 | <200=0 | ≥300=+2 | - |
| **HDL** | 0-2 | >44=0 | <35=+2 | **PROTECTIVE** ↑ |

---

## 🎯 RISK CATEGORIES

```
Score    Category    Risk         Status
─────────────────────────────────────────
0-4      LOW         <5%          ✅ Optimal
5-11     MEDIUM      5-20%        ⚠️ At Risk
12-26+   HIGH        >20%         🔴 Critical
```

---

## 🔧 INDIVIDUAL SCORING FUNCTIONS

```javascript
// Each function returns a single score (0-indexed)
framinghamCalculatorService.calculateGenderScore(gender)           // 0-1
framinghamCalculatorService.calculateAgeScore(age)                 // -4 to 3
framinghamCalculatorService.calculateJobRiskScore(level)           // 0-2
framinghamCalculatorService.calculateExerciseScore(frequency)      // -3 to 2
framinghamCalculatorService.calculateSmokingScore(status)          // 0-4
framinghamCalculatorService.calculateBloodPressureScore(sys, dias)  // 0-4
framinghamCalculatorService.calculateBMIScore(bmi)                 // 0-2
framinghamCalculatorService.calculateGlucoseScore(glucose)         // 0-2
framinghamCalculatorService.calculateCholesterolScore(chol)        // 0-3
framinghamCalculatorService.calculateTriglyceridesScore(trig)      // 0-2
framinghamCalculatorService.calculateHDLScore(hdl)                 // 0-2
```

---

## 💾 DATABASE OPERATION

```javascript
// Save result to database
await database.add('framingham_assessment', {
  mcuId: mcu.mcuId,
  employeeId: employee.employeeId,
  jenis_kelamin_score: result.jenis_kelamin_score,
  umur_score: result.umur_score,
  // ... 9 more scores
  total_score: result.total_score,
  risk_category: result.risk_category,
  assessment_data: result.assessment_data,
  created_by: currentUser.userId
});

// Retrieve result
const assessment = await database.get('framingham_assessment', mcuId);
```

---

## 🔍 DATA VALIDATION

```javascript
// All these formats work:
gender: 'wanita' or 'female' or 'f'
jobRiskLevel: 'low' or 'rendah'
exerciseFrequency: '>2x_seminggu' or '>2x/week'
smokingStatus: 'tidak_merokok' or 'non-smoker'
bloodPressure: '145/92' or { systolic: 145, diastolic: 92 }
```

---

## ⚠️ COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| NaN in score | Missing/invalid input | Check all 11 params provided |
| null risk_category | Score outside range | Verify calculation logic |
| DB save fails | Duplicate mcu_id | Check unique constraint |
| Lab value null | Lab result not found | Verify pemeriksaan_lab table |

---

## 🧪 UNIT TEST QUICK CHECK

```javascript
import { runUnitTests } from './framinghamCalculatorService.examples.js';
runUnitTests(); // Should see "ALL TESTS PASSED ✅"
```

---

## 📋 REQUIRED FORM FIELDS

```javascript
const assessmentData = {
  // Demographics (auto-filled)
  gender: string,              // 'wanita' or 'pria'
  age: number,                 // 18-100

  // Job & Lifestyle (form input)
  jobRiskLevel: string,        // 'low', 'moderate', 'high'
  exerciseFrequency: string,   // '>2x_seminggu', '1-2x_seminggu', '1-2x_sebulan', 'tidak_pernah'
  smokingStatus: string,       // 'tidak_merokok', 'mantan_perokok', 'perokok'

  // Vital Signs (auto-filled from MCU)
  systolic: number,            // mmHg
  diastolic: number,           // mmHg
  bmi: number,                 // kg/m²

  // Lab Results (auto-filled from lab table)
  glucose: number,             // mg/dL (lab_item_id 7)
  cholesterol: number,         // mg/dL (lab_item_id 8)
  triglycerides: number,       // mg/dL (lab_item_id 9)
  hdl: number                  // mg/dL (lab_item_id 10)
};
```

---

## 📤 RESULT STRUCTURE

```javascript
{
  // 11 individual parameter scores
  jenis_kelamin_score: 1,        // -4 to 26 range
  umur_score: 1,
  job_risk_score: 2,
  exercise_score: 2,
  smoking_score: 4,
  tekanan_darah_score: 2,
  bmi_score: 1,
  gdp_score: 2,
  kolesterol_score: 2,
  trigliserida_score: 1,
  hdl_score: 1,

  // Final result
  total_score: 19,              // -4 to 26
  risk_category: 'high',        // 'low', 'medium', 'high'
  risk_category_id: 3,          // 1, 2, or 3
  cvd_risk_percentage: '> 20%',  // String format
  status: '🔴 Critical',
  description: 'High 10-year cardiovascular disease risk',

  // Audit trail
  assessment_data: {
    input: { ... },        // Original inputs
    scores: { ... },       // Calculated scores
    risk: { ... }          // Risk classification
  }
}
```

---

## 🎨 DISPLAY HELPER FUNCTIONS

```javascript
// Get label in Indonesian
framinghamCalculatorService.getParameterLabels()[param]
// Returns: "Jenis Kelamin (Gender)", "Umur (Age)", etc.

// Get description of score
framinghamCalculatorService.getScoreDescription(param, score)
// Returns: "Male (Pria) - +1 CVD risk", "Normal (<130/85)", etc.

// Get all parameter names
framinghamCalculatorService.getParameterNames()
// Returns: ['jenis_kelamin_score', 'umur_score', ...]

// Get score ranges
framinghamCalculatorService.getParameterRanges()
// Returns: { jenis_kelamin_score: { min: 0, max: 1, description: '...' }, ... }
```

---

## 🎯 COLOR CODING

```javascript
const riskColors = {
  low: '#27ae60',    // Green
  medium: '#f39c12', // Orange
  high: '#e74c3c'    // Red
};
const bgColor = riskColors[result.risk_category];
```

---

## 📊 EXAMPLE CALCULATION

```
Input:
  Male, 52, High job risk, Never exercises, Current smoker
  BP: 155/98, BMI: 28.5
  Glucose: 132, Chol: 250, Trig: 220, HDL: 38

Calculation:
  Gender:     1 (+1)
  Age:        1 (+1)
  Job:        2 (+2)
  Exercise:   2 (+2)
  Smoking:    4 (+4) ← HIGHEST SINGLE RISK
  BP:         2 (+2)
  BMI:        1 (+1)
  Glucose:    2 (+2)
  Chol:       2 (+2)
  Trig:       1 (+1)
  HDL:        1 (+1)
  ─────────────────
  Total:     19

Result: HIGH RISK (>20% 10-year CVD risk)
```

---

## 🔗 FILE REFERENCES

| Need | File | Location |
|------|------|----------|
| Import | `framinghamCalculatorService.js` | `mcu-management/js/services/` |
| Examples | `framinghamCalculatorService.examples.js` | `mcu-management/js/services/` |
| Details | `FRAMINGHAM_SCORING_DETAIL.md` | Project root |
| Integration | `FRAMINGHAM_IMPLEMENTATION_GUIDE.md` | Project root |
| Database | `framingham-migration-scripts.sql` | Project root |

---

## ⚡ TIP: BMI CALCULATION

If you need to calculate BMI from height/weight:

```javascript
const bmi = framinghamCalculatorService.calculateBMI(weightKg, heightCm);
// Returns: 28.5 (rounded to 2 decimals)
```

---

## 🚀 5-MINUTE INTEGRATION

```javascript
// 1. Import
import { framinghamCalculatorService } from '../services/framinghamCalculatorService.js';

// 2. Prepare data
const data = {
  gender: employee.gender, age: mcu.ageAtMCU,
  jobRiskLevel: job.riskLevel,
  exerciseFrequency: mcu.exerciseFrequency,
  smokingStatus: mcu.smokingStatus,
  systolic: mcu.systolic, diastolic: mcu.diastolic,
  bmi: mcu.bmi,
  glucose: labs[7].value, cholesterol: labs[8].value,
  triglycerides: labs[9].value, hdl: labs[10].value
};

// 3. Calculate
const result = framinghamCalculatorService.performCompleteAssessment(data);

// 4. Save
await database.add('framingham_assessment', { mcuId, employeeId, ...result });

// 5. Display
console.log(`Total: ${result.total_score}, Risk: ${result.risk_category}`);
```

---

## 📞 QUICK LOOKUP

**Lab Item IDs:**
- 7 = Gula Darah Puasa
- 8 = Kolesterol Total
- 9 = Trigliserida
- 10 = HDL Kolestrol

**Enum Values (must match exactly):**
- `smokingStatus`: 'tidak_merokok', 'mantan_perokok', 'perokok'
- `exerciseFrequency`: '>2x_seminggu', '1-2x_seminggu', '1-2x_sebulan', 'tidak_pernah'
- `jobRiskLevel`: 'low', 'moderate', 'high'
- `risk_category`: 'low', 'medium', 'high'

---

**Last Updated:** 2025-12-13 | **Version:** 1.0
