/**
 * Employee Service
 * Handles all employee-related operations
 */

import { database } from './database.js';
import { generateEmployeeId } from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';
import { deleteFileFromStorage } from './supabaseStorageService.js';

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
      let deptName = 'Not Set';
      let jobTitle = 'Not Set';

      // Fetch department name by ID
      if (employee.departmentId) {
        try {
          const depts = await database.getAll('departments');
          console.log('📋 Departments available:', depts?.length, 'Looking for ID:', employee.departmentId);

          if (depts && Array.isArray(depts)) {
            // Try to find by exact ID match (compare as strings)
            const dept = depts.find(d => {
              const deptId = String(d.id).trim();
              const empDeptId = String(employee.departmentId).trim();
              const matches = deptId === empDeptId;
              if (matches) console.log('✅ Dept match found:', d.name);
              return matches;
            });

            deptName = dept?.name || employee.departmentId;
            console.log('Department result:', deptName);
          }
        } catch (err) {
          console.error('❌ Error fetching department:', err);
          deptName = employee.departmentId;
        }
      }

      // Fetch job title name by ID
      if (employee.jobTitleId) {
        try {
          const jobs = await database.getAll('jobTitles');
          console.log('📋 Job titles available:', jobs?.length, 'Looking for ID:', employee.jobTitleId);

          if (jobs && Array.isArray(jobs)) {
            // Try to find by exact ID match (compare as strings)
            const job = jobs.find(j => {
              const jobId = String(j.id).trim();
              const empJobId = String(employee.jobTitleId).trim();
              const matches = jobId === empJobId;
              if (matches) console.log('✅ Job match found:', j.name);
              return matches;
            });

            jobTitle = job?.name || employee.jobTitleId;
            console.log('Job title result:', jobTitle);
          }
        } catch (err) {
          console.error('❌ Error fetching job title:', err);
          jobTitle = employee.jobTitleId;
        }
      }

      const details = [
        `Created employee: ${employee.name}`,
        `Employee ID: ${employee.employeeId}`,
        `Department: ${deptName}`,
        `Job Title: ${jobTitle}`,
        `Employment Status: ${employee.employmentStatus}`,
        `Date of Birth: ${employee.birthDate}`,
        `Blood Type: ${employee.bloodType || 'Not Set'}`
      ].join('. ');

      console.log('📝 Activity log:', details);
      await database.logActivity('create', 'Employee', employee.employeeId, currentUser.userId, details);
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
    let failedDeletions = [];

    for (const mcu of mcus) {
      // ✅ CASCADE DELETE: Delete all associated MCU files (database + storage)
      const mcuFiles = await database.query('mcufiles', file => file.mcuId === mcu.mcuId);
      for (const file of mcuFiles) {
        try {
          // Delete from Supabase storage using storage path
          if (file.storage_path || file.storagePath) {
            const storagePath = file.storage_path || file.storagePath;
            const deleteResult = await deleteFileFromStorage(storagePath);
            if (!deleteResult.success) {
              failedDeletions.push(`${file.filename}: ${deleteResult.error}`);
            }
          }

          // Hard delete file record from database
          await database.hardDelete('mcufiles', file.fileid || file.id);
          totalFilesDeleted++;

          // Log file deletion
          if (currentUser?.userId) {
            await database.logActivity('delete', 'File', file.fileid || file.id, currentUser.userId,
              `File permanently deleted from storage and database (cascade from employee hard delete): ${file.filename}`);
          }
        } catch (err) {
          console.warn(`Error deleting file ${file.filename}: ${err.message}`);
          failedDeletions.push(`${file.filename}: ${err.message}`);
        }
      }

      // Delete associated lab results
      try {
        const labResults = await database.query('pemeriksaan_lab', lab => lab.mcu_id === mcu.mcuId);
        for (const lab of labResults) {
          await database.hardDelete('pemeriksaan_lab', lab.id);
        }
      } catch (err) {
        console.warn(`Error deleting lab results for MCU ${mcu.mcuId}: ${err.message}`);
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
      const failureNote = failedDeletions.length > 0 ? ` (${failedDeletions.length} file deletion(s) failed)` : '';
      await database.logActivity('delete', 'Employee', employeeId, currentUser.userId,
        `Employee permanently deleted: ${employeeName} (${employeeId}). Cascade deleted: ${mcus.length} MCU record(s), ${totalFilesDeleted} file(s) from storage.${failureNote}`);
    }

    return {
      success: failedDeletions.length === 0,
      totalFilesDeleted,
      failedDeletions,
      message: failedDeletions.length > 0
        ? `Deleted ${totalFilesDeleted} files, but ${failedDeletions.length} failed`
        : `Successfully deleted ${totalFilesDeleted} files`
    };
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
