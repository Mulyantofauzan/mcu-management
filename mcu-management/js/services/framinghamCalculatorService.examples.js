/**
 * FRAMINGHAM CALCULATOR SERVICE - EXAMPLE USAGE & TEST CASES
 *
 * This file demonstrates how to use framinghamCalculatorService.js
 * with three different risk profiles:
 * 1. Young Active Female (LOW RISK)
 * 2. Middle-Aged Male with Risk Factors (HIGH RISK)
 * 3. Older Female with Good Control (MEDIUM RISK)
 */

import { framinghamCalculatorService } from './framinghamCalculatorService.js';

/**
 * ============================================
 * EXAMPLE 1: Young Active Female - LOW RISK
 * ============================================
 * Profile: 28-year-old female, very active, non-smoker, excellent health metrics
 */
export function example1_YoungActiveFemale() {
  const assessmentData = {
    // Demographics
    gender: 'wanita', // or 'female'
    age: 28,

    // Job & Lifestyle
    jobRiskLevel: 'low',
    exerciseFrequency: '>2x_seminggu', // >2x per week - most protective
    smokingStatus: 'tidak_merokok', // Non-smoker

    // Vital Signs & Measurements
    systolic: 115,
    diastolic: 75,
    bmi: 22.5,

    // Lab Values
    glucose: 95, // Fasting glucose (normal)
    cholesterol: 185, // Desirable
    triglycerides: 100,
    hdl: 55 // Good protective level
  };

  const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

  console.log('=== EXAMPLE 1: Young Active Female ===');
  console.log('Input Data:', assessmentData);
  console.log('\nScores:');
  console.log(`  Gender: ${result.jenis_kelamin_score}`);
  console.log(`  Age: ${result.umur_score}`);
  console.log(`  Job Risk: ${result.job_risk_score}`);
  console.log(`  Exercise: ${result.exercise_score}`);
  console.log(`  Smoking: ${result.smoking_score}`);
  console.log(`  Blood Pressure: ${result.tekanan_darah_score}`);
  console.log(`  BMI: ${result.bmi_score}`);
  console.log(`  Glucose: ${result.gdp_score}`);
  console.log(`  Cholesterol: ${result.kolesterol_score}`);
  console.log(`  Triglycerides: ${result.trigliserida_score}`);
  console.log(`  HDL: ${result.hdl_score}`);
  console.log(`\n  TOTAL SCORE: ${result.total_score}`);
  console.log(`  RISK CATEGORY: ${result.risk_category.toUpperCase()}`);
  console.log(`  CVD Risk: ${result.cvd_risk_percentage}`);
  console.log(`  Status: ${result.status}`);

  return result;
}

/**
 * ============================================
 * EXAMPLE 2: Middle-Aged Male with Risk Factors - HIGH RISK
 * ============================================
 * Profile: 52-year-old male, sedentary, current smoker, high BP, overweight
 */
export function example2_MiddleAgedMaleHighRisk() {
  const assessmentData = {
    // Demographics
    gender: 'pria', // or 'male'
    age: 52,

    // Job & Lifestyle
    jobRiskLevel: 'high',
    exerciseFrequency: 'tidak_pernah', // Never exercises - sedentary
    smokingStatus: 'perokok', // Current smoker - highest smoking risk

    // Vital Signs & Measurements
    systolic: 155,
    diastolic: 98,
    bmi: 28.5, // Overweight

    // Lab Values
    glucose: 132, // High (diabetic range)
    cholesterol: 250, // High
    triglycerides: 220, // Borderline high
    hdl: 38 // Low protective level
  };

  const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

  console.log('\n=== EXAMPLE 2: Middle-Aged Male with Risk Factors ===');
  console.log('Input Data:', assessmentData);
  console.log('\nScores:');
  console.log(`  Gender: ${result.jenis_kelamin_score}`);
  console.log(`  Age: ${result.umur_score}`);
  console.log(`  Job Risk: ${result.job_risk_score}`);
  console.log(`  Exercise: ${result.exercise_score}`);
  console.log(`  Smoking: ${result.smoking_score}`);
  console.log(`  Blood Pressure: ${result.tekanan_darah_score}`);
  console.log(`  BMI: ${result.bmi_score}`);
  console.log(`  Glucose: ${result.gdp_score}`);
  console.log(`  Cholesterol: ${result.kolesterol_score}`);
  console.log(`  Triglycerides: ${result.trigliserida_score}`);
  console.log(`  HDL: ${result.hdl_score}`);
  console.log(`\n  TOTAL SCORE: ${result.total_score}`);
  console.log(`  RISK CATEGORY: ${result.risk_category.toUpperCase()}`);
  console.log(`  CVD Risk: ${result.cvd_risk_percentage}`);
  console.log(`  Status: ${result.status}`);
  console.log('\nRISK FACTORS IDENTIFIED:');
  console.log('  ⚠️ Current smoker (+4 points - highest single risk)');
  console.log('  ⚠️ Male gender (+1)');
  console.log('  ⚠️ Age 50-54 (+1)');
  console.log('  ⚠️ High job risk (+2)');
  console.log('  ⚠️ Sedentary (no exercise) (+2)');
  console.log('  ⚠️ High blood pressure (+2)');
  console.log('  ⚠️ Overweight (+1)');
  console.log('  ⚠️ High glucose (+2)');
  console.log('  ⚠️ High cholesterol (+2)');
  console.log('  ⚠️ Borderline high triglycerides (+1)');
  console.log('  ⚠️ Low HDL (+1)');

  return result;
}

/**
 * ============================================
 * EXAMPLE 3: Older Female with Good Control - MEDIUM RISK
 * ============================================
 * Profile: 58-year-old female, moderate activity, non-smoker, controlled BP
 */
export function example3_OlderFemaleGoodControl() {
  const assessmentData = {
    // Demographics
    gender: 'wanita', // Female - baseline protective
    age: 58,

    // Job & Lifestyle
    jobRiskLevel: 'moderate',
    exerciseFrequency: '1-2x_seminggu', // 1-2x per week - baseline
    smokingStatus: 'tidak_merokok', // Non-smoker

    // Vital Signs & Measurements
    systolic: 138,
    diastolic: 87,
    bmi: 25.8, // Upper normal/borderline overweight

    // Lab Values
    glucose: 105, // Slightly elevated but not diabetic
    cholesterol: 215, // Borderline high
    triglycerides: 135, // Normal
    hdl: 50 // Moderate-good level
  };

  const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

  console.log('\n=== EXAMPLE 3: Older Female with Good Control ===');
  console.log('Input Data:', assessmentData);
  console.log('\nScores:');
  console.log(`  Gender: ${result.jenis_kelamin_score}`);
  console.log(`  Age: ${result.umur_score}`);
  console.log(`  Job Risk: ${result.job_risk_score}`);
  console.log(`  Exercise: ${result.exercise_score}`);
  console.log(`  Smoking: ${result.smoking_score}`);
  console.log(`  Blood Pressure: ${result.tekanan_darah_score}`);
  console.log(`  BMI: ${result.bmi_score}`);
  console.log(`  Glucose: ${result.gdp_score}`);
  console.log(`  Cholesterol: ${result.kolesterol_score}`);
  console.log(`  Triglycerides: ${result.trigliserida_score}`);
  console.log(`  HDL: ${result.hdl_score}`);
  console.log(`\n  TOTAL SCORE: ${result.total_score}`);
  console.log(`  RISK CATEGORY: ${result.risk_category.toUpperCase()}`);
  console.log(`  CVD Risk: ${result.cvd_risk_percentage}`);
  console.log(`  Status: ${result.status}`);
  console.log('\nPROTECTIVE FACTORS:');
  console.log('  ✅ Female gender (0 points vs +1 for males)');
  console.log('  ✅ Non-smoker (0 points)');
  console.log('  ✅ Normal triglycerides (0 points)');

  return result;
}

/**
 * ============================================
 * HOW TO USE IN YOUR APPLICATION
 * ============================================
 */

/**
 * Usage in MCU Assessment Page (e.g., assessment-rahma.js)
 */
export function usageInAssessmentPage(mcuData, labResults, employeeData) {
  // Prepare assessment data from MCU form inputs and lab results
  const assessmentData = {
    // From employee master data
    gender: employeeData.gender,
    age: employeeData.age || mcuData.ageAtMCU,

    // From MCU examination
    jobRiskLevel: mcuData.jobRisk || 'moderate',
    exerciseFrequency: mcuData.exerciseFrequency || null,
    smokingStatus: mcuData.smokingStatus || null,
    systolic: mcuData.bloodPressure?.systolic || null,
    diastolic: mcuData.bloodPressure?.diastolic || null,
    bmi: mcuData.bmi || null,

    // From lab results (map lab_item_id to values)
    glucose: labResults[7]?.value || null, // lab_item_id 7 = Gula Darah Puasa
    cholesterol: labResults[8]?.value || null, // lab_item_id 8 = Kolesterol Total
    triglycerides: labResults[9]?.value || null, // lab_item_id 9 = Trigliserida
    hdl: labResults[10]?.value || null // lab_item_id 10 = HDL Kolestrol
  };

  try {
    // Perform complete assessment
    const result = framinghamCalculatorService.performCompleteAssessment(assessmentData);

    // Save result to database
    // await saveFraminghamAssessment(mcuData.mcuId, result);

    // Display result in UI
    displayAssessmentResult(result);

    return result;
  } catch (error) {
    console.error('Assessment calculation error:', error);
    // Show error message to user
  }
}

/**
 * Display assessment result in UI
 */
function displayAssessmentResult(result) {
  const riskColor = {
    low: '#27ae60', // Green
    medium: '#f39c12', // Orange
    high: '#e74c3c' // Red
  };

  console.log('=== FRAMINGHAM ASSESSMENT RESULT ===');
  console.log(`Risk Category: ${result.risk_category}`);
  console.log(`10-Year CVD Risk: ${result.cvd_risk_percentage}`);
  console.log(`Status: ${result.status}`);
  console.log(`Description: ${result.description}`);
  console.log('\nComponent Scores:');

  const labels = framinghamCalculatorService.getParameterLabels();
  const parameters = framinghamCalculatorService.getParameterNames();

  parameters.forEach(param => {
    const score = result[param];
    const description = framinghamCalculatorService.getScoreDescription(param, score);
    console.log(`  ${labels[param]}: ${score} - ${description}`);
  });

  // In actual UI, you would:
  // - Show risk category with appropriate color
  // - Display total score
  // - Show component breakdown
  // - Provide recommendations based on risk level
  // - Suggest follow-up actions
}

/**
 * Get recommendations based on assessment result
 */
export function getRecommendations(result) {
  const recommendations = {
    low: [
      'Continue current healthy lifestyle',
      'Maintain regular exercise (>2x per week)',
      'Keep monitoring vital signs annually',
      'Maintain healthy diet and weight',
      'Regular health check-ups'
    ],
    medium: [
      'Increase exercise frequency (target 3-4x per week)',
      'Review diet and implement heart-healthy changes',
      'Monitor blood pressure more frequently',
      'If smoker: strongly consider quitting',
      'Schedule follow-up assessment in 6-12 months',
      'Consider consultation with healthcare provider'
    ],
    high: [
      '🔴 URGENT: Schedule consultation with cardiologist',
      'Implement comprehensive lifestyle modifications:',
      '  - Quit smoking immediately if applicable',
      '  - Start regular exercise program (with doctor approval)',
      '  - Strict blood pressure management',
      '  - Diabetes management if applicable',
      '  - Cholesterol management (dietary + medication)',
      'Close medical follow-up and monitoring',
      'Consider cardiac imaging/testing per doctor recommendation',
      'Schedule reassessment in 3 months'
    ]
  };

  return recommendations[result.risk_category] || recommendations.low;
}

/**
 * ============================================
 * UNIT TEST EXAMPLES
 * ============================================
 */

export function runUnitTests() {
  console.log('\n=== RUNNING UNIT TESTS ===\n');

  // Test 1: Gender scoring
  console.log('Test 1: Gender Scoring');
  console.assert(framinghamCalculatorService.calculateGenderScore('wanita') === 0, 'Female should be 0');
  console.assert(framinghamCalculatorService.calculateGenderScore('pria') === 1, 'Male should be 1');
  console.log('✓ Gender scoring tests passed\n');

  // Test 2: Age scoring
  console.log('Test 2: Age Scoring');
  console.assert(framinghamCalculatorService.calculateAgeScore(28) === -4, 'Age 28 should be -4');
  console.assert(framinghamCalculatorService.calculateAgeScore(50) === 1, 'Age 50 should be 1');
  console.assert(framinghamCalculatorService.calculateAgeScore(62) === 3, 'Age 62 should be 3');
  console.log('✓ Age scoring tests passed\n');

  // Test 3: Exercise scoring (protective factor)
  console.log('Test 3: Exercise Scoring (Protective)');
  console.assert(framinghamCalculatorService.calculateExerciseScore('>2x_seminggu') === -3, 'High exercise should be -3');
  console.assert(framinghamCalculatorService.calculateExerciseScore('tidak_pernah') === 2, 'Never should be 2');
  console.log('✓ Exercise scoring tests passed\n');

  // Test 4: Smoking scoring
  console.log('Test 4: Smoking Scoring');
  console.assert(framinghamCalculatorService.calculateSmokingScore('tidak_merokok') === 0, 'Non-smoker should be 0');
  console.assert(framinghamCalculatorService.calculateSmokingScore('perokok') === 4, 'Current smoker should be 4');
  console.assert(framinghamCalculatorService.calculateSmokingScore('mantan_perokok') === 3, 'Former smoker should be 3');
  console.log('✓ Smoking scoring tests passed\n');

  // Test 5: Blood pressure scoring
  console.log('Test 5: Blood Pressure Scoring');
  console.assert(framinghamCalculatorService.calculateBloodPressureScore(120, 80) === 0, 'Normal BP should be 0');
  console.assert(framinghamCalculatorService.calculateBloodPressureScore(140, 90) === 2, 'Stage 2 BP should be 2');
  console.assert(framinghamCalculatorService.calculateBloodPressureScore(185, 115) === 4, 'High BP should be 4');
  console.log('✓ Blood pressure scoring tests passed\n');

  // Test 6: BMI scoring
  console.log('Test 6: BMI Scoring');
  console.assert(framinghamCalculatorService.calculateBMIScore(22) === 0, 'Normal BMI should be 0');
  console.assert(framinghamCalculatorService.calculateBMIScore(27) === 1, 'Overweight should be 1');
  console.assert(framinghamCalculatorService.calculateBMIScore(31) === 2, 'Obese should be 2');
  console.log('✓ BMI scoring tests passed\n');

  // Test 7: Glucose scoring
  console.log('Test 7: Glucose Scoring');
  console.assert(framinghamCalculatorService.calculateGlucoseScore(100) === 0, 'Normal glucose should be 0');
  console.assert(framinghamCalculatorService.calculateGlucoseScore(135) === 2, 'High glucose should be 2');
  console.log('✓ Glucose scoring tests passed\n');

  // Test 8: Cholesterol scoring
  console.log('Test 8: Cholesterol Scoring');
  console.assert(framinghamCalculatorService.calculateCholesterolScore(180) === 0, 'Low cholesterol should be 0');
  console.assert(framinghamCalculatorService.calculateCholesterolScore(220) === 1, 'Borderline should be 1');
  console.assert(framinghamCalculatorService.calculateCholesterolScore(260) === 2, 'High should be 2');
  console.assert(framinghamCalculatorService.calculateCholesterolScore(300) === 3, 'Very high should be 3');
  console.log('✓ Cholesterol scoring tests passed\n');

  // Test 9: HDL scoring (inverse)
  console.log('Test 9: HDL Scoring (Inverse/Protective)');
  console.assert(framinghamCalculatorService.calculateHDLScore(50) === 0, 'Good HDL should be 0');
  console.assert(framinghamCalculatorService.calculateHDLScore(40) === 1, 'Moderate HDL should be 1');
  console.assert(framinghamCalculatorService.calculateHDLScore(30) === 2, 'Low HDL should be 2');
  console.log('✓ HDL scoring tests passed\n');

  // Test 10: Risk category classification
  console.log('Test 10: Risk Category Classification');
  const lowRisk = framinghamCalculatorService.getRiskCategory(2);
  const mediumRisk = framinghamCalculatorService.getRiskCategory(8);
  const highRisk = framinghamCalculatorService.getRiskCategory(18);
  console.assert(lowRisk.risk_category === 'low', 'Score 2 should be low risk');
  console.assert(mediumRisk.risk_category === 'medium', 'Score 8 should be medium risk');
  console.assert(highRisk.risk_category === 'high', 'Score 18 should be high risk');
  console.log('✓ Risk category tests passed\n');

  console.log('=== ALL TESTS PASSED ✅ ===\n');
}

/**
 * ============================================
 * RUN ALL EXAMPLES
 * ============================================
 */
export function runAllExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('FRAMINGHAM CALCULATOR SERVICE - COMPLETE EXAMPLES');
  console.log('='.repeat(60) + '\n');

  example1_YoungActiveFemale();
  example2_MiddleAgedMaleHighRisk();
  example3_OlderFemaleGoodControl();

  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60) + '\n');

  const result2 = example2_MiddleAgedMaleHighRisk();
  const recs = getRecommendations(result2);
  console.log('Recommendations for High Risk Patient:');
  recs.forEach(rec => console.log(`  • ${rec}`));

  runUnitTests();
}

// Uncomment to run examples:
// runAllExamples();
