/**
 * Abnormalities Service
 * Identifies and ranks abnormal conditions from lab results and MCU exam data
 *
 * Features:
 * - Detect abnormal lab results based on reference ranges
 * - Identify abnormal MCU exam findings (BP, BMI, Vision, etc.)
 * - Combine and rank all abnormalities by frequency
 * - Support configurable top-N display
 * - Filter by dataset (lab, mcu, or combined)
 * - Respect dashboard filters (department, year, employee type)
 */

import { labService } from './labService.js';
import { getLabItemInfo } from '../data/labItemsMapping.js';

export const abnormalitiesService = {
  /**
   * Get reference ranges for MCU exam findings
   * These are standard medical thresholds
   */
  getMCUReferenceRanges() {
    return {
      bloodPressure: {
        name: 'Tekanan Darah',
        normal: 'SBP < 130 AND DBP < 85',
        abnormal: 'SBP ≥ 130 OR DBP ≥ 85',
        category: 'Hypertension'
      },
      bmi: {
        name: 'BMI (Body Mass Index)',
        ranges: {
          underweight: { min: 0, max: 18.4, label: 'Underweight' },
          normal: { min: 18.5, max: 24.9, label: 'Normal' },
          overweight: { min: 25, max: 29.9, label: 'Overweight' },
          obese: { min: 30, max: 999, label: 'Obese' }
        },
        abnormal: ['Overweight', 'Obese'],
        category: 'Obesity'
      },
      visionDistant: {
        name: 'Vision (Distant)',
        normal: '≥ 6/6 or 20/20',
        abnormal: '< 6/6 or 20/20',
        category: 'Vision Defect'
      },
      visionNear: {
        name: 'Vision (Near)',
        normal: '≥ N6',
        abnormal: '< N6',
        category: 'Vision Defect'
      }
    };
  },

  /**
   * Determine BMI category
   */
  getBMICategory(bmi) {
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return 'Underweight';
    if (bmiValue < 25) return 'Normal';
    if (bmiValue < 30) return 'Overweight';
    return 'Obese';
  },

  /**
   * Check if blood pressure is abnormal
   * Format: "SBP/DBP" or "120/80"
   */
  isBPAbnormal(bpString) {
    if (!bpString) return null;

    const parts = String(bpString).split('/');
    if (parts.length !== 2) return null;

    const sbp = parseFloat(parts[0]);
    const dbp = parseFloat(parts[1]);

    if (isNaN(sbp) || isNaN(dbp)) return null;

    // Abnormal if SBP ≥ 130 OR DBP ≥ 85
    return sbp >= 130 || dbp >= 85;
  },

  /**
   * Parse blood pressure into SBP and DBP
   */
  parseBP(bpString) {
    if (!bpString) return null;

    const parts = String(bpString).split('/');
    if (parts.length !== 2) return null;

    const sbp = parseFloat(parts[0]);
    const dbp = parseFloat(parts[1]);

    if (isNaN(sbp) || isNaN(dbp)) return null;

    return { sbp, dbp };
  },

  /**
   * Check if vision result is abnormal
   * Normal vision is 6/6 or better (20/20 in Snellen)
   */
  isVisionAbnormal(visionValue) {
    if (!visionValue || visionValue === '-' || visionValue === '') return false;

    const vision = String(visionValue).trim().toUpperCase();

    // Vision values worse than 6/6 (20/20) are considered abnormal
    // Values like 6/9, 6/12, 6/18, 6/24, etc. are abnormal
    // Or 20/30, 20/40, 20/60, etc.
    const abnormalPatterns = ['6/9', '6/12', '6/18', '6/24', '20/30', '20/40', '20/60', 'CF', 'HM', 'LP', 'NLP'];

    return abnormalPatterns.some(pattern => vision.includes(pattern));
  },

  /**
   * Collect all abnormalities from lab results
   * Returns array of {conditionName, count, type: 'lab', labItemId, ...}
   */
  async collectLabAbnormalities(filteredMCUs) {
    const abnormalities = {};

    for (const mcu of filteredMCUs) {
      try {
        // Get lab results for this MCU
        const labs = await labService.getPemeriksaanLabByMcuId(mcu.mcu_id || mcu.mcuId);

        if (!Array.isArray(labs)) continue;

        for (const lab of labs) {
          if (lab.deleted_at) continue; // Skip soft-deleted records

          const status = this.determineLabStatus(lab.value, lab.min_range_reference, lab.max_range_reference);

          if (status === 'normal') continue; // Skip normal results

          // Get lab item info for display name
          const labItemInfo = getLabItemInfo(lab.lab_item_id);
          const displayName = labItemInfo?.name || `Lab Item ${lab.lab_item_id}`;

          // Create condition key: "Lab Name - Status"
          const conditionKey = `${displayName} (${status === 'high' ? 'Tinggi' : 'Rendah'})`;

          if (!abnormalities[conditionKey]) {
            abnormalities[conditionKey] = {
              name: conditionKey,
              count: 0,
              type: 'lab',
              labItemId: lab.lab_item_id,
              displayName: displayName,
              status: status,
              unit: lab.unit,
              category: 'Lab Results'
            };
          }

          abnormalities[conditionKey].count++;
        }
      } catch (error) {
        // Log error but continue processing other MCUs
      }
    }

    return Object.values(abnormalities);
  },

  /**
   * Determine if lab value is abnormal
   */
  determineLabStatus(value, minRange, maxRange) {
    const numValue = parseFloat(value);
    const numMin = parseFloat(minRange);
    const numMax = parseFloat(maxRange);

    if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) {
      return null;
    }

    if (numValue < numMin) return 'low';
    if (numValue > numMax) return 'high';
    return 'normal';
  },

  /**
   * Collect all abnormalities from MCU exam findings
   * Returns array of {conditionName, count, type: 'mcu', ...}
   */
  collectMCUAbnormalities(filteredMCUs) {
    const abnormalities = {};

    for (const mcu of filteredMCUs) {
      // Check Blood Pressure
      if (mcu.bloodPressure || mcu.blood_pressure) {
        const bp = mcu.bloodPressure || mcu.blood_pressure;
        if (this.isBPAbnormal(bp)) {
          const bpParsed = this.parseBP(bp);
          const conditionKey = `Hipertensi (${bp} mmHg)`;

          if (!abnormalities[conditionKey]) {
            abnormalities[conditionKey] = {
              name: conditionKey,
              count: 0,
              type: 'mcu',
              examType: 'bloodPressure',
              category: 'Hypertension',
              sbp: bpParsed?.sbp,
              dbp: bpParsed?.dbp
            };
          }

          abnormalities[conditionKey].count++;
        }
      }

      // Check BMI
      if (mcu.bmi) {
        const bmiValue = parseFloat(mcu.bmi);
        if (!isNaN(bmiValue)) {
          const category = this.getBMICategory(bmiValue);

          if (category !== 'Normal') {
            const conditionKey = `${category} (BMI ${bmiValue.toFixed(1)})`;

            if (!abnormalities[conditionKey]) {
              abnormalities[conditionKey] = {
                name: conditionKey,
                count: 0,
                type: 'mcu',
                examType: 'bmi',
                category: 'Obesity',
                bmiValue: bmiValue,
                bmiCategory: category
              };
            }

            abnormalities[conditionKey].count++;
          }
        }
      }

      // Check Vision - check all 8 vision fields
      const visionFields = [
        { key: 'vision_distant_unaided_left', label: 'Distant Vision Unaided (Left)' },
        { key: 'vision_distant_unaided_right', label: 'Distant Vision Unaided (Right)' },
        { key: 'vision_distant_spectacles_left', label: 'Distant Vision with Spectacles (Left)' },
        { key: 'vision_distant_spectacles_right', label: 'Distant Vision with Spectacles (Right)' },
        { key: 'vision_near_unaided_left', label: 'Near Vision Unaided (Left)' },
        { key: 'vision_near_unaided_right', label: 'Near Vision Unaided (Right)' },
        { key: 'vision_near_spectacles_left', label: 'Near Vision with Spectacles (Left)' },
        { key: 'vision_near_spectacles_right', label: 'Near Vision with Spectacles (Right)' }
      ];

      for (const field of visionFields) {
        const visionValue = mcu[field.key] || mcu[field.key.replace(/_/g, '')];

        if (this.isVisionAbnormal(visionValue)) {
          const conditionKey = `Gangguan Penglihatan - ${field.label}`;

          if (!abnormalities[conditionKey]) {
            abnormalities[conditionKey] = {
              name: conditionKey,
              count: 0,
              type: 'mcu',
              examType: 'vision',
              category: 'Vision Defect',
              visionField: field.key
            };
          }

          abnormalities[conditionKey].count++;
        }
      }
    }

    return Object.values(abnormalities);
  },

  /**
   * Combine lab and MCU abnormalities and rank by frequency
   * Supports both separate and combined display
   */
  async getTopAbnormalities(filteredMCUs, options = {}) {
    const {
      limit = 10,           // Top N items
      includeTypes = ['lab', 'mcu'],  // ['lab', 'mcu', or both]
      sortBy = 'frequency'  // 'frequency' or 'name'
    } = options;

    let abnormalities = [];

    // Collect lab abnormalities
    if (includeTypes.includes('lab')) {
      const labAbnormalities = await this.collectLabAbnormalities(filteredMCUs);
      abnormalities = abnormalities.concat(labAbnormalities);
    }

    // Collect MCU abnormalities
    if (includeTypes.includes('mcu')) {
      const mcuAbnormalities = this.collectMCUAbnormalities(filteredMCUs);
      abnormalities = abnormalities.concat(mcuAbnormalities);
    }

    // Sort by count (frequency) descending
    abnormalities.sort((a, b) => {
      if (sortBy === 'frequency') {
        return b.count - a.count;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    // Return top N
    return abnormalities.slice(0, limit);
  },

  /**
   * Get separate top abnormalities for lab and MCU
   * Returns {lab: [...], mcu: [...]}
   */
  async getTopAbnormalitiesSeparate(filteredMCUs, labLimit = 10, mcuLimit = 10) {
    const labAbnormalities = await this.collectLabAbnormalities(filteredMCUs);
    const mcuAbnormalities = this.collectMCUAbnormalities(filteredMCUs);

    // Sort by frequency
    labAbnormalities.sort((a, b) => b.count - a.count);
    mcuAbnormalities.sort((a, b) => b.count - a.count);

    return {
      lab: labAbnormalities.slice(0, labLimit),
      mcu: mcuAbnormalities.slice(0, mcuLimit),
      combined: [...labAbnormalities, ...mcuAbnormalities].sort((a, b) => b.count - a.count).slice(0, Math.max(labLimit, mcuLimit))
    };
  },

  /**
   * Get summary statistics
   */
  async getAbnormalitiesSummary(filteredMCUs) {
    const labAbnormalities = await this.collectLabAbnormalities(filteredMCUs);
    const mcuAbnormalities = this.collectMCUAbnormalities(filteredMCUs);

    const totalAbnormalities = labAbnormalities.length + mcuAbnormalities.length;
    const totalOccurrences = labAbnormalities.reduce((sum, a) => sum + a.count, 0) +
                             mcuAbnormalities.reduce((sum, a) => sum + a.count, 0);

    return {
      totalConditions: totalAbnormalities,
      totalOccurrences: totalOccurrences,
      labConditions: labAbnormalities.length,
      mcuConditions: mcuAbnormalities.length,
      mostCommon: [...labAbnormalities, ...mcuAbnormalities]
        .sort((a, b) => b.count - a.count)[0]
    };
  }
};

export default abnormalitiesService;
