# FRAMINGHAM RISK SCORE - RAHMA (Risk Assessment Health Management Analytics)

## PROGRAM OVERVIEW

**Name:** RAHMA (Risk Assessment Health Management Analytics)
**Based on:** Framingham Cardiovascular Disease (CVD) Risk Score (Detailed Scoring System)
**Purpose:** Calculate 10-year CVD risk for employees using 11 health parameters with precise scoring intervals
**Database Table:** `framingham_assessment`

---

## 📊 COMPLETE 11-PARAMETER DETAILED SCORING SYSTEM

### Parameter 1: GENDER (Jenis Kelamin)
**Field:** `jenis_kelamin_score`

| Gender | Score |
|--------|-------|
| Female (Wanita) | -7 |
| Male (Laki-laki) | 1 |

**Logic:** Males have higher baseline cardiovascular risk due to biological factors. Female score is negative (protective factor).

---

### Parameter 2: AGE (Umur)
**Field:** `umur_score`
**Source:** Calculated from `employees.birth_date` at time of MCU

| Age Range | Score | Risk Classification |
|-----------|-------|-------------------|
| < 30 tahun | 0 | Very Low |
| 30-34 tahun | 1 | Low |
| 35-39 tahun | 2 | Low |
| 40-44 tahun | 3 | Moderate |
| 45-49 tahun | 4 | Moderate |
| 50-54 tahun | 5 | Moderate-High |
| 55-59 tahun | 6 | High |
| 60-64 tahun | 7 | High |
| >= 65 tahun | 8 | Very High |

**Logic:** CVD risk increases significantly with age, especially after 40 years old

---

### Parameter 3: JOB RISK LEVEL (Risiko Pekerjaan)
**Field:** `job_risk_score`
**Source:** `job_titles.risk_level` (added by migration)

| Risk Level | Score | Description |
|-----------|-------|-------------|
| Low | 0 | Minimal occupational stress/hazard (office, administrative) |
| Moderate | 1 | Moderate stress/hazard (mixed exposure) |
| High | 2 | High occupational stress/hazard (mining, chemical exposure, shift work) |

**Logic:** Occupational stress and hazard exposure increase cardiovascular strain and CVD risk

**Job Title Examples:**
- **Low:** Manager, Secretary, Accountant
- **Moderate:** Supervisor, Technician, Driver
- **High:** Miner, Chemical Handler, Security Guard, Night Shift Worker

---

### Parameter 4: SMOKING STATUS (Status Merokok)
**Field:** `smoking_score`
**Source:** `mcus.smoking_status` (enum: tidak_merokok, mantan_perokok, perokok)

| Smoking Status | Score | Risk Impact |
|---|---|---|
| Tidak Merokok (Non-smoker) | 0 | Lowest CVD risk |
| Mantan Perokok (Former smoker) | 1 | Reduced risk (still elevated vs never-smoker) |
| Perokok (Current smoker) | 3 | Significantly elevated CVD risk |

**Logic:**
- Current smoking: Direct damage to blood vessels, increases clotting, raises BP
- Former smoking: Risk declines over time but remains elevated for 10+ years
- Never smoked: Baseline lowest risk

**Smoking Impact Timeline:**
- First week: BP rises, vessel damage begins
- 3 months: Risk begins to decline
- 1 year: CVD risk drops by 50%
- 10-15 years: Risk approaches non-smoker level

---

### Parameter 5: EXERCISE FREQUENCY (Frekuensi Olahraga)
**Field:** `exercise_score`
**Source:** `mcus.exercise_frequency` (enum: >2x_seminggu, 1-2x_seminggu, 1-2x_sebulan, tidak_pernah)

| Exercise Frequency | Score | Risk Level |
|---|---|---|
| >2x Seminggu (>2x/week) | 0 | Excellent cardiovascular fitness |
| 1-2x Seminggu (1-2x/week) | 1 | Good cardiovascular fitness |
| 1-2x Sebulan (1-2x/month) | 2 | Inadequate exercise |
| Tidak Pernah (Never) | 3 | Sedentary - very high risk |

**Logic:**
- Regular exercise (>2x/week): Strengthens heart, improves endurance, lowers BP & cholesterol
- Sedentary lifestyle: Major risk factor - increases BP, weight, and inflammation

**Recommended Exercise:**
- Minimum: 150 minutes moderate intensity per week (30 min x 5 days)
- Or: 75 minutes vigorous intensity per week
- Benefits: Lower BP by 5-7 mmHg, lower cholesterol, better glucose control

---

### Parameter 6: BLOOD PRESSURE (Tekanan Darah)
**Field:** `tekanan_darah_score`
**Source:** `mcus.blood_pressure` (format: "SBP/DBP" e.g., "120/80")

| SBP / DBP (mmHg) | Category | Score | Risk |
|---|---|---|---|
| < 120 / < 80 | Normal | 0 | Optimal |
| 120-139 / 80-89 | Elevated/Stage 1 | 1 | At risk |
| 140-159 / 90-99 | Stage 2 | 2 | High risk |
| ≥ 160 / ≥ 100 | Stage 3 (Hypertension Crisis) | 3 | Very high risk |

**Logic:**
- **SBP (Systolic):** Pressure when heart contracts - main predictor of CVD
- **DBP (Diastolic):** Pressure when heart relaxes - less predictive but still important
- **Both elevated?** Use the HIGHER category
- **Hypertension:** Major risk factor - damages vessel walls, increases clot risk

**Key Thresholds:**
- < 120/80: Optimal (very low risk)
- 120-139/80-89: Borderline (start lifestyle changes)
- ≥ 140/90: Requires intervention

**Normal BP by Age:**
- Adults: < 120/80 mmHg
- With antihypertensive meds: Target < 140/90 mmHg (or < 130/80 if diabetic)

---

### Parameter 7: BMI (Body Mass Index)
**Field:** `bmi_score`
**Source:** `mcus.bmi` (pre-calculated: weight_kg / (height_m)²)

| BMI | Category | Score | Risk Classification |
|---|---|---|---|
| < 18.5 | Underweight | 1 | Health risk (malnutrition) |
| 18.5 - 24.9 | Normal weight | 0 | Optimal |
| 25.0 - 29.9 | Overweight | 1 | Increased risk |
| 30.0 - 34.9 | Obese Class I | 2 | High risk |
| 35.0 - 39.9 | Obese Class II | 3 | Very high risk |
| ≥ 40 | Obese Class III | 4 | Extreme risk |

**Logic:**
- **Normal (18.5-24.9):** Lowest CVD risk
- **Overweight (25-29.9):** Increased cholesterol, BP, glucose intolerance
- **Obese (≥30):** Major risk factor - metabolic syndrome, inflammation, increased clotting
- **Underweight:** Risk from malnutrition (low hemoglobin, muscle wasting)

**BMI Calculation:**
```
BMI = Weight (kg) / Height (m)²
Example: 70 kg, 1.75 m = 70 / (1.75 × 1.75) = 22.86 (Normal)
```

**Health Risks by BMI:**
- BMI 25-29.9: 1.5x CVD risk increase
- BMI 30-34.9: 2-3x CVD risk increase
- BMI ≥35: 5+ x CVD risk increase

---

### Parameter 8: FASTING GLUCOSE (Gula Darah Puasa)
**Field:** `gdp_score`
**Source:** `pemeriksaan_lab` where `lab_item_id = 7` (Gula Darah Puasa)

| Fasting Glucose (mg/dL) | Category | Score | Clinical Status |
|---|---|---|---|
| < 100 | Normal | 0 | Optimal glucose metabolism |
| 100-125 | Impaired Fasting Glucose (IFG) | 1 | Prediabetic state |
| 126-199 | Diabetic (Uncontrolled) | 2 | Diabetes - high risk |
| ≥ 200 | Diabetes (Severe) | 3 | Diabetes - very high risk |

**Logic:**
- **Glucose < 100:** Optimal insulin sensitivity, pancreas functioning well
- **100-125:** Prediabetes - cells becoming insulin resistant
- **≥126:** Diabetes - major CVD risk factor (affects vessel walls, cholesterol, BP)

**Diabetes & CVD Risk:**
- Diabetes increases CVD risk 2-4x
- Mechanism: High glucose damages blood vessel walls, promotes clot formation
- Long-term: Contributes to plaque formation, atherosclerosis

**Additional Test:**
- Use `lab_item_id = 31` (Gula Darah 2 JPP - 2-hour post-meal glucose) if available
- If 2-hour glucose ≥200 mg/dL = diagnostic for diabetes

---

### Parameter 9: TOTAL CHOLESTEROL (Kolesterol Total)
**Field:** `kolesterol_score`
**Source:** `pemeriksaan_lab` where `lab_item_id = 8` (Kolesterol Total)

| Total Cholesterol (mg/dL) | Category | Score | Risk |
|---|---|---|---|
| < 160 | Desirable | 0 | Low |
| 160-199 | Borderline High | 1 | Moderate |
| 200-239 | High | 2 | High |
| ≥ 240 | Very High | 3 | Very High |

**Logic:**
- **Cholesterol < 160:** Optimal - lowest CVD risk
- **160-199:** Begin preventive measures
- **200-239:** Significant risk - requires intervention
- **≥240:** Major risk - very likely to develop atherosclerosis

**Relationship to CVD:**
- Each 1% increase in cholesterol → ~2% increase in CVD risk
- Cholesterol 240 = 2x CVD risk vs 160
- Total cholesterol doesn't distinguish good vs bad cholesterol

**Recommendation:**
- For complete assessment, also consider LDL, HDL, triglycerides
- This score uses TOTAL cholesterol for simplicity

---

### Parameter 10: TRIGLYCERIDES (Trigliserida)
**Field:** `trigliserida_score`
**Source:** `pemeriksaan_lab` where `lab_item_id = 9` (Trigliserida)

| Triglycerides (mg/dL) | Category | Score | Risk |
|---|---|---|---|
| < 150 | Normal | 0 | Low risk |
| 150-199 | Borderline High | 1 | Moderate risk |
| 200-499 | High | 2 | High risk |
| ≥ 500 | Very High | 3 | Very High risk |

**Logic:**
- **Triglycerides < 150:** Optimal metabolism
- **150-199:** Need to reduce (diet, exercise, weight loss)
- **≥200:** Major risk factor - small dense LDL particles, increases clotting
- **≥500:** Critical risk - risk of pancreatitis + extreme CVD risk

**Why High Triglycerides = Risk:**
- Created from excess carbs/sugar and alcohol
- High levels correlate with low HDL (bad combination)
- Associated with metabolic syndrome (BP, glucose, cholesterol also high)
- Promotes clot formation, vessel inflammation

**Lifestyle Impact:**
- Refined carbs/sugar → increases TG by 10-30%
- Alcohol → increases TG by 5-50%
- Weight loss → can reduce TG by 20-30%

---

### Parameter 11: HDL CHOLESTEROL (Kolesterol HDL)
**Field:** `hdl_score`
**Source:** `pemeriksaan_lab` where `lab_item_id = 10` (HDL Kolestrol)

| HDL Cholesterol (mg/dL) | Category | Score | Protective Effect |
|---|---|---|---|
| ≥ 60 | Excellent | 0 | Strong protection vs CVD |
| 40-59 | Good | 1 | Moderate protection |
| < 40 | Low | 2 | Poor protection (high risk) |

**Logic:**
- **HDL ≥60:** "Good cholesterol" - protective factor, removes plaque
- **HDL 40-59:** Adequate but could be better
- **HDL <40:** Inadequate protection - allows LDL to accumulate in vessels

**Why HDL is Protective:**
- Removes cholesterol from arteries (reverse cholesterol transport)
- Reduces inflammation in vessels
- Prevents plaque formation
- Increases by: Regular exercise (especially aerobic), weight loss, alcohol in moderation

**Key Fact:**
- HDL is the ONLY inverse risk factor
- LOW HDL is often MORE predictive than HIGH LDL
- Can be modified: 30-45 min exercise 5x/week increases HDL by 3-9 mg/dL

---

## 🎯 TOTAL SCORE CALCULATION & RISK CATEGORIES

### Maximum Score
**Total Maximum Score:** 26 points
- Gender: 0-3
- Age: 0-8
- Job Risk: 0-2
- Smoking: 0-3
- Exercise: 0-3
- Blood Pressure: 0-3
- BMI: 0-4
- Fasting Glucose: 0-3
- Total Cholesterol: 0-3
- Triglycerides: 0-3
- HDL Cholesterol: 0-2

### Risk Category Classification

| Total Score | Risk Category | 10-Year CVD Risk | Recommendation |
|---|---|---|---|
| 0-4 | LOW | < 5% | Maintain current lifestyle, annual check-up |
| 5-11 | MODERATE | 5-20% | Strengthen lifestyle changes, check-up 6 months |
| 12-26 | HIGH | > 20% | Intensive intervention needed, check-up 3 months |

### Risk Category Details

#### 1. LOW RISK (Score 0-4)
- **10-year CVD probability:** < 5%
- **Characteristics:** Good lifestyle, normal vitals, healthy labs
- **Action:**
  - Annual MCU
  - Maintain good habits
  - General health education

#### 2. MODERATE RISK (Score 5-11)
- **10-year CVD probability:** 5-20%
- **Characteristics:** Some risk factors present (overweight, borderline BP, smoking)
- **Action:**
  - Semi-annual MCU (6 months)
  - Intensive lifestyle counseling
  - Consider medication (if BP/cholesterol borderline-high)
  - Exercise program: 30 min, 5x/week
  - Dietary modifications

#### 3. HIGH RISK (Score 12-26)
- **10-year CVD probability:** > 20%
- **Characteristics:** Multiple risk factors (obesity, high BP, high cholesterol, diabetes, smoking)
- **Action:**
  - Quarterly MCU (3 months)
  - Specialist referral (cardiologist if needed)
  - Medication management (antihypertensive, statin, aspirin)
  - Aggressive lifestyle intervention
  - Monitor for cardiac events

---

## 📋 ASSESSMENT DATA STORAGE

### Database Structure (framingham_assessment table)

```sql
CREATE TABLE public.framingham_assessment (
  id uuid PRIMARY KEY,
  mcu_id VARCHAR UNIQUE NOT NULL,              -- Links to MCU
  employee_id VARCHAR NOT NULL,                -- Links to employee

  -- Individual scores (11 parameters)
  jenis_kelamin_score INTEGER,
  umur_score INTEGER,
  job_risk_score INTEGER,
  smoking_score INTEGER,
  exercise_score INTEGER,
  tekanan_darah_score INTEGER,
  bmi_score INTEGER,
  gdp_score INTEGER,
  kolesterol_score INTEGER,
  trigliserida_score INTEGER,
  hdl_score INTEGER,

  -- Final result
  total_score INTEGER,
  risk_category VARCHAR CHECK (risk_category IN ('low', 'medium', 'high')),

  -- Audit trail
  assessment_data JSONB,          -- Snapshot of all parameters
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by VARCHAR
);
```

### assessment_data JSON Structure

```json
{
  "mcu_date": "2024-12-13",
  "employee_id": "EMP001",
  "employee_name": "John Doe",
  "department": "Mining Operations",
  "job_title": "Mine Supervisor",
  "age_at_mcu": 45,
  "gender": "Male",

  "parameters": {
    "gender": {
      "value": "Male",
      "score": 3
    },
    "age": {
      "value": 45,
      "score": 4
    },
    "job_risk_level": {
      "value": "High",
      "score": 2
    },
    "smoking_status": {
      "value": "Perokok",
      "score": 3
    },
    "exercise_frequency": {
      "value": "Tidak Pernah",
      "score": 3
    },
    "blood_pressure": {
      "sbp": 155,
      "dbp": 98,
      "value": "155/98",
      "category": "Stage 2",
      "score": 2
    },
    "bmi": {
      "value": 32.5,
      "category": "Obese Class I",
      "score": 2
    },
    "fasting_glucose": {
      "value": 118,
      "category": "IFG (Impaired Fasting Glucose)",
      "score": 1
    },
    "total_cholesterol": {
      "value": 225,
      "category": "High",
      "score": 2
    },
    "triglycerides": {
      "value": 185,
      "category": "Borderline High",
      "score": 1
    },
    "hdl_cholesterol": {
      "value": 38,
      "category": "Low",
      "score": 2
    }
  },

  "calculation": {
    "sum_scores": 25,
    "total_score": 25,
    "risk_category": "HIGH",
    "estimated_10_year_cvd_risk": "25%"
  },

  "interpretation": {
    "summary": "High CVD risk - multiple risk factors present",
    "key_risk_factors": [
      "Male (higher baseline)",
      "Age 45 (increasing risk)",
      "Smoking current",
      "Sedentary (no exercise)",
      "Overweight (BMI 32.5)",
      "High blood pressure",
      "Impaired glucose tolerance",
      "High cholesterol",
      "Low HDL cholesterol"
    ],
    "recommendations": [
      "Immediate cardiology referral",
      "Start antihypertensive medication",
      "Start statin therapy",
      "QUIT smoking - critical",
      "Intensive exercise program (30 min, 5x/week)",
      "Dietary modification (DASH diet)",
      "Weight loss goal: 5-10 kg",
      "Quarterly follow-up (3 months)",
      "Monitor for cardiac symptoms"
    ]
  }
}
```

---

## 🔄 ASSESSMENT WORKFLOW

### Step 1: Data Collection (MCU)
- Employee undergoes standard MCU
- Collect all 11 parameters:
  - Gender, Age
  - Job title (→ risk_level)
  - Smoking status, Exercise frequency
  - Blood pressure, BMI
  - Lab results (glucose, cholesterol, triglycerides, HDL)

### Step 2: Score Calculation
- Calculate individual score for each parameter
- Sum all 11 scores
- Determine risk category (low/moderate/high)

### Step 3: Assessment Storage
- Save assessment record to `framingham_assessment` table
- Store `assessment_data` JSON with full details
- Record `created_by` user for audit trail

### Step 4: Risk Communication
- Display risk category with color coding
- Provide specific recommendations based on risk level
- Generate recommendations report

### Step 5: Follow-up & Monitoring
- **Low risk:** Annual MCU
- **Moderate risk:** Semi-annual MCU (6 months)
- **High risk:** Quarterly MCU (3 months) + specialist referral

---

## 📈 IMPLEMENTATION PRIORITY

### Must-Have
1. Implement scoring calculation logic
2. Store assessments in database
3. Display risk category and score
4. Generate recommendations by risk level

### Should-Have
1. Create trend analysis (score changes over time)
2. Department-level risk aggregation
3. Automated alerts for high-risk employees
4. Risk factor identification (which factor is most problematic)

### Nice-to-Have
1. Predictive modeling (who will become high-risk next year)
2. Intervention tracking (smoking cessation program completion)
3. Risk reduction calculator (what if quit smoking?)
4. Integration with health promotion programs

---

## 📊 DATA VALIDATION RULES

### Mandatory Fields
- Gender (must not be null)
- Age (calculated from birth_date, must be 18+)
- Job risk level (default: moderate)
- Smoking status (can be null, default: unknown)
- Exercise frequency (can be null, default: unknown)
- Blood pressure (must have valid SBP/DBP)
- BMI (must be calculated from height/weight)
- All 4 lab values (glucose, cholesterol, triglycerides, HDL)

### Validation Rules
- Age: 18-100 years
- SBP: 60-250 mmHg
- DBP: 40-150 mmHg
- BMI: 10-60
- Glucose: 40-500 mg/dL
- Cholesterol: 100-400 mg/dL
- Triglycerides: 20-2000 mg/dL
- HDL: 5-100 mg/dL

---

## 🎓 FRAMINGHAM RISK SCORE BACKGROUND

### Original Framingham Study
- **Conducted:** 1948-present (76+ years continuous)
- **Participants:** Started with 5,000 residents from Framingham, Massachusetts
- **Objective:** Identify risk factors for cardiovascular disease
- **Key Finding:** Risk factors are additive (each factor independently increases risk)

### Modified for Indonesia Context (RAHMA)
- **Adapted:** For Indonesian occupational health setting
- **Cultural modifications:**
  - Job risk level (mining, chemical exposure relevant in Indonesia)
  - Exercise frequency thresholds adjusted for tropical climate
  - BMI reference values using WHO Asian standards (if applicable)
  - Lab values using standard international reference ranges

---

## ✅ VERIFICATION CHECKLIST

Before implementing Framingham assessment:

- [ ] All 11 parameters can be extracted from existing data
- [ ] Smoking status and exercise frequency data exists in MCU records
- [ ] Job titles have risk_level values assigned
- [ ] Lab items 7, 8, 9, 10 (glucose, cholesterol, TG, HDL) are being recorded
- [ ] Blood pressure format is consistent (SBP/DBP)
- [ ] BMI is being calculated correctly
- [ ] Gender field exists and is populated in employees table
- [ ] Birth date is accurate for age calculation
- [ ] Database migration has been applied (`framingham_assessment` table created)
- [ ] Score calculation logic has been verified against standard Framingham
- [ ] Risk categories and recommendations are appropriate for Indonesian context

---

## 📞 NEXT STEPS

1. **Confirm this scoring system** with your medical team/occupational health provider
2. **Create framinghamCalculatorService.js** with all scoring logic
3. **Implement assessment form/page** in MCU workflow
4. **Build results display** in dashboard
5. **Create reporting** for individual and departmental risk profiles
6. **Set up alerts** for high-risk employees requiring intervention

