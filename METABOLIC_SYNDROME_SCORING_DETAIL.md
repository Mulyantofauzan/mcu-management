# Sindrom Metabolik (Metabolic Syndrome) Scoring System

## Overview

The Metabolic Syndrome scoring system implements the IDF & ATP III criteria for assessing metabolic syndrome risk. The system uses **binary scoring (0 or 1)** for 5 parameters and classifies risk into 3 levels based on total score and waist circumference presence.

## Key Concept: LP-Dependent Risk Classification

The most important aspect of this system is that **risk classification depends on BOTH:**
1. The total score (Nilai)
2. Whether waist circumference (LP) is abnormal

**The same total score can result in different risk levels depending on LP value.**

### Example:
- **Scenario 1:** LP=0, TG=1, HDL=1, TD=0, GDP=0 → Nilai=2 → **Risk 1** (because LP=0)
- **Scenario 2:** LP=1, TG=0, HDL=1, TD=0, GDP=0 → Nilai=2 → **Risk 2** (because LP=1, even though total is same)

## Scoring Parameters

All parameters use **binary scoring (0 = normal, 1 = abnormal)**.

### 1. Lingkar Perut (Waist Circumference) - LP

**Gender-Specific Thresholds (IDF Criteria):**

| Gender | Abnormal (1) | Normal (0) |
|--------|-------------|-----------|
| Pria (Male) | ≥90 cm | <90 cm |
| Wanita (Female) | ≥80 cm | <80 cm |

**Field Used:** `chest_circumference` from MCU table (in cm)

**Implementation:**
```javascript
function calculateWaistCircumferenceScore(waist, gender) {
    const waistValue = parseFloat(waist);
    const isMale = gender.toLowerCase().match(/pria|laki-laki|male|m/);

    if (isMale) {
        return waistValue >= 90 ? 1 : 0;
    } else {
        return waistValue >= 80 ? 1 : 0;
    }
}
```

### 2. Trigliserida (Triglycerides) - TG

**Threshold:**
- **Abnormal (1):** ≥150 mg/dL
- **Normal (0):** <150 mg/dL

**Lab ID:** 9 (Trigliserida)

**Implementation:**
```javascript
function calculateTriglyceridesScore(triglycerides) {
    const tgValue = parseFloat(triglycerides);
    return tgValue >= 150 ? 1 : 0;
}
```

### 3. HDL Cholesterol

**Gender-Specific Thresholds (IDF Criteria - Inverse Scoring):**

HDL is **protective** (higher is better), so we use inverse scoring:

| Gender | Abnormal (1) | Normal (0) |
|--------|-------------|-----------|
| Pria (Male) | <40 mg/dL | ≥40 mg/dL |
| Wanita (Female) | <50 mg/dL | ≥50 mg/dL |

**Lab ID:** 10 (HDL)

**Implementation:**
```javascript
function calculateHDLScore(hdl, gender) {
    const hdlValue = parseFloat(hdl);
    const isMale = gender.toLowerCase().match(/pria|laki-laki|male|m/);

    if (isMale) {
        return hdlValue < 40 ? 1 : 0;  // Low HDL is bad
    } else {
        return hdlValue < 50 ? 1 : 0;  // Low HDL is bad
    }
}
```

### 4. Tekanan Darah (Blood Pressure) - TD

**Threshold:**
- **Abnormal (1):** ≥130/85 mmHg (either systolic OR diastolic)
- **Normal (0):** <130/85 mmHg (both below)

**Format:** "SBP/DBP" (e.g., "130/85")

**Implementation:**
```javascript
function calculateBloodPressureScore(bp) {
    const bpParts = bp.toString().split('/');
    const systolic = parseInt(bpParts[0]);
    const diastolic = parseInt(bpParts[1]);

    // Score 1 if EITHER systolic ≥130 OR diastolic ≥85
    return systolic >= 130 || diastolic >= 85 ? 1 : 0;
}
```

### 5. GDP (Gula Darah Puasa - Fasting Glucose)

**Threshold:**
- **Abnormal (1):** ≥100 mg/dL OR has diabetes diagnosis
- **Normal (0):** <100 mg/dL AND no diabetes

**Lab ID:** 7 (GDP)

**Implementation:**
```javascript
function calculateGlucoseScore(glucose, hasDiabetes) {
    // If has diabetes diagnosis, automatically 1
    if (hasDiabetes) return 1;

    const glucoseValue = parseFloat(glucose);
    return glucoseValue >= 100 ? 1 : 0;
}
```

## Total Score (Nilai)

**Nilai = LP + TG + HDL + TD + GDP**

**Important:** The total score DIRECTLY INCLUDES LP. We don't add LP separately.

**Range:** 0-5

**Calculation Example:**
```
LP=1, TG=0, HDL=1, TD=0, GDP=0
Nilai = 1 + 0 + 1 + 0 + 0 = 2 (NOT 3)
```

## Risk Classification (LP-Dependent)

The risk level is determined by BOTH total score AND LP presence.

### Risk 1 (Normal)
**Criteria:** Nilai 0-2 **AND** LP=0
- Lingkar perut normal (tidak ada central obesity)
- Normal waist circumference = safe, even with other abnormalities

**Example:**
- LP=0, Nilai=0 → Risk 1 ✓
- LP=0, Nilai=2 → Risk 1 ✓ (safe because no central obesity)

### Risk 2 (Medium)
**Criteria:** Nilai 0-2 **AND** LP=1
- Has abnormal waist circumference (central obesity)
- But not enough criteria for metabolic syndrome diagnosis

**Example:**
- LP=1, Nilai=1 → Risk 2 ✓
- LP=1, Nilai=2 → Risk 2 ✓ (concerning due to LP, but not diagnosed)

### Risk 3 (Sindrom Metabolik Diagnosis)
**Criteria:** Nilai ≥3 (regardless of LP)
- 3 or more criteria present = metabolic syndrome diagnosis per IDF/ATP III
- This is independent of LP value

**Example:**
- LP=0, Nilai=3 → Risk 3 ✓ (has 3 other criteria)
- LP=1, Nilai=5 → Risk 3 ✓ (all criteria present)

## Risk Classification Logic

```javascript
function getMetabolicSyndromeRisk(totalScore, lpScore) {
    // If total score is 3 or more, always Risk 3 (metabolic syndrome)
    if (totalScore >= 3) {
        return 3;
    }

    // If total score is 0-2, check LP to determine Risk 1 or 2
    if (totalScore <= 2) {
        if (lpScore === 0) {
            // Normal waist circumference, max risk is 1
            return 1;
        } else if (lpScore === 1) {
            // Abnormal waist circumference with 1-2 criteria, Risk 2
            return 2;
        }
    }

    // Default (shouldn't reach here)
    return 0;
}
```

## Risk Labels and Colors

| Risk | Label | Color | Interpretation |
|------|-------|-------|-----------------|
| 1 | Normal | Green (#dcfce7) | No metabolic syndrome risk |
| 2 | Medium | Yellow (#fef3c7) | Abnormal waist, monitor closely |
| 3 | Sindrom Metabolik | Red (#fecaca) | Metabolic syndrome diagnosed |

## Data Flow and Integration

### 1. Lab Results Loading
```javascript
const labResults = await labService.getPemeriksaanLabByMcuId(mcuId);
// Returns array: [{ lab_item_id: 7, value: ... }, { lab_item_id: 9, value: ... }, ...]
```

### 2. Lab Result Mapping
```javascript
const labMap = {};
labResults.forEach(lab => {
    labMap[lab.lab_item_id] = lab.value;
});

const glucose = labMap[7];        // Lab ID 7: GDP
const triglycerides = labMap[9];  // Lab ID 9: Trigliserida
const hdl = labMap[10];           // Lab ID 10: HDL
```

### 3. Complete Assessment
```javascript
const metabolicResult = metabolicSyndromeService.performMetabolicSyndromeAssessment(
    employee,           // Has gender info
    latestMCU,         // Has chest_circumference (waist), bloodPressure
    labResults,        // Array of lab results
    hasDiabetes        // From medical histories
);

// Returns:
{
    scores: {
        lp: 0|1,
        tg: 0|1,
        hdl: 0|1,
        td: 0|1,
        gdp: 0|1
    },
    totalScore: 0-5,
    countedCriteria: 0-5,    // How many of 5 criteria were available
    risk: 1|2|3
}
```

## Edge Cases and Missing Data

### Missing Data Handling
- **Missing Lab Values:** Return `undefined` for that parameter
- **Missing MCU Fields:** Return `undefined` for that parameter
- **Total Score Calculation:** Only count defined values
- **Display:** Show `-` (dash) for missing/undefined values

**Example:**
```javascript
// Employee has no triglycerides lab result
const labResults = [
    { lab_item_id: 7, value: 95 },    // GDP
    { lab_item_id: 10, value: 45 }    // HDL
];
// TG will be undefined, not counted in total
// Result shows: LP=1, TG=-, HDL=0, TD=0, GDP=0
// Total is still calculated correctly
```

### Diabetes Handling
- If employee has diabetes diagnosis, GDP score is **automatically 1**, regardless of actual glucose value
- This follows clinical best practice - diabetic patients are automatically high-risk for glucose criteria

## Test Cases with LP-Dependent Risk

### Test 1: LP=0, Nilai=0 → Risk 1
```
Input: LP=0, TG=0, HDL=0, TD=0, GDP=0
Expected: Risk 1 (no abnormalities)
```

### Test 2: LP=0, Nilai=2 → Risk 1
```
Input: LP=0, TG=1, HDL=1, TD=0, GDP=0
Expected: Risk 1 (normal waist = safe despite other issues)
```

### Test 3: LP=1, Nilai=1 → Risk 2
```
Input: LP=1, TG=0, HDL=0, TD=0, GDP=0
Expected: Risk 2 (abnormal waist = concerning)
```

### Test 4: LP=1, Nilai=2 → Risk 2
```
Input: LP=1, TG=0, HDL=1, TD=0, GDP=0
Expected: Risk 2 (abnormal waist with 1 other criterion)
```

### Test 5: LP=1, Nilai=3 → Risk 3
```
Input: LP=1, TG=1, HDL=1, TD=0, GDP=0
Expected: Risk 3 (metabolic syndrome - 3 criteria)
```

### Test 6: LP=0, Nilai=3 → Risk 3
```
Input: LP=0, TG=1, HDL=1, TD=1, GDP=0
Expected: Risk 3 (metabolic syndrome - even without LP)
```

### Test 7: LP=1, Nilai=5 → Risk 3
```
Input: LP=1, TG=1, HDL=1, TD=1, GDP=1
Expected: Risk 3 (full metabolic syndrome)
```

## Gender-Specific Thresholds Summary

| Parameter | Males | Females |
|-----------|-------|---------|
| Waist LP | ≥90 cm | ≥80 cm |
| HDL | <40 mg/dL (abnormal) | <50 mg/dL (abnormal) |
| Triglycerides | ≥150 mg/dL (abnormal) | ≥150 mg/dL (abnormal) |
| Blood Pressure | ≥130/85 mmHg (abnormal) | ≥130/85 mmHg (abnormal) |
| Glucose | ≥100 mg/dL or diabetes (abnormal) | ≥100 mg/dL or diabetes (abnormal) |

## Implementation Files

1. **Service Layer:** `js/services/metabolicSyndromeService.js`
   - Contains all scoring functions
   - Exports: `performMetabolicSyndromeAssessment()`, `getMetabolicSyndromeRisk()`, `getMetabolicSyndromeRiskLabel()`

2. **Dashboard Integration:** `js/pages/assessment-rahma-dashboard.js`
   - Imports metabolic syndrome service
   - Loads lab results for each employee
   - Calculates and displays metabolic syndrome scores alongside Jakarta Cardiovascular scores

3. **Table Display:** Lines 439-471 in assessment-rahma-dashboard.js
   - Shows 7 columns: LP, TG, HDL, TD, GDP, Nilai (total), Risk
   - Uses binary (0/1) display for individual parameters
   - Uses risk colors for risk level display

## References

- **IDF (International Diabetes Federation) Criteria**
- **ATP III (Adult Treatment Panel III) Criteria**
- Waist circumference thresholds: Asian population standards
- Gender-specific HDL cutoffs: ATP III recommendations
