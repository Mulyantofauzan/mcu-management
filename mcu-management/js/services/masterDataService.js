/**
 * Master Data Service
 * Handles CRUD for master data: JobTitle, Department, StatusMCU, Vendor
 * Includes in-memory caching to reduce database queries
 */

import { database } from './database.js';
import {
  generateJobTitleId,
  generateDepartmentId,
  generateStatusId,
  generateVendorId,
  generateDoctorId
} from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';
import { cacheManager } from '../utils/cacheManager.js';

class MasterDataService {
  // Job Titles
  async createJobTitle(data, currentUser) {
    const jobTitle = {
      jobTitleId: generateJobTitleId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('jobTitles', jobTitle);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('create', 'JobTitle', jobTitle.jobTitleId, currentUser.userId);
    }
    return jobTitle;
  }

  async getAllJobTitles() {
    // Check cache first
    const cached = cacheManager.get('jobTitles:all');
    if (cached) {
      console.debug('[Cache] getAllJobTitles - HIT');
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.getAll('jobTitles');
    cacheManager.set('jobTitles:all', data);
    return data;
  }

  async getJobTitleById(id) {
    // Check cache first
    const cacheKey = `jobTitle:${id}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.debug(`[Cache] getJobTitleById(${id}) - HIT`);
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.get('jobTitles', id);
    cacheManager.set(cacheKey, data);
    return data;
  }

  async updateJobTitle(id, data, currentUser) {
    await database.update('jobTitles', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    cacheManager.clear(`jobTitle:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('update', 'JobTitle', id, currentUser.userId);
    }
    return await this.getJobTitleById(id);
  }

  async deleteJobTitle(id, currentUser) {
    // Check if in use
    const employees = await database.query('employees', emp => emp.jobTitleId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Jabatan ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('jobTitles', id);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    cacheManager.clear(`jobTitle:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('delete', 'JobTitle', id, currentUser.userId);
    }
    return true;
  }

  // Departments
  async createDepartment(data, currentUser) {
    const department = {
      departmentId: generateDepartmentId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('departments', department);
    // Invalidate cache
    cacheManager.clear('departments:all');
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('create', 'Department', department.departmentId, currentUser.userId);
    }
    return department;
  }

  async getAllDepartments() {
    // Check cache first
    const cached = cacheManager.get('departments:all');
    if (cached) {
      console.debug('[Cache] getAllDepartments - HIT');
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.getAll('departments');
    cacheManager.set('departments:all', data);
    return data;
  }

  async getDepartmentById(id) {
    // Check cache first
    const cacheKey = `department:${id}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.debug(`[Cache] getDepartmentById(${id}) - HIT`);
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.get('departments', id);
    cacheManager.set(cacheKey, data);
    return data;
  }

  async updateDepartment(id, data, currentUser) {
    await database.update('departments', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('departments:all');
    cacheManager.clear(`department:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('update', 'Department', id, currentUser.userId);
    }
    return await this.getDepartmentById(id);
  }

  async deleteDepartment(id, currentUser) {
    // Check if in use
    const employees = await database.query('employees', emp => emp.departmentId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Departemen ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('departments', id);
    // Invalidate cache
    cacheManager.clear('departments:all');
    cacheManager.clear(`department:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Department', id, currentUser.userId);
    }
    return true;
  }

  // Status MCU
  async createStatus(data, currentUser) {
    const status = {
      statusId: generateStatusId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('statusMCU', status);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('create', 'Status', status.statusId, currentUser.userId);
    }
    return status;
  }

  async getAllStatus() {
    return await database.getAll('statusMCU');
  }

  async getStatusById(id) {
    return await database.get('statusMCU', id);
  }

  async updateStatus(id, data, currentUser) {
    await database.update('statusMCU', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('update', 'Status', id, currentUser.userId);
    }
    return await this.getStatusById(id);
  }

  async deleteStatus(id, currentUser) {
    await database.delete('statusMCU', id);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Status', id, currentUser.userId);
    }
    return true;
  }

  // Vendors
  async createVendor(data, currentUser) {
    const vendor = {
      vendorId: generateVendorId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('vendors', vendor);
    // Invalidate cache
    cacheManager.clear('vendors:all');
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('create', 'Vendor', vendor.vendorId, currentUser.userId);
    }
    return vendor;
  }

  async getAllVendors() {
    // Check cache first
    const cached = cacheManager.get('vendors:all');
    if (cached) {
      console.debug('[Cache] getAllVendors - HIT');
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.getAll('vendors');
    cacheManager.set('vendors:all', data);
    return data;
  }

  async getVendorById(id) {
    // Check cache first
    const cacheKey = `vendor:${id}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.debug(`[Cache] getVendorById(${id}) - HIT`);
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.get('vendors', id);
    cacheManager.set(cacheKey, data);
    return data;
  }

  async updateVendor(id, data, currentUser) {
    await database.update('vendors', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('vendors:all');
    cacheManager.clear(`vendor:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('update', 'Vendor', id, currentUser.userId);
    }
    return await this.getVendorById(id);
  }

  async deleteVendor(id, currentUser) {
    // Check if in use
    const employees = await database.query('employees', emp =>
      emp.employmentStatus === 'Vendor' && emp.vendorName === id && !emp.deletedAt
    );
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Vendor ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('vendors', id);
    // Invalidate cache
    cacheManager.clear('vendors:all');
    cacheManager.clear(`vendor:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Vendor', id, currentUser.userId);
    }
    return true;
  }

  // Doctors
  async createDoctor(data, currentUser) {
    // CRITICAL: Pass ONLY the name string to prevent any ID field from being generated
    // This ensures:
    // - Supabase receives only { name } and auto-generates numeric ID
    // - IndexedDB receives only name and auto-generates ID separately
    const result = await database.add('doctors', data.name);
    // Invalidate cache
    cacheManager.clear('doctors:all');

    // ✅ FIX: Log activity
    const doctorId = result?.id || `doctor-${Date.now()}`;
    if (currentUser?.userId) {
      await database.logActivity('create', 'Doctor', doctorId, currentUser.userId);
    }

    // Return fresh object with only name
    return {
      name: String(data.name).trim(),
      createdAt: getCurrentTimestamp()
    };
  }

  async getAllDoctors() {
    // Check cache first
    const cached = cacheManager.get('doctors:all');
    if (cached) {
      console.debug('[Cache] getAllDoctors - HIT');
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.getAll('doctors');
    cacheManager.set('doctors:all', data);
    return data;
  }

  async getDoctorById(id) {
    // Check cache first
    const cacheKey = `doctor:${id}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.debug(`[Cache] getDoctorById(${id}) - HIT`);
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.get('doctors', id);
    cacheManager.set(cacheKey, data);
    return data;
  }

  async updateDoctor(id, data, currentUser) {
    await database.update('doctors', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('doctors:all');
    cacheManager.clear(`doctor:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('update', 'Doctor', id, currentUser.userId);
    }
    return await this.getDoctorById(id);
  }

  async deleteDoctor(id, currentUser) {
    // Check if in use
    const mcuRecords = await database.query('mcus', mcu => mcu.doctor === id && !mcu.deletedAt);
    if (mcuRecords.length > 0) {
      throw new Error(`Tidak dapat menghapus. Dokter ini digunakan di ${mcuRecords.length} catatan MCU.`);
    }
    await database.delete('doctors', id);
    // Invalidate cache
    cacheManager.clear('doctors:all');
    cacheManager.clear(`doctor:${id}`);
    // ✅ FIX: Log activity
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Doctor', id, currentUser.userId);
    }
    return true;
  }
}

export const masterDataService = new MasterDataService();
