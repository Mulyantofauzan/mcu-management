# FRAMINGHAM IMPLEMENTATION - TESTING CHECKLIST

**Purpose:** Comprehensive testing guide to validate calculator before integration
**Target:** All 11 parameters, edge cases, database operations
**Status:** Ready for Testing

---

## ✅ PRE-INTEGRATION TESTING

### Phase 1: Unit Tests (Calculator Service)

- [ ] **Gender Scoring**
  - [ ] Female input returns 0
  - [ ] Male input returns 1
  - [ ] 'wanita' accepted (Indonesian)
  - [ ] 'pria' accepted (Indonesian)
  - [ ] 'female' accepted (English)
  - [ ] 'male' accepted (English)
  - [ ] Abbreviations 'f' and 'm' work
  - [ ] Case-insensitive ('WANITA', 'Pria' work)
  - [ ] Default to 0 for invalid input

- [ ] **Age Scoring**
  - [ ] Age 28 → -4 (25-34 range)
  - [ ] Age 38 → -3 (35-39 range)
  - [ ] Age 42 → -2 (40-44 range)
  - [ ] Age 47 → 0 (45-49 range, baseline)
  - [ ] Age 52 → 1 (50-54 range)
  - [ ] Age 57 → 2 (55-59 range)
  - [ ] Age 62 → 3 (60-64 range)
  - [ ] Age 70 → extrapolates correctly
  - [ ] Age 20 → defaults to minimum
  - [ ] Invalid age returns 0

- [ ] **Job Risk Scoring**
  - [ ] 'low' returns 0
  - [ ] 'moderate' returns 1
  - [ ] 'high' returns 2
  - [ ] Case-insensitive
  - [ ] Indonesian terms work ('rendah', 'sedang', 'tinggi')
  - [ ] Default to moderate (1)

- [ ] **Exercise Frequency Scoring** (PROTECTIVE)
  - [ ] '>2x_seminggu' → -3 (most protective)
  - [ ] '1-2x_seminggu' → 0 (baseline)
  - [ ] '1-2x_sebulan' → 1
  - [ ] 'tidak_pernah' → 2 (sedentary)
  - [ ] English equivalents work
  - [ ] Case-insensitive
  - [ ] Default to baseline (0)

- [ ] **Smoking Status Scoring**
  - [ ] 'tidak_merokok' → 0
  - [ ] 'mantan_perokok' → 3
  - [ ] 'perokok' → 4 (highest single risk)
  - [ ] English equivalents work
  - [ ] Case-insensitive
  - [ ] Default to non-smoker (0)

- [ ] **Blood Pressure Scoring**
  - [ ] Normal <130/85 → 0
  - [ ] Elevated 130-139/85-89 → 1
  - [ ] Stage 2 140-159/90-99 → 2
  - [ ] Stage 3 160-179/100-109 → 3
  - [ ] Crisis ≥180/≥110 → 4
  - [ ] Boundary values correctly classified
  - [ ] Either SBP or DBP determines score
  - [ ] String parsing works ('145/92')
  - [ ] Invalid values default to 0
  - [ ] NaN handling correct

- [ ] **BMI Scoring**
  - [ ] Normal 13.79-25.99 → 0
  - [ ] Overweight 26.00-29.99 → 1
  - [ ] Obese ≥30.00 → 2
  - [ ] Boundary values correct
  - [ ] Invalid BMI defaults to 0
  - [ ] Decimal precision handled

- [ ] **Glucose Scoring** (Binary Threshold)
  - [ ] ≤126 mg/dL → 0 (normal)
  - [ ] ≥127 mg/dL → 2 (diabetic)
  - [ ] Edge case 126.5 → 2
  - [ ] Invalid values default to 0

- [ ] **Cholesterol Scoring**
  - [ ] <200 → 0
  - [ ] 200-239 → 1
  - [ ] 240-279 → 2
  - [ ] ≥280 → 3
  - [ ] Boundary values correct
  - [ ] Invalid defaults to 0

- [ ] **Triglycerides Scoring**
  - [ ] <200 → 0
  - [ ] 200-299 → 1
  - [ ] ≥300 → 2
  - [ ] Boundary values correct
  - [ ] Invalid defaults to 0

- [ ] **HDL Scoring** (INVERSE/PROTECTIVE)
  - [ ] >44 → 0 (protective)
  - [ ] 35-44 → 1
  - [ ] <35 → 2 (risk factor)
  - [ ] Boundary values correct
  - [ ] Invalid defaults to moderate (1)
  - [ ] Note: High HDL = LOW score (opposite of others)

---

### Phase 2: Integration Tests (Complete Assessment)

- [ ] **Composite Score Calculation**
  - [ ] All 11 parameters sum correctly
  - [ ] Score range -4 to 26 respected
  - [ ] Negative total scores possible (young, healthy)
  - [ ] Positive total scores calculated correctly

- [ ] **Risk Category Classification**
  - [ ] Score 0-4 → 'low' ✅
  - [ ] Score 5-11 → 'medium' ⚠️
  - [ ] Score 12+ → 'high' 🔴
  - [ ] Boundary scores classified correctly
  - [ ] Negative scores → 'low'

- [ ] **Result Structure**
  - [ ] All 11 individual scores present
  - [ ] total_score present
  - [ ] risk_category present
  - [ ] cvd_risk_percentage present
  - [ ] status present
  - [ ] description present
  - [ ] assessment_data object created
  - [ ] Input/scores/risk nested correctly

---

### Phase 3: Edge Cases & Error Handling

- [ ] **Missing Data**
  - [ ] Null gender → defaults to female (0)
  - [ ] Null age → defaults to 0
  - [ ] Null lab values → defaults to 0
  - [ ] Partial data handled gracefully
  - [ ] No crash on incomplete input

- [ ] **Extreme Values**
  - [ ] Age 120+ → handled correctly
  - [ ] Age 5 → handled correctly
  - [ ] BP 50/30 → scored as low risk
  - [ ] BP 250/180 → scored as high risk
  - [ ] Glucose 500 → scored as high
  - [ ] Glucose 10 → scored as normal (no crash)
  - [ ] BMI 5 → handled gracefully
  - [ ] BMI 60 → scored as obese

- [ ] **Type Conversion**
  - [ ] String numbers convert ('125' → 125)
  - [ ] Boolean inputs handled
  - [ ] Object inputs rejected gracefully
  - [ ] Arrays handled safely

- [ ] **Floating Point Precision**
  - [ ] BMI 26.0 vs 25.99 classified correctly
  - [ ] Rounding doesn't affect scoring
  - [ ] Decimal values handled

---

### Phase 4: Example Scenarios

- [ ] **Scenario 1: Young Active Female** (Should be LOW)
  - [ ] Expected total score: -7 to 0
  - [ ] Actual total score: ___
  - [ ] Risk category: LOW ✅
  - [ ] All protective factors recognized

- [ ] **Scenario 2: Middle-Aged Male with Risk Factors** (Should be HIGH)
  - [ ] Expected total score: 15-20
  - [ ] Actual total score: ___
  - [ ] Risk category: HIGH 🔴
  - [ ] Current smoking scored +4
  - [ ] Sedentary lifestyle scored +2
  - [ ] High BP scored +2

- [ ] **Scenario 3: Older Female with Good Control** (Should be MEDIUM)
  - [ ] Expected total score: 5-15
  - [ ] Actual total score: ___
  - [ ] Risk category: MEDIUM ⚠️
  - [ ] Age factor balanced by female gender
  - [ ] Good medication compliance reflected

---

### Phase 5: Utility Functions

- [ ] **getParameterLabels()**
  - [ ] Returns 11 labels
  - [ ] All labels in Indonesian
  - [ ] Keys match parameter names

- [ ] **getScoreDescription()**
  - [ ] Returns description for each score value
  - [ ] Descriptions are clinically accurate
  - [ ] No missing descriptions

- [ ] **getParameterNames()**
  - [ ] Returns all 11 parameter names
  - [ ] Names are in correct order
  - [ ] All names match snake_case convention

- [ ] **getParameterRanges()**
  - [ ] Shows min/max for each parameter
  - [ ] Ranges are accurate
  - [ ] Descriptions provided

---

### Phase 6: Data Persistence

- [ ] **Database Insertion**
  - [ ] `framingham_assessment` table exists
  - [ ] All columns accessible
  - [ ] Foreign keys work (mcu_id, employee_id)
  - [ ] assessment_data JSONB saves correctly
  - [ ] Timestamps auto-populated

- [ ] **Data Retrieval**
  - [ ] Can retrieve assessment by mcu_id
  - [ ] Can retrieve assessment by employee_id
  - [ ] All data returns intact
  - [ ] JSONB data readable

- [ ] **Data Integrity**
  - [ ] No duplicate mcu_id allowed
  - [ ] risk_category constraint enforced
  - [ ] All scores stored as integers
  - [ ] No data corruption on save

---

## 🧪 HOW TO RUN TESTS

### Automated Unit Tests

```javascript
// In browser console or Node.js environment
import { runUnitTests } from './framinghamCalculatorService.examples.js';
runUnitTests();

// Expected output: ✅ ALL TESTS PASSED
```

### Example Scenarios

```javascript
import {
  example1_YoungActiveFemale,
  example2_MiddleAgedMaleHighRisk,
  example3_OlderFemaleGoodControl
} from './framinghamCalculatorService.examples.js';

// Run each example and verify output matches expected risk category
const result1 = example1_YoungActiveFemale();
console.log(`Expected: LOW, Actual: ${result1.risk_category}`);

const result2 = example2_MiddleAgedMaleHighRisk();
console.log(`Expected: HIGH, Actual: ${result2.risk_category}`);

const result3 = example3_OlderFemaleGoodControl();
console.log(`Expected: MEDIUM, Actual: ${result3.risk_category}`);
```

### Manual Test Cases

```javascript
import { framinghamCalculatorService } from './framinghamCalculatorService.js';

// Test 1: Basic gender scoring
const g1 = framinghamCalculatorService.calculateGenderScore('wanita');
console.assert(g1 === 0, `Gender test failed: expected 0, got ${g1}`);

// Test 2: Age range boundary
const a1 = framinghamCalculatorService.calculateAgeScore(34);
const a2 = framinghamCalculatorService.calculateAgeScore(35);
console.assert(a1 === -4, `Age 34 failed: expected -4`);
console.assert(a2 === -3, `Age 35 failed: expected -3`);

// Test 3: Complete assessment
const result = framinghamCalculatorService.performCompleteAssessment({
  gender: 'pria', age: 50, jobRiskLevel: 'moderate',
  exerciseFrequency: '1-2x_seminggu', smokingStatus: 'perokok',
  systolic: 140, diastolic: 90, bmi: 27,
  glucose: 110, cholesterol: 200, triglycerides: 150, hdl: 45
});
console.assert(result.total_score >= 0, 'Total score should be >= 0');
console.assert(['low', 'medium', 'high'].includes(result.risk_category),
  'Invalid risk category');
```

---

## 📋 FIELD VALIDATION TESTS

For each input field, test:

```javascript
// Normal value ✅
calculateGenderScore('wanita');

// English alternative ✅
calculateGenderScore('female');

// Mixed case ✅
calculateGenderScore('WANITA');

// With spaces ✅
calculateGenderScore('  wanita  ');

// Invalid value (should default) ✅
calculateGenderScore('unknown');

// Null/undefined (should default) ✅
calculateGenderScore(null);
calculateGenderScore(undefined);
```

---

## 🎯 REAL MCU DATA TEST

Once you have actual MCU data:

1. [ ] Select random MCU from system
2. [ ] Extract all 11 parameters
3. [ ] Run through calculator
4. [ ] Verify:
   - [ ] No errors
   - [ ] Result makes clinical sense
   - [ ] Risk category reasonable for profile
   - [ ] Can save to database
   - [ ] Can retrieve from database

---

## 🔍 DATABASE VALIDATION TESTS

```sql
-- Test 1: Table exists
SELECT * FROM framingham_assessment LIMIT 1;

-- Test 2: Columns exist
\d framingham_assessment;

-- Test 3: Foreign keys work
SELECT f.*, m.mcu_id, e.employee_id
FROM framingham_assessment f
LEFT JOIN mcus m ON f.mcu_id = m.mcu_id
LEFT JOIN employees e ON f.employee_id = e.employee_id
LIMIT 1;

-- Test 4: Data types correct
SELECT
  pg_typeof(total_score),
  pg_typeof(risk_category),
  pg_typeof(assessment_data)
FROM framingham_assessment
LIMIT 1;

-- Test 5: Constraints enforced
-- Try: INSERT with invalid risk_category (should fail)
-- Try: INSERT with duplicate mcu_id (should fail)
```

---

## 📊 ACCEPTANCE CRITERIA

Assessment is READY when:

- ✅ All 11 unit tests pass
- ✅ All 3 example scenarios produce correct risk categories
- ✅ Edge cases handled without crashes
- ✅ Database save/retrieve works
- ✅ Data integrity verified
- ✅ No console errors
- ✅ Performance acceptable (<100ms calculation)
- ✅ All field validations pass
- ✅ Utility functions return correct data

---

## 🚨 SIGN-OFF CHECKLIST

- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Code reviewed
- [ ] Documentation verified
- [ ] Database migration executed
- [ ] Example data tested
- [ ] Edge cases handled
- [ ] Performance acceptable
- [ ] Ready for production deployment

---

## 📝 TEST REPORT TEMPLATE

```
TEST EXECUTION REPORT
═════════════════════════════════════════

Date: _______________
Tester: _______________
Build Version: _______________

UNIT TESTS
──────────────────────────────
Gender Scoring:        ✅ PASS / ❌ FAIL
Age Scoring:           ✅ PASS / ❌ FAIL
Job Risk Scoring:      ✅ PASS / ❌ FAIL
Exercise Scoring:      ✅ PASS / ❌ FAIL
Smoking Scoring:       ✅ PASS / ❌ FAIL
Blood Pressure:        ✅ PASS / ❌ FAIL
BMI Scoring:           ✅ PASS / ❌ FAIL
Glucose Scoring:       ✅ PASS / ❌ FAIL
Cholesterol Scoring:   ✅ PASS / ❌ FAIL
Triglycerides Scoring: ✅ PASS / ❌ FAIL
HDL Scoring:           ✅ PASS / ❌ FAIL

SCENARIO TESTS
──────────────────────────────
Young Active Female:   ✅ PASS / ❌ FAIL
Middle-Aged High Risk: ✅ PASS / ❌ FAIL
Older Good Control:    ✅ PASS / ❌ FAIL

INTEGRATION TESTS
──────────────────────────────
Database Save:         ✅ PASS / ❌ FAIL
Database Retrieve:     ✅ PASS / ❌ FAIL
Data Integrity:        ✅ PASS / ❌ FAIL

EDGE CASES
──────────────────────────────
Extreme Values:        ✅ PASS / ❌ FAIL
Type Conversion:       ✅ PASS / ❌ FAIL
Error Handling:        ✅ PASS / ❌ FAIL

OVERALL RESULT: ✅ APPROVED / ❌ NEEDS FIXES

Issues Found:
1. _______________
2. _______________

Sign-off: _________________ Date: _______
```

---

**Document Version:** 1.0
**Created:** 2025-12-13
**Status:** Ready for Testing

Use this checklist to systematically validate all aspects of the Framingham calculator before integration into production.
