/**
 * Vision Scale Helper
 * Categorizes vision acuity values into grades (Normal, Gangguan Ringan, etc.)
 * Used for Analysis Dashboard vision charts
 */

// Vision acuity grades mapping
export const VISION_GRADES = {
  NORMAL: {
    id: 'normal',
    label: 'Normal',
    values: ['6/6', '20/20', 'J1'],
    color: '#10b981'
  },
  RINGAN: {
    id: 'ringan',
    label: 'Gangguan Ringan',
    values: ['6/9', '6/12', '20/30', '20/40'],
    color: '#f59e0b'
  },
  SEDANG: {
    id: 'sedang',
    label: 'Gangguan Sedang',
    values: ['6/18', '6/24', '20/60', '20/80'],
    color: '#f97316'
  },
  BERAT: {
    id: 'berat',
    label: 'Gangguan Berat',
    values: ['6/36', '6/60', '20/120', '20/200'],
    color: '#ef4444'
  }
};

/**
 * Normalize vision value for comparison
 * @param {string} value - Vision value (e.g., "6/6", "20/20", "J1")
 * @returns {string} Normalized value (uppercase, trimmed)
 */
export function normalizeVisionValue(value) {
  if (!value) return '';
  return String(value).trim().toUpperCase();
}

/**
 * Get vision grade for a single value
 * @param {string} value - Vision value
 * @returns {string} Grade ID: 'normal', 'ringan', 'sedang', 'berat', or 'unmeasured'
 */
export function getVisionGrade(value) {
  if (!value) return 'unmeasured';

  const normalized = normalizeVisionValue(value);

  // Check each grade
  for (const [gradeKey, gradeInfo] of Object.entries(VISION_GRADES)) {
    if (gradeInfo.values.some(v => v.toUpperCase() === normalized)) {
      return gradeInfo.id; // Return id (lowercase) instead of key (uppercase)
    }
  }

  // Custom value
  return 'unmeasured';
}

/**
 * Compare two vision grades
 * Returns hierarchy: berat > sedang > ringan > normal > unmeasured
 * @param {string} grade1 - First grade ID
 * @param {string} grade2 - Second grade ID
 * @returns {string} Worse of the two grades
 */
function getWorseGrade(grade1, grade2) {
  const hierarchy = ['berat', 'sedang', 'ringan', 'normal'];

  if (grade1 === 'unmeasured' && grade2 === 'unmeasured') return 'unmeasured';
  if (grade1 === 'unmeasured') return grade2;
  if (grade2 === 'unmeasured') return grade1;

  const index1 = hierarchy.indexOf(grade1);
  const index2 = hierarchy.indexOf(grade2);

  if (index1 === -1) return grade2; // invalid grade
  if (index2 === -1) return grade1; // invalid grade

  return index1 < index2 ? grade1 : grade2;
}

/**
 * Get best eye vision from one pair (unaided + spectacles)
 * Priority: Unaided > Spectacles (because unaided is more realistic)
 * If both available, take the WORSE one (more conservative)
 * @param {string} unaided - Unaided vision value
 * @param {string} spectacles - Spectacles vision value
 * @returns {string} Grade ID for this pair
 */
function getEyeGrade(unaided, spectacles) {
  const unaaidedGrade = getVisionGrade(unaided);
  const spectaclesGrade = getVisionGrade(spectacles);

  // If only one available, use it
  if (unaaidedGrade !== 'unmeasured' && spectaclesGrade === 'unmeasured') {
    return unaaidedGrade;
  }
  if (spectaclesGrade !== 'unmeasured' && unaaidedGrade === 'unmeasured') {
    return spectaclesGrade;
  }

  // If both unavailable, return unmeasured
  if (unaaidedGrade === 'unmeasured' && spectaclesGrade === 'unmeasured') {
    return 'unmeasured';
  }

  // Both available: prioritize UNAIDED (more important) but if both exist, take worse
  return getWorseGrade(unaaidedGrade, spectaclesGrade);
}

/**
 * Evaluate overall vision status from 8 vision fields
 * Smart logic:
 * - Groups fields into 4 eye-pairs (Distant/Near × Left/Right)
 * - For each pair: evaluates unaided vs spectacles
 * - Returns worst grade from all pairs
 * - Only returns "unmeasured" if ALL 8 fields are empty
 *
 * @param {object} visionFields - Object with 8 vision fields
 * @returns {string} Overall grade ID ('normal', 'ringan', 'sedang', 'berat', 'unmeasured')
 */
export function evaluateVisionStatus(visionFields) {
  if (!visionFields) return 'unmeasured';

  // Group into 4 eye-pairs: Distant Left, Distant Right, Near Left, Near Right
  const eyePairs = [
    // Distant vision
    {
      name: 'Distant Left',
      unaided: visionFields.visionDistantUnaideLeft,
      spectacles: visionFields.visionDistantSpectaclesLeft
    },
    {
      name: 'Distant Right',
      unaided: visionFields.visionDistantUnaideRight,
      spectacles: visionFields.visionDistantSpectaclesRight
    },
    // Near vision
    {
      name: 'Near Left',
      unaided: visionFields.visionNearUnaideLeft,
      spectacles: visionFields.visionNearSpectaclesLeft
    },
    {
      name: 'Near Right',
      unaided: visionFields.visionNearUnaideRight,
      spectacles: visionFields.visionNearSpectaclesRight
    }
  ];

  // Evaluate each eye-pair
  const eyeGrades = eyePairs.map(pair => getEyeGrade(pair.unaided, pair.spectacles));

  // Filter out unmeasured to find measured grades
  const measuredGrades = eyeGrades.filter(g => g !== 'unmeasured');

  // If no measured grades at all, return unmeasured
  if (measuredGrades.length === 0) return 'unmeasured';

  // Return worst grade from all measured pairs
  return measuredGrades.reduce((worst, current) => getWorseGrade(worst, current));
}

/**
 * Get vision grade info (label, color, etc.)
 * @param {string} gradeId - Grade ID
 * @returns {object} Grade information or null if not found
 */
export function getGradeInfo(gradeId) {
  if (gradeId === 'unmeasured') {
    return {
      id: 'unmeasured',
      label: 'Tidak Terukur',
      color: '#9ca3af'
    };
  }

  return VISION_GRADES[gradeId] || null;
}

/**
 * Get all grade info for chart display
 * @returns {array} Array of grade info objects
 */
export function getAllGradeInfo() {
  return [
    VISION_GRADES.NORMAL,
    VISION_GRADES.RINGAN,
    VISION_GRADES.SEDANG,
    VISION_GRADES.BERAT,
    {
      id: 'unmeasured',
      label: 'Tidak Terukur',
      color: '#9ca3af'
    }
  ];
}

export default {
  VISION_GRADES,
  normalizeVisionValue,
  getVisionGrade,
  evaluateVisionStatus,
  getGradeInfo,
  getAllGradeInfo
};
