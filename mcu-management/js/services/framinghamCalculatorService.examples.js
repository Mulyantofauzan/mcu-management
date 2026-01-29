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


  const labels = framinghamCalculatorService.getParameterLabels();
  const parameters = framinghamCalculatorService.getParameterNames();

  parameters.forEach(param => {
    const score = result[param];
    const description = framinghamCalculatorService.getScoreDescription(param, score);
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

  // Test 1: Gender scoring

  // Test 2: Age scoring

  // Test 3: Exercise scoring (protective factor)

  // Test 4: Smoking scoring

  // Test 5: Blood pressure scoring

  // Test 6: BMI scoring

  // Test 7: Glucose scoring

  // Test 8: Cholesterol scoring

  // Test 9: HDL scoring (inverse)

  // Test 10: Risk category classification
  const lowRisk = framinghamCalculatorService.getRiskCategory(2);
  const mediumRisk = framinghamCalculatorService.getRiskCategory(8);
  const highRisk = framinghamCalculatorService.getRiskCategory(18);

}

/**
 * ============================================
 * RUN ALL EXAMPLES
 * ============================================
 */
export function runAllExamples() {

  example1_YoungActiveFemale();
  example2_MiddleAgedMaleHighRisk();
  example3_OlderFemaleGoodControl();


  const result2 = example2_MiddleAgedMaleHighRisk();
  const recs = getRecommendations(result2);

  runUnitTests();
}

// Uncomment to run examples:
// runAllExamples();
