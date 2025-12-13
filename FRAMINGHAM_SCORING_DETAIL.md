# FRAMINGHAM RISK SCORE - RAHMA DETAILED SCORING DOCUMENTATION

---

## PARAMETER 1: GENDER (JENIS KELAMIN)

**Field Name:** `jenis_kelamin_score`
**Data Source:** `employees.gender`
**Score Range:** 0 to 1 point

### Scoring Table

| Gender | Value in Database | Score Points |
|--------|-------------------|--------------|
| Wanita (Female) | wanita / female | **0** |
| Pria (Male) | pria / male | **1** |

### Scoring Logic
- Wanita (Female): Score = 0 points
- Pria (Male): Score = 1 point

### Notes
- Gender is baseline demographic factor
- Male has +1 point compared to female due to higher baseline CVD risk
- This is a fixed score based on biological sex

---

## PARAMETER 2: AGE (UMUR)

**Field Name:** `umur_score`
**Data Source:** Calculated from `employees.birth_date` at time of MCU
**Calculation Method:** Age at MCU = (MCU Date - Birth Date) / 365.25
**Score Range:** -4 to 3 points

### Scoring Table

| Age Range (years) | Score Points |
|-------------------|--------------|
| 25 - 34 | **-4** |
| 35 - 39 | **-3** |
| 40 - 44 | **-2** |
| 45 - 49 | **0** |
| 50 - 54 | **1** |
| 55 - 59 | **2** |
| 60 - 64 | **3** |

### Scoring Logic
- Age 25-34: Score = -4 points (protective, young age)
- Age 35-39: Score = -3 points (protective, still young)
- Age 40-44: Score = -2 points (protective, approaching middle age)
- Age 45-49: Score = 0 points (baseline reference)
- Age 50-54: Score = +1 point (increased risk)
- Age 55-59: Score = +2 points (higher risk)
- Age 60-64: Score = +3 points (significant risk increase)

### Notes
- Ages 45-49 are the baseline reference (0 points)
- Younger ages (below 45) have NEGATIVE scores (protective)
- Older ages (above 49) have POSITIVE scores (risk increasing)
- Total age range impact: -4 to +3 = 7 point spread
- This reflects the strong age-related CVD risk in Framingham

---

## PARAMETER 3: JOB RISK LEVEL (RISIKO PEKERJAAN)

**Field Name:** `job_risk_score`
**Data Source:** `job_titles.risk_level` (from master data)
**Score Range:** 0 to 2 points

### Scoring Table

| Job Risk Level | Score Points |
|----------------|--------------|
| Low | **0** |
| Moderate | **1** |
| High | **2** |

### Scoring Logic
- Low Risk Job: Score = 0 points
- Moderate Risk Job: Score = +1 point
- High Risk Job: Score = +2 points

### Job Category Examples

**Low Risk (0 points):**
- Office Manager
- Secretary/Admin Staff
- Accountant
- HR Personnel
- IT Support
- Customer Service

**Moderate Risk (1 point):**
- Supervisor/Team Lead
- Technician
- Driver (Light duty)
- Operator
- Maintenance Staff
- Sales Representative

**High Risk (2 points):**
- Mining Operations
- Chemical Handler
- Security Guard
- Night Shift Workers
- Construction Worker
- Heavy Equipment Operator
- Hazardous Material Handler

### Notes
- Based on occupational stress and hazard exposure
- Higher job stress increases cardiovascular strain
- Score is assigned per job title in master data
- Same job title = same risk_level for all employees

---

## PARAMETER 4: EXERCISE FREQUENCY (FREKUENSI OLAHRAGA)

**Field Name:** `exercise_score`
**Data Source:** `mcus.exercise_frequency`
**Score Range:** -3 to 2 points

### Scoring Table

| Exercise Frequency | Value in Database | Score Points |
|-------------------|-------------------|--------------|
| >2x Seminggu | >2x_seminggu | **-3** |
| 1-2x Seminggu | 1-2x_seminggu | **0** |
| 1-2x Sebulan | 1-2x_sebulan | **+1** |
| Tidak Pernah | tidak_pernah | **+2** |

### Scoring Logic
- >2x Seminggu (>2x per week): Score = -3 points (very protective)
- 1-2x Seminggu (1-2x per week): Score = 0 points (adequate)
- 1-2x Sebulan (1-2x per month): Score = +1 point (inadequate)
- Tidak Pernah (Never/sedentary): Score = +2 points (high risk)

### Exercise Frequency Details

**>2x Seminggu (More than 2x per week):**
- Exercise at least 3 times per week
- Recommended: 150+ minutes moderate intensity per week
- Examples: Regular jogging, gym, sports, fitness classes
- Score: -3 points

**1-2x Seminggu (1-2 times per week):**
- Exercise once or twice weekly
- Examples: Weekly gym sessions, occasional sports
- Adequate but not optimal exercise
- Score: 0 points (baseline)

**1-2x Sebulan (1-2 times per month):**
- Very low frequency of exercise
- Examples: Occasional walk, rare sports participation
- Insufficient for cardiovascular health
- Score: +1 point

**Tidak Pernah (Never/No regular exercise):**
- Sedentary lifestyle
- No regular physical activity
- No sports or gym participation
- Score: +2 points

### Notes
- Exercise is PROTECTIVE factor (negative scores for higher frequency)
- Score range: -3 to +2 = 5 point spread
- Baseline reference is 1-2x per week (0 points)
- This reflects strong cardiovascular benefits of regular exercise

---

## PARAMETER 5: SMOKING STATUS (STATUS MEROKOK)

**Field Name:** `smoking_score`
**Data Source:** `mcus.smoking_status`
**Score Range:** 0 to 4 points

### Scoring Table

| Smoking Status | Value in Database | Score Points |
|----------------|-------------------|--------------|
| Tidak Merokok (Non-smoker) | tidak_merokok | **0** |
| Mantan Perokok (Former smoker) | mantan_perokok | **+3** |
| Perokok (Current smoker) | perokok | **+4** |

### Scoring Logic
- Tidak Merokok (Never smoked): Score = 0 points (lowest risk)
- Mantan Perokok (Quit smoking): Score = +3 points (residual risk)
- Perokok (Currently smoking): Score = +4 points (highest risk)

### Smoking Status Details

**Tidak Merokok (Non-smoker) - 0 points:**
- Never smoked in life
- No current smoking
- No passive smoke exposure from spouse/family
- Baseline reference category
- Lowest cardiovascular risk from smoking factor

**Mantan Perokok (Former smoker) - +3 points:**
- Previously smoked but quit
- Can be: quit recently (< 1 year) or long ago (> 10 years)
- Risk remains elevated but declining over time
- After 10+ years of quitting: risk approaches non-smoker level
- +3 points reflects residual elevated risk

**Perokok (Current smoker) - +4 points:**
- Actively smoking
- Any frequency (daily, occasional, social)
- Highest single risk factor score (tied with BP worst case)
- Smoking damages blood vessels, increases clotting, raises BP and cholesterol
- Score reflects acute and chronic CVD risk

### Notes
- Smoking score is HIGHEST among most impactful individual factors
- Score range: 0 to 4 = 4 point spread (2nd highest after blood pressure)
- Current smoking is SINGLE HIGHEST RISK among lifestyle factors
- Former smoking still carries +3 points for residual risk
- This reflects established epidemiological evidence from Framingham study

---

## PARAMETER 6: BLOOD PRESSURE (TEKANAN DARAH)

**Field Name:** `tekanan_darah_score`
**Data Source:** `mcus.blood_pressure` (format: "SBP/DBP")
**Measurement Unit:** mmHg (millimeters of mercury)
**Score Range:** 0 to 4 points

### Scoring Table

| Systolic/Diastolic (mmHg) | Category | Score Points |
|---------------------------|----------|--------------|
| < 130 / < 85 | Normal | **0** |
| 130-139 / 85-89 | Elevated/Stage 1 | **+1** |
| 140-159 / 90-99 | Stage 2 | **+2** |
| 160-179 / 100-109 | Stage 3 | **+3** |
| ≥ 180 / ≥ 110 | Hypertensive Crisis | **+4** |

### Scoring Logic

**< 130 / < 85 mmHg - Normal (0 points):**
- Both SBP < 130 AND DBP < 85
- Optimal blood pressure
- Baseline reference category
- Lowest CVD risk from BP perspective

**130-139 / 85-89 mmHg - Elevated (1 point):**
- SBP 130-139 OR DBP 85-89
- Borderline high blood pressure
- Indicates need for lifestyle modifications
- Early stage of hypertension development

**140-159 / 90-99 mmHg - Stage 2 (2 points):**
- SBP 140-159 OR DBP 90-99
- Significant hypertension
- Increased risk of cardiovascular events
- May require pharmacological intervention

**160-179 / 100-109 mmHg - Stage 3 (3 points):**
- SBP 160-179 OR DBP 100-109
- Severe hypertension
- Elevated risk of stroke, MI, kidney damage
- Usually requires medication

**≥ 180 / ≥ 110 mmHg - Hypertensive Crisis (4 points):**
- SBP ≥ 180 OR DBP ≥ 110
- Medical emergency
- Highest score for BP category
- Immediate intervention needed

### Blood Pressure Interpretation

**SBP (Systolic Blood Pressure):**
- Pressure when heart contracts
- Top number in BP reading
- More predictive of CVD risk in older adults
- Primary determinant of score if both values borderline

**DBP (Diastolic Blood Pressure):**
- Pressure when heart relaxes
- Bottom number in BP reading
- More predictive of CVD risk in younger adults
- Less critical than SBP but still important

**Determining BP Score:**
- If EITHER SBP or DBP falls into a category, use that score
- Example: 145/80 → Category "140-159/90-99" → Score +2
- Example: 135/92 → Category "130-139/85-89" (DBP) + "140-159/90-99" (SBP) → Use higher category → Score +2

### Notes
- Blood pressure is ONE OF TWO highest-impact individual factors (score range 0-4)
- Uses both systolic and diastolic measurements
- Hypertension is known as "silent killer" - often asymptomatic
- Score reflects direct relationship between BP and cardiovascular damage

---

## PARAMETER 7: BMI (BODY MASS INDEX)

**Field Name:** `bmi_score`
**Data Source:** `mcus.bmi` (pre-calculated: weight_kg / (height_m)²)
**Measurement Unit:** kg/m²
**Score Range:** 0 to 2 points

### Scoring Table

| BMI Range (kg/m²) | Category | Score Points |
|-------------------|----------|--------------|
| 13.79 - 25.99 | Normal Weight | **0** |
| 26.00 - 29.99 | Overweight | **+1** |
| ≥ 30.00 | Obese | **+2** |

### Scoring Logic

**13.79 - 25.99 kg/m² - Normal Weight (0 points):**
- Healthy weight range
- Baseline reference category
- Lower risk of weight-related CVD
- Weight consistent with good health outcomes

**26.00 - 29.99 kg/m² - Overweight (1 point):**
- Above normal but below obese
- Early weight gain
- Increased metabolic risk factors
- Mild increase in CVD risk
- May show early signs of insulin resistance

**≥ 30.00 kg/m² - Obese (2 points):**
- Significant excess weight
- Multiple metabolic complications
- Substantially increased CVD risk
- Often associated with metabolic syndrome
- May involve comorbidities (diabetes, hypertension)

### BMI Calculation Example

**Example: Male, 70 kg, 1.75 m tall**
```
BMI = weight_kg / (height_m)²
BMI = 70 / (1.75 × 1.75)
BMI = 70 / 3.0625
BMI = 22.86 kg/m²
Category: Normal Weight (13.79-25.99)
Score: 0 points
```

### BMI Categories Detail

**Underweight (< 13.79 kg/m²):**
- Note: Not in our scoring table (assumed out of working population)
- Associated with malnutrition risk

**Normal Weight (13.79 - 25.99 kg/m²):**
- WHO standard healthy range
- Score 0 points
- Baseline reference

**Overweight (26.00 - 29.99 kg/m²):**
- 1 kg/m² into overweight = +1 point
- Example: BMI 26 to 29.99 all scored as +1
- Score +1 point

**Obese Class I (30.00 - 34.99 kg/m²):**
- BMI ≥ 30.00
- Grouped under "Obese" in scoring
- Score +2 points

**Obese Class II (35.00 - 39.99 kg/m²):**
- Severe obesity
- Still grouped under "Obese" in scoring
- Score +2 points

**Obese Class III (≥ 40.00 kg/m²):**
- Extreme obesity
- Still grouped under "Obese" in scoring
- Score +2 points

### Notes
- BMI scoring is simpler than age (3 categories vs 7)
- Score range: 0 to 2 = 2 point spread
- Obesity strongly associated with metabolic syndrome
- Weight loss of 5-10% can significantly reduce CVD risk

---

## PARAMETER 8: FASTING GLUCOSE (GULA DARAH PUASA - GDP)

**Field Name:** `gdp_score`
**Data Source:** `pemeriksaan_lab` where `lab_item_id = 7`
**Measurement Unit:** mg/dL
**Score Range:** 0 to 2 points

### Scoring Table

| Fasting Glucose (mg/dL) | Category | Score Points |
|-------------------------|----------|--------------|
| ≤ 126 | Normal/Controlled | **0** |
| ≥ 127 | Elevated/Diabetic | **+2** |

### Scoring Logic

**≤ 126 mg/dL - Normal/Controlled Glucose (0 points):**
- Fasting glucose within normal range
- Baseline reference category
- No diabetes diagnosis (typically)
- Good glucose metabolism
- Insulin sensitivity preserved

**≥ 127 mg/dL - Elevated/Diabetic Glucose (2 points):**
- Elevated fasting glucose
- Meets diabetes diagnosis threshold (ADA standard)
- Impaired glucose metabolism
- Associated with increased CVD risk
- May have prediabetes (100-126) or diabetes (≥126)

### Glucose Metabolism Context

**Glucose Range Classifications:**

**Normal (< 100 mg/dL):**
- Optimal fasting glucose
- Good insulin sensitivity
- Low diabetes risk
- Score: 0 points

**Impaired Fasting Glucose / Prediabetes (100-126 mg/dL):**
- Borderline high glucose
- Insulin resistance developing
- Increased diabetes risk
- Score: 0 points (still ≤ 126)

**Diabetes (≥ 127 mg/dL):**
- Diagnostic level for diabetes
- Significant insulin dysfunction
- High CVD risk
- Score: +2 points

### Glucose and CVD Risk

**Why is Glucose Important for CVD?**
- High glucose damages blood vessel lining (endothelial dysfunction)
- Promotes atherosclerosis development
- Increases blood clotting tendency
- Raises inflammation markers
- Diabetes is major CVD risk factor (2-4x risk increase)

### Notes
- Glucose scoring is BINARY: either 0 or +2 (no intermediate)
- Score jump of +2 reflects significant risk increase
- Uses strict cutoff at 126 mg/dL (WHO/ADA standard)
- Fasting state important: measurement should be ≥8 hours fasting
- Prediabetes (100-125) still scores 0 but indicates warning

---

## PARAMETER 9: TOTAL CHOLESTEROL (KOLESTEROL TOTAL)

**Field Name:** `kolesterol_score`
**Data Source:** `pemeriksaan_lab` where `lab_item_id = 8`
**Measurement Unit:** mg/dL
**Score Range:** 0 to 3 points

### Scoring Table

| Total Cholesterol (mg/dL) | Category | Score Points |
|---------------------------|----------|--------------|
| < 200 | Desirable | **0** |
| 200 - 239 | Borderline High | **+1** |
| 240 - 279 | High | **+2** |
| ≥ 280 | Very High | **+3** |

### Scoring Logic

**< 200 mg/dL - Desirable (0 points):**
- Total cholesterol below 200 mg/dL
- Optimal cholesterol level
- Baseline reference category
- Lowest CVD risk from cholesterol perspective
- Desirable for all adults

**200 - 239 mg/dL - Borderline High (1 point):**
- Total cholesterol 200-239 mg/dL
- Above optimal but not high
- Warrants lifestyle modifications
- May need closer monitoring
- Score: +1 point

**240 - 279 mg/dL - High (2 points):**
- Total cholesterol 240-279 mg/dL
- Significantly elevated
- Substantial CVD risk increase
- Usually requires dietary intervention
- May need medication consideration
- Score: +2 points

**≥ 280 mg/dL - Very High (3 points):**
- Total cholesterol ≥ 280 mg/dL
- Very elevated cholesterol
- Indicates strong genetic component or poor diet
- Highest score in cholesterol category
- Usually requires pharmacotherapy
- Score: +3 points

### Total Cholesterol Context

**Cholesterol and CVD Risk:**
- Each 1% increase in cholesterol → ~2% increase in CVD risk
- Total cholesterol 240 has approximately 2x CVD risk vs 160
- Primary mechanism: promotes atherosclerotic plaque formation
- Cholesterol accumulates in artery walls over time

**Lipid Profile Components:**
- Total Cholesterol = LDL + HDL + (Triglycerides/5)
- Parameter 9 measures TOTAL (not broken down)
- Parameters 10 & 11 measure HDL and triglycerides separately
- Better assessment: look at all three together

### Cholesterol Guidelines

**ATP III Guidelines:**

**Desirable (< 200 mg/dL):**
- Optimal cholesterol level
- Lower risk of CVD

**Borderline High (200-239 mg/dL):**
- Requires lifestyle changes
- Re-check every 5 years
- Reduce saturated fat intake

**High (≥ 240 mg/dL):**
- At higher risk
- Requires intensive management
- Usually medical intervention needed

### Notes
- Cholesterol score range: 0 to 3 = 3 point spread
- Uses standard ATP III cutoff values (200 mg/dL desirable)
- Total cholesterol is simpler measure (no lipid panel required)
- More precise assessment uses LDL/HDL ratio instead

---

## PARAMETER 10: TRIGLYCERIDES (TRIGLISERIDA)

**Field Name:** `trigliserida_score`
**Data Source:** `pemeriksaan_lab` where `lab_item_id = 9`
**Measurement Unit:** mg/dL
**Score Range:** 0 to 2 points

### Scoring Table

| Triglycerides (mg/dL) | Category | Score Points |
|------------------------|----------|--------------|
| < 200 | Normal | **0** |
| 200 - 299 | Borderline High | **+1** |
| ≥ 300 | High/Very High | **+2** |

### Scoring Logic

**< 200 mg/dL - Normal (0 points):**
- Triglycerides below 200 mg/dL
- Optimal/normal range
- Baseline reference category
- Lowest CVD risk from triglyceride perspective
- Indicates good lipid metabolism

**200 - 299 mg/dL - Borderline High (1 point):**
- Triglycerides 200-299 mg/dL
- Above normal but not severely high
- Increased risk warranting attention
- Often associated with metabolic syndrome
- Lifestyle modifications recommended
- Score: +1 point

**≥ 300 mg/dL - High/Very High (2 points):**
- Triglycerides ≥ 300 mg/dL
- Significantly elevated
- Highest score in triglyceride category
- Strong indicator of metabolic dysfunction
- Usually requires pharmacotherapy
- High risk of pancreatitis at very high levels (> 500)
- Score: +2 points

### Triglycerides Context

**What are Triglycerides?**
- Most abundant form of fat in blood
- Come from food (especially carbs, alcohol, sugar)
- Excess energy stored as triglycerides
- Higher fasting levels indicate metabolic dysfunction

**Why High Triglycerides = CVD Risk:**
- Create small dense LDL particles (atherogenic)
- Associated with low HDL cholesterol
- Indicate metabolic syndrome when elevated
- Promote atherosclerosis through inflammation
- Correlate with abdominal obesity
- Often seen with prediabetes/diabetes

**Triglyceride Sources:**
- Refined carbohydrates (bread, pasta, sugar)
- Alcohol (major contributor to elevated TG)
- Excess sugar intake
- Saturated fats
- Obesity and weight gain

### Metabolic Syndrome Connection

**When Triglycerides Elevated, Often Also See:**
- Low HDL cholesterol (protective factor)
- High blood pressure
- High fasting glucose
- Abdominal obesity
- This cluster = metabolic syndrome
- 5+ year CVD risk substantially increased

### Notes
- Triglyceride score range: 0 to 2 = 2 point spread
- Fasting state critical: TG measured after 9-12 hour fast
- Non-fasting TG can be 200+ mg/dL higher
- Strong modifiable factor (diet, weight loss, exercise)
- Alcohol reduction can dramatically lower TG

---

## PARAMETER 11: HDL CHOLESTEROL (KOLESTEROL HDL)

**Field Name:** `hdl_score`
**Data Source:** `pemeriksaan_lab` where `lab_item_id = 10`
**Measurement Unit:** mg/dL
**Score Range:** 0 to 2 points

### Scoring Table

| HDL Cholesterol (mg/dL) | Category | Score Points |
|--------------------------|----------|--------------|
| > 44 | Protective | **0** |
| 35 - 44 | Low | **+1** |
| < 35 | Very Low | **+2** |

### Scoring Logic

**> 44 mg/dL - Protective (0 points):**
- HDL cholesterol above 44 mg/dL
- Baseline reference category
- Good protective factor
- Lower CVD risk from HDL perspective
- Reflects good cardiovascular health

**35 - 44 mg/dL - Low (1 point):**
- HDL cholesterol 35-44 mg/dL
- Below ideal protective level
- Increased CVD risk
- Warrants lifestyle interventions
- Often seen with metabolic syndrome
- Score: +1 point

**< 35 mg/dL - Very Low (2 points):**
- HDL cholesterol below 35 mg/dL
- Severely low protective factor
- Highest score in HDL category
- Strong independent CVD risk factor
- Major concern requiring intervention
- Often seen with metabolic syndrome, diabetes
- Score: +2 points

### HDL Cholesterol - PROTECTIVE Factor

**Key Concept: INVERSE Relationship**
- UNLIKE other parameters, HDL is "backward"
- Higher HDL = LOWER risk = LOWER score
- Lower HDL = HIGHER risk = HIGHER score
- This reflects biology: HDL removes cholesterol from arteries

**Why is HDL Protective?**
- Removes cholesterol from blood vessel walls
- Transports cholesterol to liver for disposal
- Reduces inflammation in arteries
- Prevents/reverses atherosclerosis
- Often called "good cholesterol"

### HDL Interpretation

**HDL > 60 mg/dL:**
- Considered protective factor
- Actually reduces overall CVD risk
- In some scoring systems = negative points
- In our system: still scored as 0 (baseline)

**HDL 45-60 mg/dL:**
- Good level
- Protective against CVD
- Score: 0 points (our cutoff is >44)

**HDL 35-44 mg/dL:**
- Low HDL
- Reduced protection
- Associated with higher CVD risk
- Risk not adequately offset by other factors
- Score: +1 point

**HDL < 35 mg/dL:**
- Very low HDL
- Severe lack of protection
- Independent major CVD risk factor
- Often sign of metabolic dysfunction
- Highest risk in this parameter
- Score: +2 points

### How to Raise HDL

**Exercise:**
- 30 minutes moderate activity 5x/week
- Can increase HDL by 3-9 mg/dL

**Weight Loss:**
- 5-10% weight loss increases HDL
- Often 2-3 mg/dL per 10 lbs lost

**Moderate Alcohol:**
- 1 drink/day for women, 1-2 for men
- Can increase HDL by 10-15%
- But must balance with other health effects

**Diet:**
- Omega-3 fatty acids (fish oil)
- Reduce refined carbohydrates
- Increase fiber
- Avoid trans fats

### Notes
- HDL is ONLY parameter with inverse relationship
- Score range: 0 to 2 = 2 point spread
- Often low in sedentary, obese, diabetic populations
- More predictive than total cholesterol in some studies
- Gender differences: women typically have higher HDL

---

## TOTAL SCORE CALCULATION

### Score Components Summary

```
Total Score =
  jenis_kelamin_score       (0 to 1)
  + umur_score              (-4 to 3)
  + job_risk_score          (0 to 2)
  + exercise_score          (-3 to 2)
  + smoking_score           (0 to 4)
  + tekanan_darah_score     (0 to 4)
  + bmi_score               (0 to 2)
  + gdp_score               (0 to 2)
  + kolesterol_score        (0 to 3)
  + trigliserida_score      (0 to 2)
  + hdl_score               (0 to 2)
```

### Score Range

**Theoretical Minimum Score:** -4 (Young female, very active, excellent health)
- Age 25-34: -4
- Gender female: 0
- Exercise >2x/week: -3
- All other factors at minimum
- Total: -4 + 0 + 0 + (-3) + 0 + 0 + 0 + 0 + 0 + 0 + 0 = **-7** (Actually lower!)

**Theoretical Maximum Score:** 26
- Gender male: 1
- Age 60-64: 3
- Job risk high: 2
- Exercise never: 2
- Smoking current: 4
- BP crisis: 4
- BMI obese: 2
- Glucose high: 2
- Cholesterol very high: 3
- Triglycerides high: 2
- HDL very low: 2
- Total: 1 + 3 + 2 + 2 + 4 + 4 + 2 + 2 + 3 + 2 + 2 = **27** (Actually higher!)

### Risk Category Classification

| Total Score | Risk Category | 10-Year CVD Risk | Status |
|---|---|---|---|
| **0 - 4** | LOW | < 5% | ✅ Optimal |
| **5 - 11** | MEDIUM | 5-20% | ⚠️ At Risk |
| **12 - 26+** | HIGH | > 20% | 🔴 Critical |

### Risk Category Details

**LOW RISK (Score 0-4):**
- Estimated 10-year CVD risk: less than 5%
- Typical profile: Young, good health habits, normal labs
- Recommendation: Annual check-up, maintain lifestyle
- No medication typically needed for CVD prevention

**MEDIUM RISK (Score 5-11):**
- Estimated 10-year CVD risk: 5-20%
- Typical profile: Some risk factors present (age, overweight, borderline BP)
- Recommendation: Semi-annual check-up, lifestyle modifications
- May consider medication if specific risk factors high

**HIGH RISK (Score 12+):**
- Estimated 10-year CVD risk: greater than 20%
- Typical profile: Multiple risk factors (smoking, high BP, diabetes, obesity)
- Recommendation: Quarterly monitoring, specialist referral
- Medication usually indicated for risk reduction

---

## CALCULATION EXAMPLES

### Example 1: Young Active Female

**Profile:**
- Age: 28 years old
- Gender: Female (Wanita)
- Job: Secretary (Low risk)
- Exercise: >2x Seminggu
- Smoking: Non-smoker
- BP: 118/76 mmHg
- BMI: 22 kg/m²
- Glucose: 95 mg/dL
- Cholesterol: 175 mg/dL
- Triglycerides: 120 mg/dL
- HDL: 52 mg/dL

**Score Calculation:**
- jenis_kelamin_score: 0
- umur_score: -4 (age 25-34)
- job_risk_score: 0 (low)
- exercise_score: -3 (>2x/week)
- smoking_score: 0 (non-smoker)
- tekanan_darah_score: 0 (normal)
- bmi_score: 0 (normal)
- gdp_score: 0 (≤126)
- kolesterol_score: 0 (<200)
- trigliserida_score: 0 (<200)
- hdl_score: 0 (>44)

**TOTAL SCORE = 0 + (-4) + 0 + (-3) + 0 + 0 + 0 + 0 + 0 + 0 + 0 = -7**

**Risk Category: LOW** (<5% 10-year CVD risk)

---

### Example 2: Middle-Aged Male with Risk Factors

**Profile:**
- Age: 52 years old
- Gender: Male (Pria)
- Job: Miner (High risk)
- Exercise: Tidak Pernah
- Smoking: Perokok (Current)
- BP: 155/98 mmHg
- BMI: 29 kg/m²
- Glucose: 135 mg/dL
- Cholesterol: 245 mg/dL
- Triglycerides: 210 mg/dL
- HDL: 38 mg/dL

**Score Calculation:**
- jenis_kelamin_score: 1 (male)
- umur_score: 1 (age 50-54)
- job_risk_score: 2 (high)
- exercise_score: 2 (never)
- smoking_score: 4 (current smoker)
- tekanan_darah_score: 2 (140-159/90-99)
- bmi_score: 1 (overweight 26-29.99)
- gdp_score: 2 (≥127)
- kolesterol_score: 2 (240-279)
- trigliserida_score: 1 (200-299)
- hdl_score: 1 (35-44)

**TOTAL SCORE = 1 + 1 + 2 + 2 + 4 + 2 + 1 + 2 + 2 + 1 + 1 = 19**

**Risk Category: HIGH** (>20% 10-year CVD risk)

**Recommendations:**
- Quarterly CVD monitoring
- QUIT SMOKING (most impactful)
- Cardiology referral
- Antihypertensive medication (likely)
- Lipid-lowering medication (likely)
- Weight loss program
- Stress management
- Occupational health assessment

---

### Example 3: Older Female with Good Control

**Profile:**
- Age: 58 years old
- Gender: Female (Wanita)
- Job: Manager (Low risk)
- Exercise: 1-2x Seminggu
- Smoking: Mantan Perokok (quit 5 years ago)
- BP: 138/86 mmHg
- BMI: 26.5 kg/m²
- Glucose: 108 mg/dL
- Cholesterol: 210 mg/dL
- Triglycerides: 150 mg/dL
- HDL: 46 mg/dL

**Score Calculation:**
- jenis_kelamin_score: 0 (female)
- umur_score: 2 (age 55-59)
- job_risk_score: 0 (low)
- exercise_score: 0 (1-2x/week)
- smoking_score: 3 (former)
- tekanan_darah_score: 1 (130-139/85-89)
- bmi_score: 1 (overweight 26-29.99)
- gdp_score: 0 (≤126)
- kolesterol_score: 1 (200-239)
- trigliserida_score: 0 (<200)
- hdl_score: 0 (>44)

**TOTAL SCORE = 0 + 2 + 0 + 0 + 3 + 1 + 1 + 0 + 1 + 0 + 0 = 8**

**Risk Category: MEDIUM** (5-20% 10-year CVD risk)

**Recommendations:**
- Semi-annual CVD monitoring
- Lifestyle modifications (weight loss, more exercise)
- Consider blood pressure medication
- Monitor cholesterol trend
- Continue not smoking
- Dietary counseling (reduce sodium, increase fruits/vegetables)

---

## SCORING SUMMARY TABLE

| Parameter | Min Score | Max Score | Spread | Key Threshold |
|-----------|-----------|-----------|--------|--------------|
| Gender | 0 | 1 | 1 | Female=0, Male=1 |
| Age | -4 | 3 | 7 | 45-49 baseline=0 |
| Job Risk | 0 | 2 | 2 | High=+2 |
| Exercise | -3 | 2 | 5 | Baseline=0 |
| Smoking | 0 | 4 | 4 | Current=+4 |
| Blood Pressure | 0 | 4 | 4 | <130/<85=0 |
| BMI | 0 | 2 | 2 | <26=0 |
| Glucose | 0 | 2 | 2 | ≤126=0, ≥127=+2 |
| Cholesterol | 0 | 3 | 3 | <200=0 |
| Triglycerides | 0 | 2 | 2 | <200=0 |
| HDL | 0 | 2 | 2 | >44=0 (inverse) |
| **TOTAL** | **~-7** | **~27** | **~34** | **5-11=MEDIUM** |

---

## IMPLEMENTATION NOTES FOR DEVELOPERS

### Score Calculation Algorithm

```
function calculateFraminghamScore(employee, mcu, labResults) {
  let totalScore = 0;

  // 1. Gender
  const genderScore = employee.gender === 'pria' ? 1 : 0;
  totalScore += genderScore;

  // 2. Age
  const ageAtMCU = mcu.ageAtMCU;
  let ageScore = 0;
  if (ageAtMCU >= 25 && ageAtMCU <= 34) ageScore = -4;
  else if (ageAtMCU >= 35 && ageAtMCU <= 39) ageScore = -3;
  else if (ageAtMCU >= 40 && ageAtMCU <= 44) ageScore = -2;
  else if (ageAtMCU >= 45 && ageAtMCU <= 49) ageScore = 0;
  else if (ageAtMCU >= 50 && ageAtMCU <= 54) ageScore = 1;
  else if (ageAtMCU >= 55 && ageAtMCU <= 59) ageScore = 2;
  else if (ageAtMCU >= 60 && ageAtMCU <= 64) ageScore = 3;
  totalScore += ageScore;

  // 3. Job Risk
  const jobRiskScore = jobTitle.risk_level === 'low' ? 0 :
                       jobTitle.risk_level === 'moderate' ? 1 : 2;
  totalScore += jobRiskScore;

  // ... continue for remaining 8 parameters

  return {
    totalScore: totalScore,
    riskCategory: getRiskCategory(totalScore),
    scores: { genderScore, ageScore, jobRiskScore, ... }
  };
}

function getRiskCategory(score) {
  if (score <= 4) return 'low';
  if (score <= 11) return 'medium';
  return 'high';
}
```

### Data Validation Rules

- Age must be 18-100 years old
- Blood pressure: SBP 60-250, DBP 40-150 mmHg
- BMI: 10-60 kg/m²
- All lab values must be positive numbers
- Exercise frequency must be one of 4 valid options
- Smoking status must be one of 3 valid options

