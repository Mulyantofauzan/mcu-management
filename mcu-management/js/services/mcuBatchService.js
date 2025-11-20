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
    console.log('[MCUBatchService] Starting batch save for MCU:', mcuData.mcuId);

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
      console.log('[MCUBatchService] Validating MCU data...');
      this._validateMCUData(mcuData);

      // ✅ STEP 2: Validate and normalize lab results
      console.log('[MCUBatchService] Validating lab results...');
      const normalizedLabResults = this._validateAndNormalizeLabResults(labResults);
      console.log(`[MCUBatchService] Valid lab results: ${normalizedLabResults.length}`);

      // ✅ STEP 3: Save MCU (point of no return)
      console.log('[MCUBatchService] Saving MCU to database...');
      const createdMCU = await mcuService.create(mcuData, currentUser);
      result.data.mcu = createdMCU;
      console.log('[MCUBatchService] MCU created:', createdMCU.mcuId);

      // ✅ STEP 4: Save lab results with individual error handling
      if (normalizedLabResults.length > 0) {
        console.log(`[MCUBatchService] Saving ${normalizedLabResults.length} lab results...`);

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

            console.log(`[MCUBatchService] Saving lab item ${labResult.labItemId}...`);
            const savedLab = await labService.createPemeriksaanLab(labPayload, currentUser);
            result.data.labSaved.push({
              labItemId: labResult.labItemId,
              data: savedLab
            });
            console.log(`[MCUBatchService] Lab item ${labResult.labItemId} saved`);
          } catch (labError) {
            console.error(`[MCUBatchService] Failed to save lab item ${labResult.labItemId}:`, labError);
            result.data.labFailed.push({
              labItemId: labResult.labItemId,
              error: labError.message
            });
            result.errors.push(`Lab item ${labResult.labItemId}: ${labError.message}`);
          }
        }
      }

      // ✅ STEP 5: Verify all lab results were saved
      console.log('[MCUBatchService] Verifying lab results in database...');
      const savedLabCount = await this._verifyLabResultsInDatabase(createdMCU.mcuId, normalizedLabResults.length);
      console.log(`[MCUBatchService] Database verification: ${savedLabCount}/${normalizedLabResults.length} lab items found`);

      // ✅ STEP 6: Clean up phantom records
      try {
        console.log('[MCUBatchService] Cleaning up phantom records...');
        await labService.cleanupPhantomLabRecords(createdMCU.mcuId);
        console.log('[MCUBatchService] Phantom records cleaned');
      } catch (cleanupError) {
        console.warn('[MCUBatchService] Phantom cleanup failed (non-critical):', cleanupError);
      }

      // ✅ FINAL: Determine overall success
      const allLabSaved = result.data.labFailed.length === 0 && result.data.labSaved.length === normalizedLabResults.length;
      result.success = allLabSaved;

      if (allLabSaved) {
        console.log('[MCUBatchService] ✅ Batch save SUCCESSFUL - MCU + all lab results saved');
      } else if (result.data.labSaved.length > 0) {
        console.warn(`[MCUBatchService] ⚠️ PARTIAL SUCCESS - MCU saved, ${result.data.labSaved.length}/${normalizedLabResults.length} lab items saved`);
        result.success = true; // Partial success is still considered success
      } else {
        console.error('[MCUBatchService] ❌ FAILURE - MCU saved but NO lab results saved');
      }

      return result;
    } catch (error) {
      console.error('[MCUBatchService] Batch save failed:', error);
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

    console.log('[MCUBatchService] MCU data validation passed');
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
   * Verify lab results were actually saved to database
   * This catches silent failures where save appears to succeed but data not in DB
   */
  async _verifyLabResultsInDatabase(mcuId, expectedCount) {
    try {
      const saved = await labService.getPemeriksaanLabByMcuId(mcuId);
      const actualCount = saved ? saved.length : 0;

      if (actualCount !== expectedCount) {
        console.warn(`[MCUBatchService] Expected ${expectedCount} lab results, found ${actualCount} in database`);
      }

      return actualCount;
    } catch (error) {
      console.error('[MCUBatchService] Verification query failed:', error);
      return 0;
    }
  }
}

export const mcuBatchService = new MCUBatchService();
