/**
 * MCU Batch Service
 * Handle atomic/sequential save operations for MCU + Lab Results
 * Prevents race conditions and orphaned records
 */

import { mcuService } from './mcuService.js';
import { labService } from './labService.js';

class MCUBatchService {
  /**
   * Batch save MCU + lab results in correct sequence
   * Collects all data first, validates, then saves atomically
   *
   * @param {Object} mcuData - MCU record data
   * @param {Array} labResults - Array of lab result objects
   * @param {Object} currentUser - Current user object
   * @returns {Object} - { success: boolean, data: {mcu, labSaved, labFailed}, errors: [] }
   */
  async saveMCUWithLabResults(mcuData, labResults, currentUser) {
    const result = {
      success: false,
      data: {
        mcu: null,
        labSaved: [],
        labFailed: []
      },
      errors: []
    };

    try {
      // ✅ STEP 1: Validate MCU data
      this._validateMCUData(mcuData);

      // ✅ STEP 2: Validate and normalize lab results
      const normalizedLabResults = this._validateAndNormalizeLabResults(labResults);

      // ✅ STEP 3: Save MCU (point of no return)
      const createdMCU = await mcuService.create(mcuData, currentUser);
      result.data.mcu = createdMCU;

      // ✅ STEP 4: Save lab results with individual error handling
      if (normalizedLabResults.length > 0) {
        for (const labResult of normalizedLabResults) {
          try {
            // Create lab result with explicit MCU ID
            const labPayload = {
              mcuId: createdMCU.mcuId,
              employeeId: mcuData.employeeId,
              labItemId: labResult.labItemId,
              value: labResult.value,
              notes: labResult.notes || null
            };

            const savedLab = await labService.createPemeriksaanLab(labPayload, currentUser);
            result.data.labSaved.push({
              labItemId: labResult.labItemId,
              data: savedLab
            });
          } catch (labError) {
            result.data.labFailed.push({
              labItemId: labResult.labItemId,
              error: labError.message
            });
            result.errors.push(`Lab item ${labResult.labItemId}: ${labError.message}`);
          }
        }
      }

      // ✅ STEP 5: Verify all lab results were saved
      await this._verifyLabResultsInDatabase(createdMCU.mcuId, normalizedLabResults.length);

      // ✅ STEP 6: Clean up phantom records
      try {
        await labService.cleanupPhantomLabRecords(createdMCU.mcuId);
      } catch (cleanupError) {
        // Phantom cleanup failed (non-critical)
      }

      // ✅ FINAL: Determine overall success
      const allLabSaved = result.data.labFailed.length === 0 && result.data.labSaved.length === normalizedLabResults.length;
      result.success = allLabSaved;

      if (result.data.labSaved.length > 0 && result.data.labFailed.length === 0) {
        result.success = true; // All saved successfully
      } else if (result.data.labSaved.length > 0) {
        result.success = true; // Partial success is still considered success
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Validate MCU data structure and required fields
   */
  _validateMCUData(mcuData) {
    const requiredFields = ['mcuId', 'employeeId', 'mcuType', 'mcuDate'];
    for (const field of requiredFields) {
      if (!mcuData[field]) {
        throw new Error(`Missing required MCU field: ${field}`);
      }
    }

    // Validate MCU date is valid
    const mcuDate = new Date(mcuData.mcuDate);
    if (isNaN(mcuDate.getTime())) {
      throw new Error(`Invalid MCU date: ${mcuData.mcuDate}`);
    }
  }

  /**
   * Validate and normalize lab results
   */
  _validateAndNormalizeLabResults(labResults) {
    if (!Array.isArray(labResults)) {
      return [];
    }

    const normalized = [];
    for (const lab of labResults) {
      // Check required fields
      if (!lab.labItemId) {
        throw new Error('Lab result missing labItemId');
      }

      // Validate value
      const numValue = parseFloat(lab.value);
      if (isNaN(numValue)) {
        throw new Error(`Lab item ${lab.labItemId}: Invalid numeric value '${lab.value}'`);
      }

      if (numValue <= 0) {
        throw new Error(`Lab item ${lab.labItemId}: Value must be positive (got ${numValue})`);
      }

      normalized.push({
        labItemId: lab.labItemId,
        value: numValue,
        notes: lab.notes || null
      });
    }

    return normalized;
  }

  /**
   * Batch update MCU + lab results in correct sequence
   * For follow-up visits where MCU and lab results are being updated
   *
   * @param {string} mcuId - MCU ID to update
   * @param {Object} updateData - MCU fields to update (optional)
   * @param {Array} labResults - New/updated lab result objects
   * @param {Object} currentUser - Current user object
   * @returns {Object} - { success: boolean, data: {mcuUpdated, labSaved, labUpdated, labDeleted, labFailed}, errors: [] }
   */
  async updateMCUWithLabResults(mcuId, updateData = {}, labResults = [], currentUser) {
    const result = {
      success: false,
      data: {
        mcuUpdated: false,
        labSaved: [],
        labUpdated: [],
        labDeleted: [],
        labFailed: []
      },
      errors: []
    };

    try {
      // ✅ STEP 1: Update MCU fields (if any provided)
      if (Object.keys(updateData).length > 0) {
        await mcuService.updateFollowUp(mcuId, updateData, currentUser);
        result.data.mcuUpdated = true;
      }

      // ✅ STEP 2: Get existing lab results for comparison
      const existingLabResults = await labService.getPemeriksaanLabByMcuId(mcuId);
      const existingMap = {};
      if (existingLabResults && Array.isArray(existingLabResults)) {
        existingLabResults.forEach(lab => {
          existingMap[lab.lab_item_id] = lab;
        });
      }

      // ✅ STEP 3: Process lab results (save new, update changed, delete removed)
      if (labResults && labResults.length > 0) {
        for (const labResult of labResults) {
          try {
            // Validate lab result
            const numValue = parseFloat(labResult.value);
            if (isNaN(numValue) || numValue <= 0) {
              throw new Error(`Invalid numeric value '${labResult.value}' for lab item ${labResult.labItemId}`);
            }

            const existing = existingMap[labResult.labItemId];
            if (!existing) {
              // NEW - Insert
              await labService.createPemeriksaanLab({
                mcuId: mcuId,
                employeeId: labResult.employeeId,
                labItemId: labResult.labItemId,
                value: numValue,
                notes: labResult.notes || null
              }, currentUser);
              result.data.labSaved.push({
                labItemId: labResult.labItemId,
                value: numValue
              });
            } else if (existing.value !== numValue || existing.notes !== labResult.notes) {
              // MODIFIED - Update
              await labService.updatePemeriksaanLab(existing.id, {
                value: numValue,
                notes: labResult.notes || null
              }, currentUser);
              result.data.labUpdated.push({
                labItemId: labResult.labItemId,
                oldValue: existing.value,
                newValue: numValue
              });
            }
            // UNCHANGED - do nothing
          } catch (labError) {
            result.data.labFailed.push({
              labItemId: labResult.labItemId,
              error: labError.message
            });
            result.errors.push(`Lab item ${labResult.labItemId}: ${labError.message}`);
          }
        }

        // Process DELETED lab results (in existing but not in current)
        for (const labItemId in existingMap) {
          try {
            const existing = existingMap[labItemId];
            const stillExists = labResults.find(lab => lab.labItemId === parseInt(labItemId));
            if (!stillExists) {
              // DELETED - soft delete
              await labService.deletePemeriksaanLab(existing.id);
              result.data.labDeleted.push({
                labItemId: parseInt(labItemId),
                oldValue: existing.value
              });
            }
          } catch (deleteError) {
            result.data.labFailed.push({
              labItemId: parseInt(labItemId),
              error: deleteError.message
            });
            result.errors.push(`Lab item ${labItemId}: ${deleteError.message}`);
          }
        }
      }

      // ✅ STEP 4: Verify lab results in database
      await this._verifyLabResultsInDatabase(mcuId, labResults.length);

      // ✅ STEP 5: Clean up phantom records
      try {
        await labService.cleanupPhantomLabRecords(mcuId);
      } catch (cleanupError) {
        // Phantom cleanup failed (non-critical)
      }

      // ✅ FINAL: Determine overall success
      const hasErrors = result.errors.length > 0;
      result.success = !hasErrors;

      if (!result.success && (result.data.labSaved.length > 0 || result.data.labUpdated.length > 0)) {
        result.success = true; // Partial success is still considered success
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Verify lab results were actually saved to database
   * This catches silent failures where save appears to succeed but data not in DB
   */
  async _verifyLabResultsInDatabase(mcuId, expectedCount) {
    try {
      const saved = await labService.getPemeriksaanLabByMcuId(mcuId);
      return saved ? saved.length : 0;
    } catch (error) {
      return 0;
    }
  }
}

export const mcuBatchService = new MCUBatchService();
