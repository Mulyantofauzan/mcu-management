/**
 * Metabolic Syndrome Scoring Service
 *
 * Implements Sindrom Metabolik assessment based on IDF & ATP III criteria
 * Binary scoring (0 or 1) for 5 parameters
 * Risk classification is LP-dependent
 *
 * Parameters:
 * 1. LP (Lingkar Perut/Waist Circumference): Gender-specific thresholds
 * 2. TG (Trigliserida/Triglycerides): ≥150 mg/dL abnormal
 * 3. HDL (Kolesterol HDL): Gender-specific thresholds (inverse)
 * 4. TD (Tekanan Darah/Blood Pressure): ≥130/85 mmHg abnormal
 * 5. GDP (Gula Darah Puasa/Fasting Glucose): ≥100 mg/dL or diabetes abnormal
 *
 * Risk Classification (LP-dependent):
 * - Risk 1: Nilai 0-2 AND LP=0 (normal waist circumference)
 * - Risk 2: Nilai 1-2 AND LP=1 (abnormal waist but <3 criteria)
 * - Risk 3: Nilai ≥3 (metabolic syndrome diagnosis)
 */

/**
 * Calculate waist circumference score (binary: 0 or 1)
 * Gender-specific thresholds per IDF criteria
 *
 * @param {number} waist - Waist circumference in cm
 * @param {string} gender - Gender: 'pria'/'laki-laki'/'male' or 'wanita'/'perempuan'/'female'
 * @returns {number} 0 if normal, 1 if abnormal
 */
function calculateWaistCircumferenceScore(waist, gender) {
    if (!waist) return undefined; // Missing data

    const waistValue = parseFloat(waist);
    const normalizedGender = (gender || '').toLowerCase();

    // Check if male
    const isMale =
        normalizedGender === 'pria' ||
        normalizedGender === 'laki-laki' ||
        normalizedGender === 'male' ||
        normalizedGender === 'm';

    if (isMale) {
        // Male: <90 cm = 0, ≥90 cm = 1
        return waistValue >= 90 ? 1 : 0;
    } else {
        // Female: <80 cm = 0, ≥80 cm = 1
        return waistValue >= 80 ? 1 : 0;
    }
}

/**
 * Calculate triglycerides score (binary: 0 or 1)
 *
 * @param {number} triglycerides - Triglycerides in mg/dL
 * @returns {number} 0 if <150, 1 if ≥150
 */
function calculateTriglyceridesScore(triglycerides) {
    if (!triglycerides) return undefined; // Missing data

    const tgValue = parseFloat(triglycerides);
    return tgValue >= 150 ? 1 : 0;
}

/**
 * Calculate HDL cholesterol score (binary: 0 or 1)
 * Gender-specific thresholds per IDF criteria
 * NOTE: HDL is PROTECTIVE (higher is better), so inverse scoring
 *
 * @param {number} hdl - HDL cholesterol in mg/dL
 * @param {string} gender - Gender: 'pria'/'male' or 'wanita'/'female'
 * @returns {number} 0 if protective, 1 if low
 */
function calculateHDLScore(hdl, gender) {
    if (!hdl) return undefined; // Missing data

    const hdlValue = parseFloat(hdl);
    const normalizedGender = (gender || '').toLowerCase();

    // Check if male
    const isMale =
        normalizedGender === 'pria' ||
        normalizedGender === 'laki-laki' ||
        normalizedGender === 'male' ||
        normalizedGender === 'm';

    if (isMale) {
        // Male: <40 mg/dL = 1 (abnormal), ≥40 mg/dL = 0 (normal)
        return hdlValue < 40 ? 1 : 0;
    } else {
        // Female: <50 mg/dL = 1 (abnormal), ≥50 mg/dL = 0 (normal)
        return hdlValue < 50 ? 1 : 0;
    }
}

/**
 * Calculate blood pressure score (binary: 0 or 1)
 *
 * @param {string} bp - Blood pressure in format "SBP/DBP" e.g., "130/85"
 * @returns {number} 0 if <130/85, 1 if ≥130/85
 */
function calculateBloodPressureScore(bp) {
    if (!bp) return undefined; // Missing data

    const bpParts = bp.toString().split('/');
    const systolic = parseInt(bpParts[0]);
    const diastolic = parseInt(bpParts[1]);

    // Score 1 if EITHER systolic ≥130 OR diastolic ≥85
    return systolic >= 130 || diastolic >= 85 ? 1 : 0;
}

/**
 * Calculate fasting glucose score (binary: 0 or 1)
 *
 * @param {number} glucose - Fasting glucose in mg/dL
 * @param {boolean} hasDiabetes - Whether employee has diabetes diagnosis
 * @returns {number} 0 if <100 and no diabetes, 1 if ≥100 or has diabetes
 */
function calculateGlucoseScore(glucose, hasDiabetes) {
    // If has diabetes diagnosis, automatically 1
    if (hasDiabetes) return 1;

    // If no diabetes but no glucose value, return undefined
    if (!glucose) return undefined;

    const glucoseValue = parseFloat(glucose);
    return glucoseValue >= 100 ? 1 : 0;
}

/**
 * Perform complete metabolic syndrome assessment
 * Calculates all 5 parameters and determines risk level with LP-dependency
 *
 * @param {object} employee - Employee object with gender
 * @param {object} mcu - MCU object with measurements
 * @param {object} labResults - Lab results object or array with lab values
 * @param {boolean} hasDiabetes - Whether employee has diabetes
 * @returns {object} Assessment result with individual scores, total, and risk
 */
function performMetabolicSyndromeAssessment(employee, mcu, labResults, hasDiabetes) {
    // Extract values from various sources
    const gender = employee.jenisKelamin || employee.gender || employee.jenis_kelamin;

    // Get waist circumference (using chest_circumference field)
    const waist = mcu?.chestCircumference || mcu?.chest_circumference;

    // Get lab results
    let triglycerides, hdl, glucose;
    if (Array.isArray(labResults)) {
        // If labResults is array, map by lab_item_id
        const labMap = {};
        labResults.forEach(lab => {
            labMap[lab.lab_item_id] = lab.value;
        });
        triglycerides = labMap[9]; // Lab ID 9: Trigliserida
        hdl = labMap[10]; // Lab ID 10: HDL
        glucose = labMap[7]; // Lab ID 7: GDP
    } else if (labResults) {
        // If labResults is object, use directly
        triglycerides = labResults.triglycerides || labResults.trigliserida;
        hdl = labResults.hdl || labResults.hdlCholesterol;
        glucose = labResults.glucose || labResults.gdp || labResults.GDP;
    }

    // Get blood pressure
    const bp = mcu?.bloodPressure || mcu?.blood_pressure;

    // Calculate individual scores
    const lpScore = calculateWaistCircumferenceScore(waist, gender);
    const tgScore = calculateTriglyceridesScore(triglycerides);
    const hdlScore = calculateHDLScore(hdl, gender);
    const tdScore = calculateBloodPressureScore(bp);
    const gdpScore = calculateGlucoseScore(glucose, hasDiabetes);

    // Calculate total score (sum of available scores)
    // Only count defined values
    let totalScore = 0;
    let countedCriteria = 0;

    if (lpScore !== undefined) {
        totalScore += lpScore;
        countedCriteria++;
    }
    if (tgScore !== undefined) {
        totalScore += tgScore;
        countedCriteria++;
    }
    if (hdlScore !== undefined) {
        totalScore += hdlScore;
        countedCriteria++;
    }
    if (tdScore !== undefined) {
        totalScore += tdScore;
        countedCriteria++;
    }
    if (gdpScore !== undefined) {
        totalScore += gdpScore;
        countedCriteria++;
    }

    // Determine risk based on total score and LP presence
    const risk = getMetabolicSyndromeRisk(totalScore, lpScore);

    return {
        scores: {
            lp: lpScore,
            tg: tgScore,
            hdl: hdlScore,
            td: tdScore,
            gdp: gdpScore
        },
        totalScore: totalScore,
        countedCriteria: countedCriteria, // How many of 5 criteria were available
        risk: risk
    };
}

/**
 * Determine metabolic syndrome risk level based on total score and LP
 * Risk classification is LP-DEPENDENT:
 * - Risk 1: Nilai 0-2 AND LP=0 (normal waist, safe)
 * - Risk 2: Nilai 1-2 AND LP=1 (abnormal waist, concerning)
 * - Risk 3: Nilai ≥3 (metabolic syndrome diagnosis)
 *
 * @param {number} totalScore - Sum of 5 parameter scores (0-5)
 * @param {number} lpScore - Waist circumference score (0=normal, 1=abnormal)
 * @returns {number} Risk level 1, 2, or 3
 */
function getMetabolicSyndromeRisk(totalScore, lpScore) {
    // If total score is 3 or more, always Risk 3 (metabolic syndrome)
    if (totalScore >= 3) {
        return 3;
    }

    // If total score is 0-2, check LP to determine Risk 1 or 2
    if (totalScore <= 2) {
        if (lpScore === 0) {
            // Normal waist circumference, max risk 1
            return 1;
        } else if (lpScore === 1) {
            // Abnormal waist circumference with 1-2 criteria, Risk 2
            return 2;
        }
    }

    // Default (shouldn't reach here)
    return 0;
}

/**
 * Get risk label and color for display
 *
 * @param {number} risk - Risk level (1, 2, or 3)
 * @returns {object} Object with text and color for display
 */
function getMetabolicSyndromeRiskLabel(risk) {
    switch (risk) {
        case 1:
            return {
                text: '1',
                label: 'Normal',
                color: 'bg-green-100',
                textColor: 'text-green-800'
            };
        case 2:
            return {
                text: '2',
                label: 'Medium',
                color: 'bg-yellow-100',
                textColor: 'text-yellow-800'
            };
        case 3:
            return {
                text: '3',
                label: 'Sindrom Metabolik',
                color: 'bg-red-100',
                textColor: 'text-red-800'
            };
        default:
            return {
                text: '-',
                label: 'Unknown',
                color: 'bg-gray-100',
                textColor: 'text-gray-800'
            };
    }
}

// Export all functions
export {
    calculateWaistCircumferenceScore,
    calculateTriglyceridesScore,
    calculateHDLScore,
    calculateBloodPressureScore,
    calculateGlucoseScore,
    performMetabolicSyndromeAssessment,
    getMetabolicSyndromeRisk,
    getMetabolicSyndromeRiskLabel
};

// Also export as default for single imports
export default {
    calculateWaistCircumferenceScore,
    calculateTriglyceridesScore,
    calculateHDLScore,
    calculateBloodPressureScore,
    calculateGlucoseScore,
    performMetabolicSyndromeAssessment,
    getMetabolicSyndromeRisk,
    getMetabolicSyndromeRiskLabel
};
