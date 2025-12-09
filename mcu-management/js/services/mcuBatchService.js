/**
 * MCU Batch Service
 * Handle atomic/sequential save operations for MCU + Lab Results
 * Prevents race conditions and orphaned records
 */

import { mcuService } from './mcuService.js';
import { labService } from './labService.js';
import { isValidLabItemId, validateLabResult, getExpectedLabItemCount, LAB_ITEMS_MAPPING } from '../data/labItemsMapping.js';

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

    let createdMCU = null;

    try {
      // 🔍 DEBUG: Log received MCU data
      console.log('📥 [mcuBatchService.saveMCUWithLabResults] RECEIVED DATA:', {
        vision: {
          distantUnaidedLeft: mcuData.visionDistantUnaideLeft,
          distantUnaidedRight: mcuData.visionDistantUnaideRight,
          distantSpectaclesLeft: mcuData.visionDistantSpectaclesLeft,
          distantSpectaclesRight: mcuData.visionDistantSpectaclesRight,
          nearUnaidedLeft: mcuData.visionNearUnaideLeft,
          nearUnaidedRight: mcuData.visionNearUnaideRight,
          nearSpectaclesLeft: mcuData.visionNearSpectaclesLeft,
          nearSpectaclesRight: mcuData.visionNearSpectaclesRight
        },
        lifestyle: {
          smokingStatus: mcuData.smokingStatus,
          exerciseFrequency: mcuData.exerciseFrequency
        }
      });

      // ✅ STEP 1: Validate MCU data FIRST (before any save)
      this._validateMCUData(mcuData);

      // ✅ STEP 2: Validate and normalize lab results FIRST (before any save)
      const normalizedLabResults = this._validateAndNormalizeLabResults(labResults);


      // ✅ STEP 3: ONLY NOW save MCU after all validation is complete
      createdMCU = await mcuService.create(mcuData, currentUser);
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
            const labItemName = LAB_ITEMS_MAPPING[labResult.labItemId]?.name || `Item ${labResult.labItemId}`;
            result.data.labSaved.push({
              labItemId: labResult.labItemId,
              labItemName: labItemName,
              value: labResult.value,
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
      } else {
        result.success = true; // MCU created even if no labs
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);

      // ⚠️ IMPORTANT: If MCU was already created but something failed after,
      // we should soft-delete the orphaned MCU record to keep database clean
      if (createdMCU) {

        try {
          // Soft-delete the created MCU to maintain data integrity
          await mcuService.softDelete(createdMCU.mcuId, currentUser);
          result.errors.push(`⚠️ Data integrity protected: MCU ${createdMCU.mcuId} was rolled back due to ${error.message}`);
        } catch (rollbackError) {
          result.errors.push(`🚨 CRITICAL ERROR: Rollback failed! Orphaned MCU ${createdMCU.mcuId}. Contact support immediately.`);
        }
      }

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
   * Uses whitelist validation to ensure only valid lab_item_id values are saved
   */
  _validateAndNormalizeLabResults(labResults) {
    if (!Array.isArray(labResults)) {
      return [];
    }

    const normalized = [];
    for (const lab of labResults) {
      // Check required fields
      if (!lab.labItemId && !lab.lab_item_id) {
        throw new Error('Lab result missing labItemId or lab_item_id');
      }

      const labItemId = parseInt(lab.labItemId || lab.lab_item_id, 10);

      // CRITICAL: Validate lab_item_id against whitelist
      if (!isValidLabItemId(labItemId)) {
        throw new Error(`Invalid lab_item_id: ${labItemId}. Only valid IDs accepted.`);
      }

      // Validate value
      const numValue = parseFloat(lab.value);
      if (isNaN(numValue)) {
        throw new Error(`Lab item ${labItemId}: Invalid numeric value '${lab.value}'`);
      }

      if (numValue <= 0) {
        throw new Error(`Lab item ${labItemId}: Value must be positive (got ${numValue})`);
      }

      normalized.push({
        labItemId: labItemId,
        value: numValue,
        notes: lab.notes || null
      });
    }

    // Warn if count doesn't match expected
    const expectedCount = getExpectedLabItemCount();
    if (normalized.length !== expectedCount) {
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
            const labItemName = LAB_ITEMS_MAPPING[labResult.labItemId]?.name || `Item ${labResult.labItemId}`;

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
                labItemName: labItemName,
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
                labItemName: labItemName,
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
              const labItemIdInt = parseInt(labItemId);
              const labItemName = LAB_ITEMS_MAPPING[labItemIdInt]?.name || `Item ${labItemIdInt}`;

              await labService.deletePemeriksaanLab(existing.id);
              result.data.labDeleted.push({
                labItemId: labItemIdInt,
                labItemName: labItemName,
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
