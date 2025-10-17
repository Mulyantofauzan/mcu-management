/**
 * Employee Service
 * Handles all employee-related operations
 */

import { database } from './database.js';
import { generateEmployeeId } from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';

class EmployeeService {
  async create(employeeData) {
    const employee = {
      employeeId: generateEmployeeId(),
      name: employeeData.name,
      jobTitleId: employeeData.jobTitleId,
      departmentId: employeeData.departmentId,
      birthDate: employeeData.birthDate,
      employmentStatus: employeeData.employmentStatus || 'Company',
      vendorName: employeeData.vendorName || null,
      activeStatus: employeeData.activeStatus || 'Active',
      inactiveReason: employeeData.inactiveReason || null,
      bloodType: employeeData.bloodType,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      deletedAt: null
    };

    await database.add('employees', employee);
    return employee;
  }

  async getById(employeeId) {
    return await database.get('employees', employeeId);
  }

  async getAll() {
    const employees = await database.getAll('employees');
    return employees.filter(emp => !emp.deletedAt);
  }

  async getAllIncludingDeleted() {
    return await database.getAll('employees');
  }

  async getDeleted() {
    const employees = await database.getAll('employees');
    return employees.filter(emp => emp.deletedAt !== null);
  }

  async update(employeeId, updates) {
    const updateData = {
      ...updates,
      updatedAt: getCurrentTimestamp()
    };

    await database.update('employees', employeeId, updateData);
    return await this.getById(employeeId);
  }

  async softDelete(employeeId) {
    await database.update('employees', employeeId, {
      deletedAt: getCurrentTimestamp()
    });

    // Also soft delete all associated MCU records
    const mcus = await database.query('mcus', mcu => mcu.employeeId === employeeId && !mcu.deletedAt);
    for (const mcu of mcus) {
      await database.update('mcus', mcu.mcuId, {
        deletedAt: getCurrentTimestamp()
      });
    }

    return true;
  }

  async restore(employeeId) {
    // Restore employee
    await database.update('employees', employeeId, {
      deletedAt: null,
      updatedAt: getCurrentTimestamp()
    });

    // Restore all associated MCU records (cascade restore)
    const mcus = await database.query('mcus', mcu => mcu.employeeId === employeeId && mcu.deletedAt);
    for (const mcu of mcus) {
      await database.update('mcus', mcu.mcuId, {
        deletedAt: null,
        updatedAt: getCurrentTimestamp()
      });
    }

    return true;
  }

  async permanentDelete(employeeId) {
    // Delete all associated MCU records
    const mcus = await database.query('mcus', mcu => mcu.employeeId === employeeId);
    for (const mcu of mcus) {
      await database.delete('mcus', mcu.mcuId);

      // Delete associated change records
      const changes = await database.query('mcuChanges', change => change.mcuId === mcu.mcuId);
      for (const change of changes) {
        await database.delete('mcuChanges', change.changeId);
      }
    }

    // Delete employee
    await database.delete('employees', employeeId);
    return true;
  }

  async search(searchTerm) {
    const employees = await this.getAll();
    const term = searchTerm.toLowerCase();

    return employees.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.employeeId.toLowerCase().includes(term)
    );
  }

  async getByDepartment(departmentId) {
    const employees = await this.getAll();
    return employees.filter(emp => emp.departmentId === departmentId);
  }

  async getByJobTitle(jobTitleId) {
    const employees = await this.getAll();
    return employees.filter(emp => emp.jobTitleId === jobTitleId);
  }

  async getActive() {
    const employees = await this.getAll();
    return employees.filter(emp => emp.activeStatus === 'Active');
  }

  async getInactive() {
    const employees = await this.getAll();
    return employees.filter(emp => emp.activeStatus === 'Inactive');
  }
}

export const employeeService = new EmployeeService();
