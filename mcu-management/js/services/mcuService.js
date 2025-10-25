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
      mcuId: generateMCUId(),
      employeeId: mcuData.employeeId,
      mcuType: mcuData.mcuType,
      mcuDate: mcuData.mcuDate,
      ageAtMCU: ageAtMCU,

      // Examination fields
      bmi: mcuData.bmi || null,
      bloodPressure: mcuData.bloodPressure || null,
      vision: mcuData.vision || null,
      audiometry: mcuData.audiometry || null,
      spirometry: mcuData.spirometry || null,
      xray: mcuData.xray || null,
      ekg: mcuData.ekg || null,
      treadmill: mcuData.treadmill || null,
      kidneyLiverFunction: mcuData.kidneyLiverFunction || null,
      hbsag: mcuData.hbsag || null,
      sgot: mcuData.sgot || null,
      sgpt: mcuData.sgpt || null,
      cbc: mcuData.cbc || null,
      napza: mcuData.napza || null,

      // Results
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

    // Log activity
    if (currentUser) {
      await database.logActivity('create', 'MCU', mcu.mcuId, currentUser.userId);
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
    const examFields = [
      'bmi', 'bloodPressure', 'vision', 'audiometry', 'spirometry',
      'xray', 'ekg', 'treadmill', 'kidneyLiverFunction', 'hbsag',
      'sgot', 'sgpt', 'cbc', 'napza'
    ];

    examFields.forEach(field => {
      if (followUpData[field] !== undefined) {
        updateData[field] = followUpData[field];
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

    // Log activity
    if (currentUser) {
      await database.logActivity('update', 'MCU', mcuId, currentUser.userId);
    }

    return newMCU;
  }

  async softDelete(mcuId) {
    await database.update('mcus', mcuId, {
      deletedAt: getCurrentTimestamp()
    });
    return true;
  }

  async restore(mcuId) {
    await database.update('mcus', mcuId, {
      deletedAt: null,
      updatedAt: getCurrentTimestamp()
    });
    return true;
  }

  async permanentDelete(mcuId) {
    // Delete all change records
    const changes = await database.query('mcuChanges', change => change.mcuId === mcuId);
    for (const change of changes) {
      await database.delete('mcuChanges', change.changeId);
    }

    // Delete MCU
    await database.delete('mcus', mcuId);
    return true;
  }

  async getChangeHistory(mcuId) {
    const changes = await database.query('mcuChanges', change => change.mcuId === mcuId);
    return changes.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  }

  async getFollowUpList() {
    const latestMCUs = await this.getLatestMCUPerEmployee();
    // Return only those with status Follow-Up and final result not Fit
    return latestMCUs.filter(mcu =>
      mcu.status === 'Follow-Up' &&
      (mcu.finalResult !== 'Fit' || mcu.finalResult === null)
    );
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
