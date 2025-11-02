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
  async createJobTitle(data) {
    const jobTitle = {
      jobTitleId: generateJobTitleId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('jobTitles', jobTitle);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
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

  async updateJobTitle(id, data) {
    await database.update('jobTitles', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    cacheManager.clear(`jobTitle:${id}`);
    return await this.getJobTitleById(id);
  }

  async deleteJobTitle(id) {
    // Check if in use
    const employees = await database.query('employees', emp => emp.jobTitleId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Jabatan ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('jobTitles', id);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    cacheManager.clear(`jobTitle:${id}`);
    return true;
  }

  // Departments
  async createDepartment(data) {
    const department = {
      departmentId: generateDepartmentId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('departments', department);
    // Invalidate cache
    cacheManager.clear('departments:all');
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

  async updateDepartment(id, data) {
    await database.update('departments', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('departments:all');
    cacheManager.clear(`department:${id}`);
    return await this.getDepartmentById(id);
  }

  async deleteDepartment(id) {
    // Check if in use
    const employees = await database.query('employees', emp => emp.departmentId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Departemen ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('departments', id);
    // Invalidate cache
    cacheManager.clear('departments:all');
    cacheManager.clear(`department:${id}`);
    return true;
  }

  // Status MCU
  async createStatus(data) {
    const status = {
      statusId: generateStatusId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('statusMCU', status);
    return status;
  }

  async getAllStatus() {
    return await database.getAll('statusMCU');
  }

  async getStatusById(id) {
    return await database.get('statusMCU', id);
  }

  async updateStatus(id, data) {
    await database.update('statusMCU', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    return await this.getStatusById(id);
  }

  async deleteStatus(id) {
    await database.delete('statusMCU', id);
    return true;
  }

  // Vendors
  async createVendor(data) {
    const vendor = {
      vendorId: generateVendorId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('vendors', vendor);
    // Invalidate cache
    cacheManager.clear('vendors:all');
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

  async updateVendor(id, data) {
    await database.update('vendors', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('vendors:all');
    cacheManager.clear(`vendor:${id}`);
    return await this.getVendorById(id);
  }

  async deleteVendor(id) {
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
    return true;
  }

  // Doctors
  async createDoctor(data) {
    // CRITICAL: Pass ONLY the name string to prevent any ID field from being generated
    // This ensures:
    // - Supabase receives only { name } and auto-generates numeric ID
    // - IndexedDB receives only name and auto-generates ID separately
    const result = await database.add('doctors', data.name);
    // Invalidate cache
    cacheManager.clear('doctors:all');

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

  async updateDoctor(id, data) {
    await database.update('doctors', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    // Invalidate cache
    cacheManager.clear('doctors:all');
    cacheManager.clear(`doctor:${id}`);
    return await this.getDoctorById(id);
  }

  async deleteDoctor(id) {
    // Check if in use
    const mcuRecords = await database.query('mcu', mcu => mcu.doctor === id && !mcu.deletedAt);
    if (mcuRecords.length > 0) {
      throw new Error(`Tidak dapat menghapus. Dokter ini digunakan di ${mcuRecords.length} catatan MCU.`);
    }
    await database.delete('doctors', id);
    // Invalidate cache
    cacheManager.clear('doctors:all');
    cacheManager.clear(`doctor:${id}`);
    return true;
  }
}

export const masterDataService = new MasterDataService();
