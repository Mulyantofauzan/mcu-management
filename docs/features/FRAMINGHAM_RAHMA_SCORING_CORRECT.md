# FRAMINGHAM RISK SCORE - RAHMA (Risk Assessment Health Management Analytics)
## CORRECT SCORING SYSTEM (Based on Actual Scoring Table)

---

## 📊 COMPLETE 11-PARAMETER DETAILED SCORING

### Parameter 1: GENDER (Jenis Kelamin)
**Field:** `jenis_kelamin_score`

| Gender | Score |
|--------|-------|
| Wanita (Female) | 0 |
| Pria (Male) | 1 |

**Note:** Male baseline +1, Female baseline 0

---

### Parameter 2: AGE (Umur)
**Field:** `umur_score`

| Age Range | Score |
|-----------|-------|
| 25-34 | -4 |
| 35-39 | -3 |
| 40-44 | -2 |
| 45-49 | 0 |
| 50-54 | 1 |
| 55-59 | 2 |
| 60-64 | 3 |

**Logic:** Older age = higher score. Ages 45-49 are baseline (0).

---

### Parameter 3: JOB RISK LEVEL (JOB)
**Field:** `job_risk_score`

| Risk Level | Score |
|-----------|-------|
| Low | 0 |
| Moderate | 1 |
| High | 2 |

**Note:** Higher occupational risk = higher score

---

### Parameter 4: EXERCISE FREQUENCY (Olahraga)
**Field:** `exercise_score`

| Exercise Frequency | Score |
|---|---|
| >2x Seminggu (>2x/week) | -3 |
| 1-2x Seminggu (1-2x/week) | 0 |
| 1-2x Sebulan (1-2x/month) | 1 |
| Tidak Pernah (Never) | 2 |

**Logic:** More exercise = NEGATIVE score (protective). No exercise = +2.

---

### Parameter 5: SMOKING STATUS (MEROKOK)
**Field:** `smoking_score`

| Smoking Status | Score |
|---|---|
| Tidak Merokok (Non-smoker) | 0 |
| Mantan Perokok (Former smoker) | 3 |
| Merokok (Current smoker) | 4 |

**Logic:** Current smoking = highest risk (+4)

---

### Parameter 6: BLOOD PRESSURE (Tekanan Darah)
**Field:** `tekanan_darah_score`

| Blood Pressure (SBP/DBP) | Score |
|---|---|
| <130/<85 | 0 |
| 130-139/85-89 | 1 |
| 140-159/90-99 | 2 |
| 160-179/100-109 | 3 |
| ≥180/≥110 | 4 |

**Logic:** Higher BP = higher score. Normal <130/85 = 0.

---

### Parameter 7: BMI (Body Mass Index)
**Field:** `bmi_score`

| BMI Range | Score |
|---|---|
| 13.79-25.99 (Normal) | 0 |
| 26.00-29.99 (Overweight) | 1 |
| ≥30.00 (Obese) | 2 |

**Note:** Normal weight = 0, Overweight = +1, Obese = +2

---

### Parameter 8: FASTING GLUCOSE (GDP - Gula Darah Puasa)
**Field:** `gdp_score`

| Glucose Level (mg/dL) | Score |
|---|---|
| ≤126 | 0 |
| ≥127 | 2 |

**Logic:** Normal glucose ≤126 = 0, High glucose ≥127 = +2

---

### Parameter 9: TOTAL CHOLESTEROL (Kolesterol)
**Field:** `kolesterol_score`

| Cholesterol (mg/dL) | Score |
|---|---|
| <200 | 0 |
| 200-239 | 1 |
| 240-279 | 2 |
| ≥280 | 3 |

**Logic:** Higher cholesterol = higher score

---

### Parameter 10: TRIGLYCERIDES (Trigliserid)
**Field:** `trigliserida_score`

| Triglycerides (mg/dL) | Score |
|---|---|
| <200 | 0 |
| 200-299 | 1 |
| ≥300 | 2 |

**Logic:** Higher triglycerides = higher score

---

### Parameter 11: HDL CHOLESTEROL (HDL)
**Field:** `hdl_score`

| HDL (mg/dL) | Score |
|---|---|
| >44 | 0 |
| 35-44 | 1 |
| <35 | 2 |

**Logic:** Higher HDL = LOWER score (protective factor)

---

## 🎯 TOTAL SCORE & RISK CATEGORIES

### Score Range Breakdown:

**Minimum Score:** -4 (Young female, very active, excellent health)
**Maximum Score:** 26 (Older male, sedentary, poor health metrics)

### Risk Category Classification:

| Total Score | Risk Category | 10-Year CVD Risk | Status |
|---|---|---|---|
| **0-4** | LOW | < 5% | ✅ Optimal |
| **5-11** | MEDIUM/MODERATE | 5-20% | ⚠️ At Risk |
| **12-26** | HIGH | > 20% | 🔴 Critical |

---

## 📋 SCORING LOGIC SUMMARY

### Key Insights:

1. **Protective Factors (Negative/Lower Scores):**
   - Female gender (0 vs 1)
   - Younger age (negative scores for <45)
   - Regular exercise (negative -3 for >2x/week)
   - Normal/healthy lab values

2. **Risk Factors (Positive/Higher Scores):**
   - Male gender (+1)
   - Older age (+3 for age 60-64)
   - Current smoking (+4 - highest single score)
   - Sedentary lifestyle (+2 for no exercise)
   - High blood pressure (+4 for ≥180/110)
   - Low HDL cholesterol (+2 for <35)
   - High glucose (+2)

3. **Most Impactful Factors:**
   - Smoking status: Range 0-4 (4 points)
   - Blood pressure: Range 0-4 (4 points)
   - Age: Range -4 to 3 (7 points total)
   - Exercise: Range -3 to 2 (5 points total)

---

## 💾 DATABASE IMPLEMENTATION

### framingham_assessment Table Structure:

```javascript
{
  id: uuid,
  mcu_id: string (UNIQUE),
  employee_id: string,

  // 11 individual scores
  jenis_kelamin_score: integer,    // 0-1
  umur_score: integer,              // -4 to 3
  job_risk_score: integer,          // 0-2
  exercise_score: integer,          // -3 to 2
  smoking_score: integer,           // 0-4
  tekanan_darah_score: integer,     // 0-4
  bmi_score: integer,               // 0-2
  gdp_score: integer,               // 0-2
  kolesterol_score: integer,        // 0-3
  trigliserida_score: integer,      // 0-2
  hdl_score: integer,               // 0-2

  // Final result
  total_score: integer,             // -4 to 26
  risk_category: varchar,           // 'low', 'medium', 'high'

  // Audit trail
  assessment_data: jsonb,
  created_at: timestamp,
  updated_at: timestamp,
  created_by: varchar
}
```

---

## 🔄 CALCULATION EXAMPLE

### Employee Example: Male, Age 50, Smoking, Overweight

| Parameter | Value | Score |
|---|---|---|
| Gender | Pria | +1 |
| Age | 50 | +1 |
| Job Risk | Moderate | +1 |
| Exercise | Tidak Pernah | +2 |
| Smoking | Merokok | +4 |
| Blood Pressure | 150/95 | +2 |
| BMI | 28 | +1 |
| Glucose | 110 | 0 |
| Cholesterol | 220 | +1 |
| Triglycerides | 180 | 0 |
| HDL | 40 | +1 |
| **TOTAL** | | **+14** |

**Result:** Total Score = 14 → **HIGH RISK** (>20% 10-year CVD risk)

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create framingham_assessment table in Supabase
- [ ] Create framinghamCalculatorService.js with scoring logic
- [ ] Implement individual score functions (11 parameters)
- [ ] Calculate total_score = sum of all 11 scores
- [ ] Map total_score to risk_category (low/medium/high)
- [ ] Store assessment_data JSON snapshot
- [ ] Create UI to display results
- [ ] Implement alert system for high-risk employees
- [ ] Add follow-up recommendations based on risk level

