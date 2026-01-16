/**
 * MCU Service
 * Handles all MCU record operations
 */

import { database } from './database.js';
import { generateMCUId } from '../utils/idGenerator.js';
import { getCurrentTimestamp, calculateAge } from '../utils/dateHelpers.js';
import { diffAndSaveHistory, createInitialChangeEntry } from '../utils/diffHelpers.js';

class MCUService {
  async create(mcuData, currentUser) {
    // Calculate age at MCU
    const employee = await database.get('employees', mcuData.employeeId);
    const ageAtMCU = calculateAge(employee.birthDate, mcuData.mcuDate);

    const mcu = {
      // Use pre-generated ID if provided (for file uploads), otherwise generate new one
      mcuId: mcuData.mcuId || generateMCUId(),
      employeeId: mcuData.employeeId,
      mcuType: mcuData.mcuType,
      mcuDate: mcuData.mcuDate,
      ageAtMCU: ageAtMCU,

      // Examination fields (MUST be camelCase - databaseAdapter will map to snake_case)
      bmi: mcuData.bmi || null,
      bloodPressure: mcuData.bloodPressure || null,
      respiratoryRate: mcuData.respiratoryRate || null,
      pulse: mcuData.pulse || null,
      temperature: mcuData.temperature || null,
      chestCircumference: mcuData.chestCircumference || null,
      // 8-field vision structure (MUST be camelCase - databaseAdapter will map to snake_case)
      visionDistantUnaideLeft: mcuData.visionDistantUnaideLeft || null,
      visionDistantUnaideRight: mcuData.visionDistantUnaideRight || null,
      visionDistantSpectaclesLeft: mcuData.visionDistantSpectaclesLeft || null,
      visionDistantSpectaclesRight: mcuData.visionDistantSpectaclesRight || null,
      visionNearUnaideLeft: mcuData.visionNearUnaideLeft || null,
      visionNearUnaideRight: mcuData.visionNearUnaideRight || null,
      visionNearSpectaclesLeft: mcuData.visionNearSpectaclesLeft || null,
      visionNearSpectaclesRight: mcuData.visionNearSpectaclesRight || null,
      audiometry: mcuData.audiometry || null,
      spirometry: mcuData.spirometry || null,
      xray: mcuData.xray || null,
      ekg: mcuData.ekg || null,
      treadmill: mcuData.treadmill || null,
      hbsag: mcuData.hbsag || null,
      napza: mcuData.napza || null,
      colorblind: mcuData.colorblind || null,

      // Lifestyle fields (MUST be camelCase - databaseAdapter will map to snake_case)
      smokingStatus: mcuData.smokingStatus || null,
      exerciseFrequency: mcuData.exerciseFrequency || null,

      // Rujukan fields (MUST be camelCase - databaseAdapter will map to snake_case)
      doctor: mcuData.doctor || null,
      recipient: mcuData.recipient || null,
      keluhanUtama: mcuData.keluhanUtama || null,
      diagnosisKerja: mcuData.diagnosisKerja || null,
      alasanRujuk: mcuData.alasanRujuk || null,

      // Results (MUST be camelCase)
      initialResult: mcuData.initialResult,
      initialNotes: mcuData.initialNotes || '',
      finalResult: null,
      finalNotes: null,
      status: mcuData.initialResult, // Initial status same as initial result

      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      // Note: lastUpdatedTimestamp removed - use updatedAt instead (Supabase standard)
      deletedAt: null
    };

    await database.add('mcus', mcu);

    // Create initial change entry
    const initialChange = createInitialChangeEntry('mcu', mcu.mcuId, currentUser);
    await database.add('mcuChanges', initialChange);

    // Log activity with details including employee name
    if (currentUser) {
      const employeeName = employee?.name || 'Unknown';
      await database.logActivity('create', 'MCU', mcu.mcuId, currentUser.userId,
        `${mcu.mcuId}. Type: ${mcu.mcuType}, Date: ${mcu.mcuDate}, Employee: ${employeeName}`);
    }

    return mcu;
  }

  async getById(mcuId) {
    return await database.get('mcus', mcuId);
  }

  async getAll() {
    const mcus = await database.getAll('mcus');
    return mcus.filter(mcu => !mcu.deletedAt);
  }

  // ✅ FIX: Load only LATEST MCU per active employee (for dashboard KPIs)
  async getActive() {
    const mcus = await this.getAll();
    const activeEmployees = await database.query('employees',
      emp => !emp.deletedAt && emp.activeStatus === 'Active'
    );
    const activeIds = new Set(activeEmployees.map(e => e.employeeId));

    // Filter MCUs for active employees
    const activeMCUs = mcus.filter(mcu => activeIds.has(mcu.employeeId));

    // Get only the LATEST MCU per employee
    const latestMCUMap = new Map();
    activeMCUs.forEach(mcu => {
      const existing = latestMCUMap.get(mcu.employeeId);
      if (!existing || new Date(mcu.mcuDate) > new Date(existing.mcuDate)) {
        latestMCUMap.set(mcu.employeeId, mcu);
      }
    });

    return Array.from(latestMCUMap.values());
  }

  // ✅ FIX: Load only deleted MCUs (for trash/deleted page)
  async getDeleted() {
    const allMcus = await database.getAll('mcus', true); // Include deleted
    return allMcus.filter(mcu => mcu.deletedAt);
  }

  // ✅ FIX: Load all MCUs including deleted (for admin views)
  async getAllIncludingDeleted() {
    return await database.getAll('mcus', true);
  }

  async getByEmployee(employeeId) {
    const mcus = await this.getAll();
    return mcus.filter(mcu => mcu.employeeId === employeeId)
      .sort((a, b) => new Date(b.mcuDate) - new Date(a.mcuDate));
  }

  async getLatestByEmployee(employeeId) {
    const mcus = await this.getByEmployee(employeeId);
    if (mcus.length === 0) return null;

    // Sort by mcuDate desc, then by updatedAt desc (fallback to lastUpdatedTimestamp for backward compat)
    mcus.sort((a, b) => {
      const dateCompare = new Date(b.mcuDate) - new Date(a.mcuDate);
      if (dateCompare !== 0) return dateCompare;
      const timestampA = a.lastUpdatedTimestamp || a.updatedAt;
      const timestampB = b.lastUpdatedTimestamp || b.updatedAt;
      return new Date(timestampB) - new Date(timestampA);
    });

    return mcus[0];
  }

  /**
   * Get latest MCU for each employee
   * Critical for dashboard calculations
   */
  async getLatestMCUPerEmployee() {
    const mcus = await this.getAll();
    const employees = await database.query('employees', emp => !emp.deletedAt);

    const latestMap = new Map();

    for (const employee of employees) {
      const employeeMCUs = mcus.filter(mcu => mcu.employeeId === employee.employeeId);

      if (employeeMCUs.length > 0) {
        // Sort by mcuDate desc, then by updatedAt desc (fallback to lastUpdatedTimestamp for backward compat)
        employeeMCUs.sort((a, b) => {
          const dateCompare = new Date(b.mcuDate) - new Date(a.mcuDate);
          if (dateCompare !== 0) return dateCompare;
          const timestampA = a.lastUpdatedTimestamp || a.updatedAt;
          const timestampB = b.lastUpdatedTimestamp || b.updatedAt;
          return new Date(timestampB) - new Date(timestampA);
        });

        latestMap.set(employee.employeeId, employeeMCUs[0]);
      }
    }

    return Array.from(latestMap.values());
  }

  async update(mcuId, updates, currentUser) {
    // Get original MCU for diff
    const oldMCU = await this.getById(mcuId);

    const updateData = {
      ...updates,
      updatedAt: getCurrentTimestamp()
      // Note: lastUpdatedTimestamp removed - use updatedAt instead (Supabase standard)
    };

    await database.update('mcus', mcuId, updateData);

    // Get updated MCU
    const newMCU = await this.getById(mcuId);

    // Create change history (only for changed fields)
    const changes = diffAndSaveHistory(oldMCU, newMCU, currentUser, mcuId);
    for (const change of changes) {
      await database.add('mcuChanges', change);
    }

    // ✅ FIX: Log activity for MCU update with details
    if (currentUser) {
      const changedFields = Object.keys(updates).join(', ');
      const employeeName = newMCU?.employeeId ? await database.get('employees', newMCU.employeeId).then(e => e?.name || 'Unknown') : 'Unknown';
      await database.logActivity('update', 'MCU', mcuId, currentUser.userId,
        `MCU: ${mcuId}., Employee: ${employeeName}. Fields: ${changedFields}`);
    }

    return newMCU;
  }

  /**
   * Update follow-up
   * IMPORTANT: Does NOT create new MCU, updates existing one
   */
  async updateFollowUp(mcuId, followUpData, currentUser) {
    const oldMCU = await this.getById(mcuId);

    // Prepare update data - only update final fields, preserve initial fields
    const updateData = {
      updatedAt: getCurrentTimestamp()
      // Note: lastUpdatedTimestamp removed - use updatedAt instead (Supabase standard)
    };

    // Only update finalResult and status if provided
    if (followUpData.finalResult !== undefined) {
      updateData.finalResult = followUpData.finalResult;
      updateData.status = followUpData.finalResult; // Status follows final result
    }

    // Only update finalNotes if provided
    if (followUpData.finalNotes !== undefined) {
      updateData.finalNotes = followUpData.finalNotes;
    }

    // Also update examination fields if provided
    // IMPORTANT: updateData must use camelCase keys - databaseAdapter will handle mapping to snake_case
    const supportedFields = [
      // Date and type
      'mcuDate',
      'mcuType',

      // Vital signs
      'bmi',
      'bloodPressure',
      'respiratoryRate',
      'pulse',
      'temperature',
      'chestCircumference',

      // Vision fields (8-field structure)
      'visionDistantUnaideLeft',
      'visionDistantUnaideRight',
      'visionDistantSpectaclesLeft',
      'visionDistantSpectaclesRight',
      'visionNearUnaideLeft',
      'visionNearUnaideRight',
      'visionNearSpectaclesLeft',
      'visionNearSpectaclesRight',

      // Other exams
      'audiometry',
      'spirometry',
      'xray',
      'ekg',
      'treadmill',
      'hbsag',
      'sgot',
      'sgpt',
      'cbc',
      'napza',
      'colorblind',

      // Lifestyle fields
      'smokingStatus',
      'exerciseFrequency',

      // Rujukan fields
      'doctor',
      'recipient',
      'keluhanUtama',
      'diagnosisKerja',
      'alasanRujuk',

      // Initial result fields
      'initialResult',
      'initialNotes'
    ];

    // Process all supported fields - pass camelCase keys to databaseAdapter
    supportedFields.forEach(field => {
      const dataValue = followUpData[field];

      if (dataValue !== undefined) {
        updateData[field] = dataValue;
      }
    });

    await database.update('mcus', mcuId, updateData);

    // Get updated MCU
    const newMCU = await this.getById(mcuId);

    // Create change history for changed fields only
    const changes = diffAndSaveHistory(oldMCU, newMCU, currentUser, mcuId);
    for (const change of changes) {
      await database.add('mcuChanges', change);
    }

    // Log activity - use 'update' action for follow-up updates (CRUD standard) with details
    if (currentUser) {
      const changedFields = Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ');
      const employeeName = newMCU?.employeeId ? await database.get('employees', newMCU.employeeId).then(e => e?.name || 'Unknown') : 'Unknown';
      await database.logActivity('update', 'MCU', mcuId, currentUser.userId,
        `Updated MCU follow-up: ${mcuId}. Employee: ${employeeName}. Fields: ${changedFields || 'none'}`);
    }

    return newMCU;
  }

  async softDelete(mcuId, currentUser) {
    // Get MCU info before soft delete for audit trail
    const mcu = await this.getById(mcuId);

    if (!mcu) {
      throw new Error(`MCU not found: ${mcuId}`);
    }


    // Update with deleted timestamp
    const updateResult = await database.update('mcus', mcuId, {
      deletedAt: getCurrentTimestamp()
    });


    // Verify update was successful by fetching the updated MCU
    const updatedMCU = await this.getById(mcuId);

    if (!updatedMCU?.deletedAt) {
      throw new Error(`Failed to soft delete MCU: deletedAt timestamp not set`);
    }

    // ✅ FIX: Log activity for MCU soft delete with details
    if (currentUser) {
      const employeeId = mcu?.employeeId;
      const employee = employeeId ? await database.get('employees', employeeId) : null;
      const employeeName = employee?.name || 'Unknown';
      await database.logActivity('delete', 'MCU', mcuId, currentUser.userId,
        `Moved MCU to trash: ${mcuId}. Date: ${mcu?.mcuDate}, Employee: ${employeeName}`);
    }

    return true;
  }

  async restore(mcuId) {
    await database.update('mcus', mcuId, {
      deletedAt: null,
      updatedAt: getCurrentTimestamp()
    });
    return true;
  }

  async permanentDelete(mcuId, currentUser) {
    // Get MCU info before permanent delete for audit trail
    const mcu = await this.getById(mcuId);

    if (!mcu) {
      throw new Error(`MCU not found: ${mcuId}`);
    }

    let filesDeleted = 0;
    let labResultsDeleted = 0;
    let changesDeleted = 0;

    // ✅ CASCADE DELETE 1: Delete all MCU files (database records ONLY - R2 cleanup optional)
    try {
      const allMCUFiles = await database.getAll('mcufiles', true);
      const mcuFiles = allMCUFiles.filter(file =>
        (file.mcu_id === mcuId) || (file.mcuId === mcuId) || (file.mcuid === mcuId)
      );

      if (mcuFiles && mcuFiles.length > 0) {
        for (const file of mcuFiles) {
          const fileId = file.fileid || file.id;
          try {
            await database.hardDelete('mcufiles', fileId);
            filesDeleted++;
          } catch (err) {
          }
        }
      }
    } catch (err) {
    }

    // ✅ CASCADE DELETE 2: Delete all lab results
    try {
      const allLabResults = await database.getAll('pemeriksaan_lab', true);
      const labResults = allLabResults.filter(lab =>
        (lab.mcu_id === mcuId) || (lab.mcuId === mcuId)
      );

      if (labResults && labResults.length > 0) {
        for (const lab of labResults) {
          try {
            await database.hardDelete('pemeriksaan_lab', lab.id);
            labResultsDeleted++;
          } catch (err) {
          }
        }
      }
    } catch (err) {
    }

    // ✅ CASCADE DELETE 3: Delete all change records
    try {
      const allChanges = await database.getAll('mcuChanges', true);
      const changes = allChanges.filter(change => change.mcuId === mcuId);

      if (changes && changes.length > 0) {
        for (const change of changes) {
          try {
            await database.hardDelete('mcuChanges', change.id);
            changesDeleted++;
          } catch (err) {
          }
        }
      }
    } catch (err) {
    }

    // ✅ DELETE MCU RECORD
    await database.hardDelete('mcus', mcuId);

    // ✅ FIX: Log activity for MCU permanent delete with CASCADE delete details
    if (currentUser) {
      const employeeId = mcu?.employeeId;
      const employee = employeeId ? await database.get('employees', employeeId) : null;
      const employeeName = employee?.name || 'Unknown';
      await database.logActivity('delete', 'MCU', mcuId, currentUser.userId,
        `Permanently deleted MCU: ${mcuId}. Date: ${mcu?.mcuDate}, Employee: ${employeeName}. Cascade deleted: ${filesDeleted} file(s), ${labResultsDeleted} lab result(s), ${changesDeleted} change record(s)`);
    }

    return true;
  }

  async getChangeHistory(mcuId) {
    // Use direct getByMcuId for better performance instead of fetching all 1000+ records
    const adp = await import('../services/databaseAdapter.js').then(m => ({
      MCUChanges: m.MCUChanges
    }));
    const changes = await adp.MCUChanges.getByMcuId(mcuId);
    return changes ? changes.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)) : [];
  }

  async getFollowUpList() {
    const latestMCUs = await this.getLatestMCUPerEmployee();
    // Return MCUs that need follow-up examination
    // Exclude MCUs that already have a final result other than "Follow-Up"
    return latestMCUs.filter(mcu => {
      // Check if initialResult is Follow-Up
      const needsFollowUp = mcu.initialResult === 'Follow-Up';

      if (!needsFollowUp) return false;

      // If no final result yet, definitely include in follow-up list
      if (!mcu.finalResult) {
        return true;
      }

      // If final result is also Follow-Up, still needs follow-up
      if (mcu.finalResult === 'Follow-Up') {
        return true;
      }

      // If final result is something other than Follow-Up (e.g., Fit), exclude it
      return false;
    });
  }

  async getByDateRange(startDate, endDate) {
    const mcus = await this.getAll();
    return mcus.filter(mcu => {
      const mcuDate = new Date(mcu.mcuDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return mcuDate >= start && mcuDate <= end;
    });
  }

  async getByType(mcuType) {
    const mcus = await this.getAll();
    return mcus.filter(mcu => mcu.mcuType === mcuType);
  }

  async getByStatus(status) {
    const mcus = await this.getAll();
    return mcus.filter(mcu => mcu.status === status);
  }
}

export const mcuService = new MCUService();
