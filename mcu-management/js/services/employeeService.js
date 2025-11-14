/**
 * Employee Service
 * Handles all employee-related operations
 */

import { database } from './database.js';
import { generateEmployeeId } from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';

class EmployeeService {
  async create(employeeData, currentUser = null) {
    const employee = {
      employeeId: generateEmployeeId(),
      name: employeeData.name,
      jenisKelamin: employeeData.jenisKelamin || 'Laki-laki',
      jobTitleId: employeeData.jobTitleId,
      departmentId: employeeData.departmentId,
      birthDate: employeeData.birthDate,
      employmentStatus: employeeData.employmentStatus || 'Karyawan PST',
      vendorName: employeeData.vendorName || null,
      activeStatus: employeeData.activeStatus || 'Active',
      inactiveReason: employeeData.inactiveReason || null,
      bloodType: employeeData.bloodType,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      deletedAt: null
    };

    await database.add('employees', employee);

    // Log activity with details - fetch department and job title names
    if (currentUser) {
      let deptName = 'Unknown';
      let jobName = 'Unknown';

      // Fetch department name by ID
      if (employee.departmentId) {
        const dept = await database.get('departments', employee.departmentId);
        deptName = dept?.name || 'Unknown';
      }

      // Fetch job title name by ID
      if (employee.jobTitleId) {
        const job = await database.get('jobTitles', employee.jobTitleId);
        jobName = job?.name || 'Unknown';
      }

      await database.logActivity('create', 'Employee', employee.employeeId, currentUser.userId,
        `Created employee: ${employee.name} (${employee.employeeId}). Department: ${deptName}, Job Title: ${jobName}`);
    }

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
    return await database.getAll('employees', true);
  }

  async getDeleted() {
    const employees = await database.getAll('employees', true);
    return employees.filter(emp => emp.deletedAt !== null);
  }

  async update(employeeId, updates) {
    const updateData = {
      ...updates,
      updatedAt: getCurrentTimestamp()
    };

    await database.update('employees', employeeId, updateData);

    // Log activity with details
    const currentUser = window.authService?.getCurrentUser();
    if (currentUser?.userId) {
      const employee = await this.getById(employeeId);
      const updatedFields = Object.keys(updates).join(', ');
      await database.logActivity('update', 'Employee', employeeId, currentUser.userId,
        `Updated employee ${employee?.name} (${employeeId}). Fields: ${updatedFields}`);
    }

    return await this.getById(employeeId);
  }

  async softDelete(employeeId) {
    // Get employee name before deletion for audit trail
    const employee = await this.getById(employeeId);
    const employeeName = employee?.name || 'Unknown';

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

    // Log activity with details
    const currentUser = window.authService?.getCurrentUser();
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Employee', employeeId, currentUser.userId,
        `Moved to trash: ${employeeName} (${employeeId}). Associated ${mcus.length} MCU records also moved.`);
    }

    return true;
  }

  async restore(employeeId) {
    // Get employee name for audit trail
    const employee = await this.getById(employeeId);
    const employeeName = employee?.name || 'Unknown';

    // Restore employee
    await database.update('employees', employeeId, {
      deletedAt: null,
      updatedAt: getCurrentTimestamp()
    });

    // Restore all associated MCU records (cascade restore)
    // IMPORTANT: Must include deleted records to restore them
    const allMCUs = await database.getAll('mcus', true); // true = includeDeleted
    const deletedMCUs = allMCUs.filter(mcu => mcu.employeeId === employeeId && mcu.deletedAt);

    for (const mcu of deletedMCUs) {
      await database.update('mcus', mcu.mcuId, {
        deletedAt: null,
        updatedAt: getCurrentTimestamp()
      });
    }

    // Log activity with details
    const currentUser = window.authService?.getCurrentUser();
    if (currentUser?.userId) {
      await database.logActivity('update', 'Employee', employeeId, currentUser.userId,
        `Restored from trash: ${employeeName} (${employeeId}). Associated ${deletedMCUs.length} MCU records also restored.`);
    }

    return true;
  }

  async permanentDelete(employeeId, currentUser) {
    // Get employee info for audit detail
    const employee = await this.getById(employeeId);
    const employeeName = employee?.name || 'Unknown';

    // Delete all associated MCU records (hard delete)
    const mcus = await database.query('mcus', mcu => mcu.employeeId === employeeId);
    let totalFilesDeleted = 0;

    for (const mcu of mcus) {
      // ✅ CASCADE DELETE: Delete all associated MCU files (database + storage)
      const mcuFiles = await database.query('mcufiles', file => file.mcuId === mcu.mcuId);
      for (const file of mcuFiles) {
        try {
          // Hard delete file from both R2 storage AND database via API
          const hardDeleteResponse = await fetch(`/api/hard-delete-file?fileId=${encodeURIComponent(file.fileid || file.id)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!hardDeleteResponse.ok) {
            const errorData = await hardDeleteResponse.json().catch(() => ({}));
            console.warn(`Failed to hard delete file: ${file.filename}`);
          }
        } catch (err) {
          console.warn(`Error hard deleting file: ${err.message}`);
        }

        totalFilesDeleted++;

        // Log file deletion
        if (currentUser?.userId) {
          await database.logActivity('delete', 'File', file.fileid || file.id, currentUser.userId,
            `File permanently deleted (cascade from employee hard delete): ${file.filename}`);
        }
      }

      // Delete associated change records
      const changes = await database.query('mcuChanges', change => change.mcuId === mcu.mcuId);
      for (const change of changes) {
        await database.hardDelete('mcuChanges', change.changeId || change.id);
      }

      // Hard delete MCU
      await database.hardDelete('mcus', mcu.mcuId);

      // ✅ FIX: Log each MCU deletion
      if (currentUser?.userId) {
        await database.logActivity('delete', 'MCU', mcu.mcuId, currentUser.userId,
          `MCU deleted (cascade from employee delete): ${mcu.mcuId}. Associated ${mcuFiles.length} file(s) also deleted.`);
      }
    }

    // Hard delete employee
    await database.hardDelete('employees', employeeId);

    // ✅ FIX: Log employee deletion with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Employee', employeeId, currentUser.userId,
        `Employee permanently deleted: ${employeeName} (${employeeId}). Cascade deleted: ${mcus.length} MCU record(s), ${totalFilesDeleted} file(s).`);
    }

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
