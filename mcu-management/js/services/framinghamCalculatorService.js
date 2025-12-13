/**
 * RAHMA - Risk Assessment Health Management Analytics
 * Framingham Cardiovascular Disease Risk Score Calculator Service
 *
 * This service implements all 11-parameter Framingham CVD risk assessment scoring logic
 * as documented in FRAMINGHAM_SCORING_DETAIL.md
 *
 * 11 Parameters:
 * 1. Gender (Jenis Kelamin) - Range: 0-1
 * 2. Age (Umur) - Range: -4 to 3
 * 3. Job Risk Level - Range: 0-2
 * 4. Exercise Frequency (Olahraga) - Range: -3 to 2
 * 5. Smoking Status (Merokok) - Range: 0-4
 * 6. Blood Pressure (Tekanan Darah) - Range: 0-4
 * 7. BMI (Body Mass Index) - Range: 0-2
 * 8. Fasting Glucose (GDP - Gula Darah Puasa) - Range: 0-2
 * 9. Total Cholesterol (Kolesterol) - Range: 0-3
 * 10. Triglycerides (Trigliserid) - Range: 0-2
 * 11. HDL Cholesterol - Range: 0-2
 *
 * Total Score Range: -4 to 26
 * Risk Categories: LOW (0-4), MEDIUM (5-11), HIGH (12-26+)
 */

class FraminghamCalculatorService {
  /**
   * ============================================
   * PARAMETER 1: GENDER (Jenis Kelamin)
   * ============================================
   * Range: 0-1
   * Wanita (Female) = 0
   * Pria (Male) = 1
   */
  calculateGenderScore(gender) {
    const normalizedGender = String(gender).toLowerCase().trim();

    if (normalizedGender === 'wanita' || normalizedGender === 'female' || normalizedGender === 'f') {
      return 0;
    } else if (normalizedGender === 'pria' || normalizedGender === 'male' || normalizedGender === 'm') {
      return 1;
    }

    // Default: return 0 if unknown
    return 0;
  }

  /**
   * ============================================
   * PARAMETER 2: AGE (Umur)
   * ============================================
   * Range: -4 to 3
   * Age 25-34: -4
   * Age 35-39: -3
   * Age 40-44: -2
   * Age 45-49: 0
   * Age 50-54: 1
   * Age 55-59: 2
   * Age 60-64: 3
   */
  calculateAgeScore(age) {
    const numAge = parseInt(age, 10);

    if (isNaN(numAge) || numAge < 0) {
      return 0; // Default baseline
    }

    if (numAge >= 25 && numAge <= 34) return -4;
    if (numAge >= 35 && numAge <= 39) return -3;
    if (numAge >= 40 && numAge <= 44) return -2;
    if (numAge >= 45 && numAge <= 49) return 0;
    if (numAge >= 50 && numAge <= 54) return 1;
    if (numAge >= 55 && numAge <= 59) return 2;
    if (numAge >= 60 && numAge <= 64) return 3;

    // For ages > 64, extrapolate at +1 per 5 years
    if (numAge > 64) {
      return 3 + Math.floor((numAge - 60) / 5);
    }

    // For ages < 25, extrapolate
    if (numAge < 25) {
      return -4; // Use minimum score
    }

    return 0;
  }

  /**
   * ============================================
   * PARAMETER 3: JOB RISK LEVEL (JOB)
   * ============================================
   * Range: 0-2
   * Low = 0
   * Moderate = 1
   * High = 2
   */
  calculateJobRiskScore(jobRiskLevel) {
    const normalizedLevel = String(jobRiskLevel).toLowerCase().trim();

    if (normalizedLevel === 'low' || normalizedLevel === 'rendah') {
      return 0;
    } else if (normalizedLevel === 'moderate' || normalizedLevel === 'medium' || normalizedLevel === 'sedang') {
      return 1;
    } else if (normalizedLevel === 'high' || normalizedLevel === 'tinggi') {
      return 2;
    }

    // Default to moderate
    return 1;
  }

  /**
   * ============================================
   * PARAMETER 4: EXERCISE FREQUENCY (Olahraga)
   * ============================================
   * Range: -3 to 2
   * PROTECTIVE FACTOR (negative scores are good)
   *
   * >2x Seminggu (>2x/week) = -3
   * 1-2x Seminggu (1-2x/week) = 0
   * 1-2x Sebulan (1-2x/month) = 1
   * Tidak Pernah (Never) = 2
   */
  calculateExerciseScore(exerciseFrequency) {
    const normalized = String(exerciseFrequency).toLowerCase().trim();

    // >2x per week - most protective
    if (normalized === '>2x_seminggu' || normalized === '>2x/week' || normalized === '>2x') {
      return -3;
    }
    // 1-2x per week - baseline
    if (normalized === '1-2x_seminggu' || normalized === '1-2x/week' || normalized === '1-2x') {
      return 0;
    }
    // 1-2x per month - some risk
    if (normalized === '1-2x_sebulan' || normalized === '1-2x/month' || normalized === '1-2x_sebulan') {
      return 1;
    }
    // Never - highest risk
    if (normalized === 'tidak_pernah' || normalized === 'never' || normalized === 'tidak pernah') {
      return 2;
    }

    // Default to baseline
    return 0;
  }

  /**
   * ============================================
   * PARAMETER 5: SMOKING STATUS (Merokok)
   * ============================================
   * Range: 0-4
   * Tidak Merokok (Non-smoker) = 0
   * Mantan Perokok (Former smoker) = 3
   * Perokok (Current smoker) = 4
   */
  calculateSmokingScore(smokingStatus) {
    const normalized = String(smokingStatus).toLowerCase().trim();

    // Non-smoker - no risk from smoking
    if (normalized === 'tidak_merokok' || normalized === 'non-smoker' || normalized === 'tidak merokok') {
      return 0;
    }
    // Former smoker - some residual risk
    if (normalized === 'mantan_perokok' || normalized === 'former' || normalized === 'mantan perokok') {
      return 3;
    }
    // Current smoker - highest smoking risk
    if (normalized === 'perokok' || normalized === 'current' || normalized === 'smoker') {
      return 4;
    }

    // Default to non-smoker
    return 0;
  }

  /**
   * ============================================
   * PARAMETER 6: BLOOD PRESSURE (Tekanan Darah)
   * ============================================
   * Range: 0-4
   * Uses SYSTOLIC/DIASTOLIC (SBP/DBP) in mmHg
   *
   * < 130 / < 85 = 0
   * 130-139 / 85-89 = 1
   * 140-159 / 90-99 = 2
   * 160-179 / 100-109 = 3
   * ≥ 180 / ≥ 110 = 4
   */
  calculateBloodPressureScore(systolic, diastolic) {
    const sbp = parseFloat(systolic);
    const dbp = parseFloat(diastolic);

    if (isNaN(sbp) || isNaN(dbp)) {
      return 0; // Default to normal if data invalid
    }

    // Score is determined by EITHER systolic OR diastolic (whichever gives higher score)
    // This matches standard hypertension stage definitions

    // ≥ 180 / ≥ 110
    if (sbp >= 180 || dbp >= 110) {
      return 4;
    }
    // 160-179 / 100-109
    if (sbp >= 160 || dbp >= 100) {
      return 3;
    }
    // 140-159 / 90-99
    if (sbp >= 140 || dbp >= 90) {
      return 2;
    }
    // 130-139 / 85-89
    if (sbp >= 130 || dbp >= 85) {
      return 1;
    }
    // < 130 / < 85
    return 0;
  }

  /**
   * Parse blood pressure string in format "SBP/DBP" or "SBP DBP"
   * Returns object with systolic and diastolic values
   * Handles multiple formats:
   * - "120/80"
   * - "120 80"
   * - "120/80 mmHg"
   */
  parseBloodPressure(bpString) {
    if (!bpString) {
      return { systolic: null, diastolic: null };
    }

    const bpStr = String(bpString).trim().replace(/[^\d\/\s]/g, ''); // Remove non-numeric except / and space
    const parts = bpStr.split(/[\/\s]+/).filter(p => p.length > 0);

    if (parts.length >= 2) {
      return {
        systolic: parseFloat(parts[0]),
        diastolic: parseFloat(parts[1])
      };
    }

    return { systolic: null, diastolic: null };
  }

  /**
   * ============================================
   * PARAMETER 7: BMI (Body Mass Index)
   * ============================================
   * Range: 0-2
   * 13.79-25.99 (Normal) = 0
   * 26.00-29.99 (Overweight) = 1
   * ≥ 30.00 (Obese) = 2
   */
  calculateBMIScore(bmi) {
    const numBmi = parseFloat(bmi);

    if (isNaN(numBmi) || numBmi <= 0) {
      return 0; // Default to normal if data invalid
    }

    // Obese
    if (numBmi >= 30.0) {
      return 2;
    }
    // Overweight
    if (numBmi >= 26.0 && numBmi < 30.0) {
      return 1;
    }
    // Normal weight
    if (numBmi >= 13.79 && numBmi < 26.0) {
      return 0;
    }

    // BMI < 13.79 (underweight - very rare, use normal)
    return 0;
  }

  /**
   * Calculate BMI from height and weight
   * @param {number} weight - Weight in kg
   * @param {number} height - Height in cm
   * @returns {number} BMI value rounded to 2 decimals
   */
  calculateBMI(weight, height) {
    const w = parseFloat(weight);
    const h = parseFloat(height);

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      return null;
    }

    // Convert height from cm to m
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);

    return parseFloat(bmi.toFixed(2));
  }

  /**
   * ============================================
   * PARAMETER 8: FASTING GLUCOSE (GDP - Gula Darah Puasa)
   * ============================================
   * Range: 0-2
   * BINARY THRESHOLD
   * ≤ 126 mg/dL = 0
   * ≥ 127 mg/dL = 2
   */
  calculateGlucoseScore(glucoseValue) {
    const numGlucose = parseFloat(glucoseValue);

    if (isNaN(numGlucose) || numGlucose <= 0) {
      return 0; // Default to normal
    }

    // High glucose (diabetic range)
    if (numGlucose >= 127) {
      return 2;
    }
    // Normal glucose
    return 0;
  }

  /**
   * ============================================
   * PARAMETER 9: TOTAL CHOLESTEROL (Kolesterol)
   * ============================================
   * Range: 0-3
   * < 200 mg/dL = 0
   * 200-239 mg/dL = 1
   * 240-279 mg/dL = 2
   * ≥ 280 mg/dL = 3
   */
  calculateCholesterolScore(cholesterol) {
    const numChol = parseFloat(cholesterol);

    if (isNaN(numChol) || numChol <= 0) {
      return 0; // Default to normal
    }

    // Very high
    if (numChol >= 280) {
      return 3;
    }
    // High
    if (numChol >= 240) {
      return 2;
    }
    // Borderline high
    if (numChol >= 200) {
      return 1;
    }
    // Desirable
    return 0;
  }

  /**
   * ============================================
   * PARAMETER 10: TRIGLYCERIDES (Trigliserid)
   * ============================================
   * Range: 0-2
   * < 200 mg/dL = 0
   * 200-299 mg/dL = 1
   * ≥ 300 mg/dL = 2
   */
  calculateTriglyceridesScore(triglycerides) {
    const numTrig = parseFloat(triglycerides);

    if (isNaN(numTrig) || numTrig <= 0) {
      return 0; // Default to normal
    }

    // High
    if (numTrig >= 300) {
      return 2;
    }
    // Borderline high
    if (numTrig >= 200) {
      return 1;
    }
    // Normal
    return 0;
  }

  /**
   * ============================================
   * PARAMETER 11: HDL CHOLESTEROL (HDL Kolesterol)
   * ============================================
   * Range: 0-2
   * INVERSE/PROTECTIVE FACTOR
   * Higher HDL = LOWER score (protective)
   *
   * > 44 mg/dL = 0 (protective)
   * 35-44 mg/dL = 1
   * < 35 mg/dL = 2 (very low risk factor)
   */
  calculateHDLScore(hdl) {
    const numHdl = parseFloat(hdl);

    if (isNaN(numHdl) || numHdl <= 0) {
      return 1; // Default to moderate level if data invalid
    }

    // Good HDL level (protective)
    if (numHdl > 44) {
      return 0;
    }
    // Moderate HDL level
    if (numHdl >= 35) {
      return 1;
    }
    // Low HDL level (risk factor)
    return 2;
  }

  /**
   * ============================================
   * COMPOSITE CALCULATION
   * ============================================
   */

  /**
   * Calculate total Framingham score from all 11 parameters
   * @param {object} assessmentData - Object containing all assessment values
   * @returns {object} Object with individual scores and total score
   */
  calculateTotalScore(assessmentData) {
    // Calculate individual scores
    const jenis_kelamin_score = this.calculateGenderScore(assessmentData.gender);
    const umur_score = this.calculateAgeScore(assessmentData.age);
    const job_risk_score = this.calculateJobRiskScore(assessmentData.jobRiskLevel);
    const exercise_score = this.calculateExerciseScore(assessmentData.exerciseFrequency);
    const smoking_score = this.calculateSmokingScore(assessmentData.smokingStatus);

    // Blood pressure - parse if it's a string
    let systolic = assessmentData.systolic;
    let diastolic = assessmentData.diastolic;
    if (assessmentData.bloodPressure && !systolic) {
      const parsed = this.parseBloodPressure(assessmentData.bloodPressure);
      systolic = parsed.systolic;
      diastolic = parsed.diastolic;
    }
    const tekanan_darah_score = this.calculateBloodPressureScore(systolic, diastolic);

    const bmi_score = this.calculateBMIScore(assessmentData.bmi);
    const gdp_score = this.calculateGlucoseScore(assessmentData.glucose);
    const kolesterol_score = this.calculateCholesterolScore(assessmentData.cholesterol);
    const trigliserida_score = this.calculateTriglyceridesScore(assessmentData.triglycerides);
    const hdl_score = this.calculateHDLScore(assessmentData.hdl);

    // Calculate total score (sum of all 11 parameters)
    const total_score =
      jenis_kelamin_score +
      umur_score +
      job_risk_score +
      exercise_score +
      smoking_score +
      tekanan_darah_score +
      bmi_score +
      gdp_score +
      kolesterol_score +
      trigliserida_score +
      hdl_score;

    return {
      jenis_kelamin_score,
      umur_score,
      job_risk_score,
      exercise_score,
      smoking_score,
      tekanan_darah_score,
      bmi_score,
      gdp_score,
      kolesterol_score,
      trigliserida_score,
      hdl_score,
      total_score
    };
  }

  /**
   * ============================================
   * RISK CATEGORY CLASSIFICATION
   * ============================================
   * Based on total Framingham score
   */

  /**
   * Determine risk category based on total score
   * @param {number} totalScore - Total Framingham score
   * @returns {object} Object with risk_category and 10-year CVD risk percentage
   */
  getRiskCategory(totalScore) {
    const score = parseInt(totalScore, 10);

    // LOW RISK
    if (score >= 0 && score <= 4) {
      return {
        risk_category: 'low',
        risk_category_id: 1,
        cvd_risk_percentage: '< 5%',
        cvd_risk_percentage_numeric: 5,
        status: '✅ Optimal',
        description: 'Low 10-year cardiovascular disease risk'
      };
    }

    // MEDIUM / MODERATE RISK
    if (score >= 5 && score <= 11) {
      return {
        risk_category: 'medium',
        risk_category_id: 2,
        cvd_risk_percentage: '5-20%',
        cvd_risk_percentage_numeric: 12.5,
        status: '⚠️ At Risk',
        description: 'Moderate 10-year cardiovascular disease risk'
      };
    }

    // HIGH RISK
    if (score >= 12) {
      return {
        risk_category: 'high',
        risk_category_id: 3,
        cvd_risk_percentage: '> 20%',
        cvd_risk_percentage_numeric: 25,
        status: '🔴 Critical',
        description: 'High 10-year cardiovascular disease risk'
      };
    }

    // Negative scores (very low risk - better than optimal) - still classified as LOW
    return {
      risk_category: 'low',
      risk_category_id: 1,
      cvd_risk_percentage: '< 5%',
      cvd_risk_percentage_numeric: 5,
      status: '✅ Optimal',
      description: 'Very low 10-year cardiovascular disease risk'
    };
  }

  /**
   * ============================================
   * COMPLETE ASSESSMENT FUNCTION
   * ============================================
   */

  /**
   * Perform complete Framingham assessment
   * Calculates all 11 scores, total score, and risk category in one call
   * @param {object} assessmentData - All assessment data
   * @returns {object} Complete assessment result
   */
  performCompleteAssessment(assessmentData) {
    // Validate required fields
    if (!assessmentData) {
      throw new Error('Assessment data is required');
    }

    // Calculate all scores
    const scores = this.calculateTotalScore(assessmentData);

    // Determine risk category
    const riskInfo = this.getRiskCategory(scores.total_score);

    // Build complete assessment result
    const assessment = {
      // Individual parameter scores
      jenis_kelamin_score: scores.jenis_kelamin_score,
      umur_score: scores.umur_score,
      job_risk_score: scores.job_risk_score,
      exercise_score: scores.exercise_score,
      smoking_score: scores.smoking_score,
      tekanan_darah_score: scores.tekanan_darah_score,
      bmi_score: scores.bmi_score,
      gdp_score: scores.gdp_score,
      kolesterol_score: scores.kolesterol_score,
      trigliserida_score: scores.trigliserida_score,
      hdl_score: scores.hdl_score,

      // Final results
      total_score: scores.total_score,
      risk_category: riskInfo.risk_category,
      risk_category_id: riskInfo.risk_category_id,
      cvd_risk_percentage: riskInfo.cvd_risk_percentage,
      status: riskInfo.status,
      description: riskInfo.description,

      // Assessment metadata
      assessment_data: {
        // Input values (for audit trail)
        input: {
          gender: assessmentData.gender,
          age: assessmentData.age,
          jobRiskLevel: assessmentData.jobRiskLevel,
          exerciseFrequency: assessmentData.exerciseFrequency,
          smokingStatus: assessmentData.smokingStatus,
          systolic: assessmentData.systolic || (assessmentData.bloodPressure ? this.parseBloodPressure(assessmentData.bloodPressure).systolic : null),
          diastolic: assessmentData.diastolic || (assessmentData.bloodPressure ? this.parseBloodPressure(assessmentData.bloodPressure).diastolic : null),
          bmi: assessmentData.bmi,
          glucose: assessmentData.glucose,
          cholesterol: assessmentData.cholesterol,
          triglycerides: assessmentData.triglycerides,
          hdl: assessmentData.hdl
        },
        // Calculated score components
        scores: {
          jenis_kelamin: scores.jenis_kelamin_score,
          umur: scores.umur_score,
          job_risk: scores.job_risk_score,
          exercise: scores.exercise_score,
          smoking: scores.smoking_score,
          tekanan_darah: scores.tekanan_darah_score,
          bmi: scores.bmi_score,
          gdp: scores.gdp_score,
          kolesterol: scores.kolesterol_score,
          trigliserida: scores.trigliserida_score,
          hdl: scores.hdl_score
        },
        // Risk classification
        risk: {
          total_score: scores.total_score,
          risk_category: riskInfo.risk_category,
          risk_category_id: riskInfo.risk_category_id,
          cvd_risk_percentage: riskInfo.cvd_risk_percentage,
          cvd_risk_percentage_numeric: riskInfo.cvd_risk_percentage_numeric,
          status: riskInfo.status,
          description: riskInfo.description
        }
      }
    };

    return assessment;
  }

  /**
   * ============================================
   * UTILITY FUNCTIONS
   * ============================================
   */

  /**
   * Get human-readable description of a score component
   */
  getScoreDescription(parameterName, score) {
    const descriptions = {
      jenis_kelamin_score: {
        0: 'Female (Wanita) - Baseline protective',
        1: 'Male (Pria) - +1 CVD risk'
      },
      umur_score: {
        '-4': 'Age 25-34 - Protective',
        '-3': 'Age 35-39 - Protective',
        '-2': 'Age 40-44 - Protective',
        '0': 'Age 45-49 - Baseline',
        '1': 'Age 50-54 - Age-related risk',
        '2': 'Age 55-59 - Age-related risk',
        '3': 'Age 60-64 - Age-related risk'
      },
      job_risk_score: {
        0: 'Low occupational risk',
        1: 'Moderate occupational risk',
        2: 'High occupational risk'
      },
      exercise_score: {
        '-3': '>2x per week - Highly protective',
        '0': '1-2x per week - Baseline',
        '1': '1-2x per month - Some risk',
        '2': 'Never - Sedentary risk'
      },
      smoking_score: {
        0: 'Non-smoker - No smoking risk',
        3: 'Former smoker - Residual risk',
        4: 'Current smoker - High risk'
      },
      tekanan_darah_score: {
        0: '< 130/85 - Normal',
        1: '130-139/85-89 - Elevated/Stage 1',
        2: '140-159/90-99 - Stage 2',
        3: '160-179/100-109 - Stage 3',
        4: '≥ 180/110 - Hypertensive crisis'
      },
      bmi_score: {
        0: '13.79-25.99 - Normal weight',
        1: '26.00-29.99 - Overweight',
        2: '≥ 30.00 - Obese'
      },
      gdp_score: {
        0: '≤ 126 mg/dL - Normal glucose',
        2: '≥ 127 mg/dL - High glucose (diabetic)'
      },
      kolesterol_score: {
        0: '< 200 - Desirable',
        1: '200-239 - Borderline high',
        2: '240-279 - High',
        3: '≥ 280 - Very high'
      },
      trigliserida_score: {
        0: '< 200 - Normal',
        1: '200-299 - Borderline high',
        2: '≥ 300 - High'
      },
      hdl_score: {
        0: '> 44 - Protective',
        1: '35-44 - Moderate',
        2: '< 35 - Low (risk factor)'
      }
    };

    if (descriptions[parameterName] && descriptions[parameterName][score]) {
      return descriptions[parameterName][score];
    }

    return 'Score information not available';
  }

  /**
   * Get all parameter names in order
   */
  getParameterNames() {
    return [
      'jenis_kelamin_score',
      'umur_score',
      'job_risk_score',
      'exercise_score',
      'smoking_score',
      'tekanan_darah_score',
      'bmi_score',
      'gdp_score',
      'kolesterol_score',
      'trigliserida_score',
      'hdl_score'
    ];
  }

  /**
   * Get parameter labels in Indonesian
   */
  getParameterLabels() {
    return {
      jenis_kelamin_score: 'Jenis Kelamin (Gender)',
      umur_score: 'Umur (Age)',
      job_risk_score: 'Tingkat Risiko Pekerjaan (Job Risk)',
      exercise_score: 'Frekuensi Olahraga (Exercise)',
      smoking_score: 'Status Merokok (Smoking)',
      tekanan_darah_score: 'Tekanan Darah (Blood Pressure)',
      bmi_score: 'BMI (Body Mass Index)',
      gdp_score: 'Gula Darah Puasa (Fasting Glucose)',
      kolesterol_score: 'Kolesterol Total (Total Cholesterol)',
      trigliserida_score: 'Trigliserida (Triglycerides)',
      hdl_score: 'HDL Kolesterol (HDL Cholesterol)'
    };
  }

  /**
   * Get score ranges for all parameters
   */
  getParameterRanges() {
    return {
      jenis_kelamin_score: { min: 0, max: 1, description: 'Gender (Female=0, Male=1)' },
      umur_score: { min: -4, max: 3, description: 'Age (-4 to +3)' },
      job_risk_score: { min: 0, max: 2, description: 'Job Risk (Low=0, Moderate=1, High=2)' },
      exercise_score: { min: -3, max: 2, description: 'Exercise (>2x/week=-3, 1-2x/week=0, 1-2x/month=1, Never=2)' },
      smoking_score: { min: 0, max: 4, description: 'Smoking (Non=0, Former=3, Current=4)' },
      tekanan_darah_score: { min: 0, max: 4, description: 'Blood Pressure (Normal=0 to Crisis=4)' },
      bmi_score: { min: 0, max: 2, description: 'BMI (Normal=0, Overweight=1, Obese=2)' },
      gdp_score: { min: 0, max: 2, description: 'Glucose (Normal=0, High=2)' },
      kolesterol_score: { min: 0, max: 3, description: 'Cholesterol (Desirable=0 to Very High=3)' },
      trigliserida_score: { min: 0, max: 2, description: 'Triglycerides (Normal=0, High=2)' },
      hdl_score: { min: 0, max: 2, description: 'HDL (Protective=0, Low=2)' }
    };
  }
}

// Export as singleton
export const framinghamCalculatorService = new FraminghamCalculatorService();

export default framinghamCalculatorService;
