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
    const debugLog = {
      totalMCUs: filteredMCUs?.length || 0,
      mcusWithLabs: 0,
      totalLabsLoaded: 0,
      labsProcessed: 0,
      labsSkipped: [],
      abnormalitiesFound: []
    };

    if (!Array.isArray(filteredMCUs) || filteredMCUs.length === 0) {
      return [];
    }

    try {
      // Batch-load lab results for all MCUs in parallel (not sequential!)
      const labResultsMap = new Map();

      if (labService && typeof labService.getPemeriksaanLabByMcuId === 'function') {
        // Load all lab results in parallel
        const labPromises = filteredMCUs.map(mcu =>
          labService.getPemeriksaanLabByMcuId(mcu.mcu_id || mcu.mcuId)
            .then(labs => ({ mcuId: mcu.mcu_id || mcu.mcuId, labs: Array.isArray(labs) ? labs : [] }))
            .catch(err => ({ mcuId: mcu.mcu_id || mcu.mcuId, labs: [] }))
        );

        const results = await Promise.all(labPromises);
        results.forEach(result => {
          if (result.labs && result.labs.length > 0) {
            labResultsMap.set(result.mcuId, result.labs);
            debugLog.mcusWithLabs++;
            debugLog.totalLabsLoaded += result.labs.length;
          }
        });
      }
    } catch (err) {
      // If batch load fails, continue with empty results
    }

    // Process MCUs with cached lab results
    for (const mcu of filteredMCUs) {
      try {
        const mcuId = mcu.mcu_id || mcu.mcuId;
        const labs = labResultsMap.get(mcuId) || [];

        if (!Array.isArray(labs)) continue;

        for (const lab of labs) {
          debugLog.labsProcessed++;

          if (lab.deleted_at) {
            debugLog.labsSkipped.push(`Lab ${lab.lab_item_id}: Deleted`);
            continue; // Skip soft-deleted records
          }

          // Get lab item info for reference ranges
          let minRange = lab.min_range_reference;
          let maxRange = lab.max_range_reference;
          let rangeSource = 'database';

          // If database ranges are NULL, use defaults from labItemsMapping
          if (!minRange || !maxRange) {
            const labItemInfo = getLabItemInfo(lab.lab_item_id);
            if (labItemInfo) {
              minRange = minRange || labItemInfo.min;
              maxRange = maxRange || labItemInfo.max;
              rangeSource = 'mapping';
            }
          }

          const value = parseFloat(lab.value);
          const status = this.determineLabStatus(lab.value, minRange, maxRange);

          // Debug: Log each lab result processing
          const labItemInfo = getLabItemInfo(lab.lab_item_id);
          const displayName = labItemInfo?.name || `Lab Item ${lab.lab_item_id}`;

          debugLog.labsSkipped.push({
            labId: lab.lab_item_id,
            name: displayName,
            value: value,
            min: minRange,
            max: maxRange,
            rangeSource: rangeSource,
            status: status,
            reason: status === 'normal' ? 'Normal value' : 'Abnormal'
          });

          if (status === 'normal') continue; // Skip normal results

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
            debugLog.abnormalitiesFound.push(conditionKey);
          }

          abnormalities[conditionKey].count++;
        }
      } catch (error) {
        // Log error but continue processing other MCUs
      }
    }

    // Store debug info
    window.__abnormalitiesLabDebug = debugLog;

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

    if (!Array.isArray(filteredMCUs)) {
      return [];
    }

    for (const mcu of filteredMCUs) {
      try {
        if (!mcu) continue;

        // Check Blood Pressure
        try {
          if (mcu.bloodPressure || mcu.blood_pressure) {
            const bp = mcu.bloodPressure || mcu.blood_pressure;
            if (this.isBPAbnormal(bp)) {
              const bpParsed = this.parseBP(bp);
              const conditionKey = 'Hipertensi'; // Disease name only

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
        } catch (bpError) {
          // Skip BP checking on error
        }

      } catch (mcuError) {
        // Skip this MCU on error and continue
        continue;
      }
    }

    return Object.values(abnormalities);
  },

  /**
   * Combine lab and MCU abnormalities and rank by frequency
   * Supports both separate and combined display
   */
  async getTopAbnormalities(filteredMCUs, options = {}) {
    try {
      const {
        limit = 10,           // Top N items
        includeTypes = ['lab', 'mcu'],  // ['lab', 'mcu', or both]
        sortBy = 'frequency'  // 'frequency' or 'name'
      } = options;

      let abnormalities = [];

      // Collect lab abnormalities
      if (includeTypes.includes('lab')) {
        try {
          const labAbnormalities = await this.collectLabAbnormalities(filteredMCUs);
          if (Array.isArray(labAbnormalities)) {
            abnormalities = abnormalities.concat(labAbnormalities);
          }
        } catch (labError) {
          // Continue even if lab collection fails
        }
      }

      // Collect MCU abnormalities
      if (includeTypes.includes('mcu')) {
        try {
          const mcuAbnormalities = this.collectMCUAbnormalities(filteredMCUs);
          if (Array.isArray(mcuAbnormalities)) {
            abnormalities = abnormalities.concat(mcuAbnormalities);
          }
        } catch (mcuError) {
          // Continue even if MCU collection fails
        }
      }

      // Debug logging
      window.__abnormalitiesDebug = {
        filteredMCUsCount: filteredMCUs?.length || 0,
        abnormalitiesCount: abnormalities?.length || 0,
        abnormalities: abnormalities
      };

      // If no abnormalities found, return empty array
      if (!Array.isArray(abnormalities) || abnormalities.length === 0) {
        return [];
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
    } catch (error) {
      // Return empty array on error
      return [];
    }
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
    try {
      let labAbnormalities = [];
      let mcuAbnormalities = [];

      // Collect lab abnormalities safely
      try {
        const labs = await this.collectLabAbnormalities(filteredMCUs);
        labAbnormalities = Array.isArray(labs) ? labs : [];
      } catch (labError) {
        // Use empty array if lab collection fails
        labAbnormalities = [];
      }

      // Collect MCU abnormalities safely
      try {
        const mcus = this.collectMCUAbnormalities(filteredMCUs);
        mcuAbnormalities = Array.isArray(mcus) ? mcus : [];
      } catch (mcuError) {
        // Use empty array if MCU collection fails
        mcuAbnormalities = [];
      }

      const totalAbnormalities = labAbnormalities.length + mcuAbnormalities.length;
      const totalOccurrences = labAbnormalities.reduce((sum, a) => sum + (a?.count || 0), 0) +
                               mcuAbnormalities.reduce((sum, a) => sum + (a?.count || 0), 0);

      const allAbnormalities = [...labAbnormalities, ...mcuAbnormalities];
      const sorted = allAbnormalities.sort((a, b) => (b?.count || 0) - (a?.count || 0));

      return {
        totalConditions: totalAbnormalities,
        totalOccurrences: totalOccurrences,
        labConditions: labAbnormalities.length,
        mcuConditions: mcuAbnormalities.length,
        mostCommon: sorted.length > 0 ? sorted[0] : null
      };
    } catch (error) {
      // Return default summary on error
      return {
        totalConditions: 0,
        totalOccurrences: 0,
        labConditions: 0,
        mcuConditions: 0,
        mostCommon: null
      };
    }
  }
};

export default abnormalitiesService;
