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
      return gradeKey;
    }
  }

  // Custom value
  return 'unmeasured';
}

/**
 * Compare two vision grades
 * Returns hierarchy: BERAT > SEDANG > RINGAN > NORMAL > unmeasured
 * @param {string} grade1 - First grade ID
 * @param {string} grade2 - Second grade ID
 * @returns {string} Worse of the two grades
 */
function getWorseGrade(grade1, grade2) {
  const hierarchy = ['BERAT', 'SEDANG', 'RINGAN', 'NORMAL'];

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
 * Evaluate overall vision status from 8 vision fields
 * Takes the worst grade from all fields
 * @param {object} visionFields - Object with 8 vision fields
 * @returns {string} Overall grade ID ('normal', 'ringan', 'sedang', 'berat', 'unmeasured')
 */
export function evaluateVisionStatus(visionFields) {
  if (!visionFields) return 'unmeasured';

  const fields = [
    visionFields.visionDistantUnaideLeft,
    visionFields.visionDistantUnaideRight,
    visionFields.visionDistantSpectaclesLeft,
    visionFields.visionDistantSpectaclesRight,
    visionFields.visionNearUnaideLeft,
    visionFields.visionNearUnaideRight,
    visionFields.visionNearSpectaclesLeft,
    visionFields.visionNearSpectaclesRight
  ];

  // Get grades for all fields
  const grades = fields.map(field => getVisionGrade(field));

  // Count non-unmeasured fields
  const measuredGrades = grades.filter(g => g !== 'unmeasured');

  // If no measured fields, return unmeasured
  if (measuredGrades.length === 0) return 'unmeasured';

  // Return worst grade
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
