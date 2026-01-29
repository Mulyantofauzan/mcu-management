/**
 * Comorbid Disease Service
 * Identifies and ranks comorbid diseases from employee medical histories
 *
 * Features:
 * - Extract diseases from latest MCU's medical history
 * - Count frequency of each disease across employees
 * - Rank by frequency (most common diseases first)
 * - Support configurable top-N display
 * - Filter by disease category
 */

import { database } from './database.js';

export const comorbidDiseaseService = {
  /**
   * Collect all comorbid diseases from latest MCU of each employee
   * Returns array of {diseaseName, count, category, icdCode, ...}
   */
  async collectComorbidDiseases(filteredMCUs) {
    const diseases = {};

    if (!Array.isArray(filteredMCUs) || filteredMCUs.length === 0) {
      return [];
    }

    try {
      // Batch-load medical histories for all MCUs in parallel
      const medicalHistoriesMap = new Map();

      if (database && database.MedicalHistories && typeof database.MedicalHistories.getByMcuId === 'function') {
        // Load all medical histories in parallel
        const historyPromises = filteredMCUs.map(mcu => {
          const mcuId = mcu.mcu_id || mcu.mcuId;
          return database.MedicalHistories.getByMcuId(mcuId)
            .then(histories => ({
              mcuId: mcuId,
              histories: Array.isArray(histories) ? histories : []
            }))
            .catch(err => ({
              mcuId: mcuId,
              histories: []
            }));
        });

        const results = await Promise.all(historyPromises);
        results.forEach(result => {
          if (result.histories && result.histories.length > 0) {
            medicalHistoriesMap.set(result.mcuId, result.histories);
          }
        });
      }

      // Debug logging
      window.__comorbidDiseaseCollectDebug = {
        filteredMCUsCount: filteredMCUs?.length || 0,
        medicalHistoriesLoaded: medicalHistoriesMap.size,
        totalHistories: Array.from(medicalHistoriesMap.values()).reduce((sum, arr) => sum + arr.length, 0)
      };

      // Process MCUs with cached medical histories
      for (const mcu of filteredMCUs) {
        try {
          const mcuId = mcu.mcu_id || mcu.mcuId;
          const histories = medicalHistoriesMap.get(mcuId) || [];

          if (!Array.isArray(histories)) continue;

          for (const history of histories) {
            if (history.deleted_at) continue; // Skip soft-deleted records

            // Get disease name (prefer disease_name if available, otherwise construct from id)
            const diseaseName = history.disease_name || `Disease ${history.disease_id}`;

            if (!diseaseName || diseaseName === '-' || diseaseName === '') continue;

            // Create condition key using disease name
            const conditionKey = diseaseName.trim();

            if (!diseases[conditionKey]) {
              diseases[conditionKey] = {
                name: conditionKey,
                count: 0,
                type: 'comorbid',
                diseaseId: history.disease_id,
                yearDiagnosed: history.year_diagnosed,
                notes: history.notes,
                category: 'Comorbid Diseases'
              };
            }

            diseases[conditionKey].count++;
          }
        } catch (error) {
          // Log error but continue processing other MCUs
        }
      }

    } catch (err) {
      // If batch load fails, continue with empty results
    }

    return Object.values(diseases);
  },

  /**
   * Get top comorbid diseases ranked by frequency
   */
  async getTopComorbidDiseases(filteredMCUs, options = {}) {
    try {
      const {
        limit = 10,           // Top N items
        sortBy = 'frequency'  // 'frequency' or 'name'
      } = options;

      // Collect diseases
      let diseases = await this.collectComorbidDiseases(filteredMCUs);

      // Debug logging
      window.__comorbidDiseaseDebug = {
        filteredMCUsCount: filteredMCUs?.length || 0,
        diseasesCount: diseases?.length || 0,
        diseases: diseases
      };

      // If no diseases found, return empty array
      if (!Array.isArray(diseases) || diseases.length === 0) {
        return [];
      }

      // Sort by count (frequency) descending
      diseases.sort((a, b) => {
        if (sortBy === 'frequency') {
          return b.count - a.count;
        } else if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });

      // Return top N
      return diseases.slice(0, limit);
    } catch (error) {
      // Return empty array on error
      return [];
    }
  },

  /**
   * Get summary statistics for comorbid diseases
   */
  async getComorbidDiseasesSummary(filteredMCUs) {
    try {
      const diseases = await this.collectComorbidDiseases(filteredMCUs);

      if (!Array.isArray(diseases) || diseases.length === 0) {
        return {
          totalDiseases: 0,
          totalOccurrences: 0,
          mostCommon: null
        };
      }

      const totalOccurrences = diseases.reduce((sum, d) => sum + (d?.count || 0), 0);
      const sorted = diseases.sort((a, b) => (b?.count || 0) - (a?.count || 0));

      return {
        totalDiseases: diseases.length,
        totalOccurrences: totalOccurrences,
        mostCommon: sorted.length > 0 ? sorted[0] : null
      };
    } catch (error) {
      return {
        totalDiseases: 0,
        totalOccurrences: 0,
        mostCommon: null
      };
    }
  }
};

export default comorbidDiseaseService;
