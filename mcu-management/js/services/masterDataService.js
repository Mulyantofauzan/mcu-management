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
      risk_level: data.riskLevel || 'moderate', // Default to 'moderate' for Framingham assessment
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('jobTitles', jobTitle);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      const details = `Created job title: ${jobTitle.name} (${jobTitle.jobTitleId}), Risk Level: ${jobTitle.risk_level}`;
      await database.logActivity('create', 'JobTitle', jobTitle.jobTitleId, currentUser.userId, details);
    }
    return jobTitle;
  }

  async getAllJobTitles() {
    // Check cache first
    const cached = cacheManager.get('jobTitles:all');
    if (cached) {
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
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.get('jobTitles', id);
    cacheManager.set(cacheKey, data);
    return data;
  }

  async updateJobTitle(id, data, currentUser) {
    const updateData = {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    };

    // Include risk_level if provided (for Framingham assessment)
    if (data.riskLevel) {
      updateData.risk_level = data.riskLevel;
    }

    await database.update('jobTitles', id, updateData);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    cacheManager.clear(`jobTitle:${id}`);
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      const details = `Updated job title to: ${data.name}${data.riskLevel ? `, Risk Level: ${data.riskLevel}` : ''}`;
      await database.logActivity('update', 'JobTitle', id, currentUser.userId, details);
    }
    return await this.getJobTitleById(id);
  }

  async deleteJobTitle(id, currentUser) {
    // Get the job title name before deletion for audit trail
    const jobTitle = await this.getJobTitleById(id);
    const jobTitleName = jobTitle?.name || 'Unknown';

    // Check if in use
    const employees = await database.query('employees', emp => emp.jobTitleId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Jabatan ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('jobTitles', id);
    // Invalidate cache
    cacheManager.clear('jobTitles:all');
    cacheManager.clear(`jobTitle:${id}`);
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'JobTitle', id, currentUser.userId,
        `Deleted job title: ${jobTitleName} (${id})`);
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('create', 'Department', department.departmentId, currentUser.userId,
        `Created department: ${department.name} (${department.departmentId})`);
    }
    return department;
  }

  async getAllDepartments() {
    // Check cache first
    const cached = cacheManager.get('departments:all');
    if (cached) {
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('update', 'Department', id, currentUser.userId,
        `Updated department to: ${data.name}`);
    }
    return await this.getDepartmentById(id);
  }

  async deleteDepartment(id, currentUser) {
    // Get the department name before deletion for audit trail
    const department = await this.getDepartmentById(id);
    const departmentName = department?.name || 'Unknown';

    // Check if in use
    const employees = await database.query('employees', emp => emp.departmentId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Departemen ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('departments', id);
    // Invalidate cache
    cacheManager.clear('departments:all');
    cacheManager.clear(`department:${id}`);
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Department', id, currentUser.userId,
        `Deleted department: ${departmentName} (${id})`);
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('create', 'Status', status.statusId, currentUser.userId,
        `Created status: ${status.name} (${status.statusId})`);
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('update', 'Status', id, currentUser.userId,
        `Updated status to: ${data.name}`);
    }
    return await this.getStatusById(id);
  }

  async deleteStatus(id, currentUser) {
    // Get the status name before deletion for audit trail
    const status = await this.getStatusById(id);
    const statusName = status?.name || 'Unknown';

    await database.delete('statusMCU', id);
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Status', id, currentUser.userId,
        `Deleted status: ${statusName} (${id})`);
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('create', 'Vendor', vendor.vendorId, currentUser.userId,
        `Created vendor: ${vendor.name} (${vendor.vendorId})`);
    }
    return vendor;
  }

  async getAllVendors() {
    // Check cache first
    const cached = cacheManager.get('vendors:all');
    if (cached) {
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('update', 'Vendor', id, currentUser.userId,
        `Updated vendor to: ${data.name}`);
    }
    return await this.getVendorById(id);
  }

  async deleteVendor(id, currentUser) {
    // Get the vendor name before deletion for audit trail
    const vendor = await this.getVendorById(id);
    const vendorName = vendor?.name || 'Unknown';

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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Vendor', id, currentUser.userId,
        `Deleted vendor: ${vendorName} (${id})`);
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

    // ✅ FIX: Log activity with details
    const doctorId = result?.id || `doctor-${Date.now()}`;
    if (currentUser?.userId) {
      await database.logActivity('create', 'Doctor', doctorId, currentUser.userId,
        `Created doctor: ${data.name} (${doctorId})`);
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
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('update', 'Doctor', id, currentUser.userId,
        `Updated doctor to: ${data.name}`);
    }
    return await this.getDoctorById(id);
  }

  async deleteDoctor(id, currentUser) {
    // Get the doctor name before deletion for audit trail
    const doctor = await this.getDoctorById(id);
    const doctorName = doctor?.name || 'Unknown';

    // Check if in use
    const mcuRecords = await database.query('mcus', mcu => mcu.doctor === id && !mcu.deletedAt);
    if (mcuRecords.length > 0) {
      throw new Error(`Tidak dapat menghapus. Dokter ini digunakan di ${mcuRecords.length} catatan MCU.`);
    }
    await database.delete('doctors', id);
    // Invalidate cache
    cacheManager.clear('doctors:all');
    cacheManager.clear(`doctor:${id}`);
    // ✅ FIX: Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Doctor', id, currentUser.userId,
        `Deleted doctor: ${doctorName} (${id})`);
    }
    return true;
  }

  // Diseases (Penyakit)
  async createDisease(data, currentUser) {
    const disease = {
      name: data.name,
      category: data.category,
      icd_10_code: data.icd10Code || null,
      is_active: data.isActive !== false, // Default true
      createdAt: getCurrentTimestamp()
    };
    const result = await database.add('diseases', disease);
    // Invalidate cache
    cacheManager.clear('diseases:all');
    // ✅ Log activity with details
    if (currentUser?.userId) {
      const details = `Created disease: ${disease.name} (Category: ${disease.category}${disease.icd_10_code ? `, ICD-10: ${disease.icd_10_code}` : ''})`;
      await database.logActivity('create', 'Disease', result, currentUser.userId, details);
    }
    return disease;
  }

  async getAllDiseases() {
    // Check cache first
    const cached = cacheManager.get('diseases:all');
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.getAll('diseases');
    cacheManager.set('diseases:all', data);
    return data;
  }

  async getDiseaseById(id) {
    // Check cache first
    const cacheKey = `disease:${id}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const data = await database.get('diseases', id);
    cacheManager.set(cacheKey, data);
    return data;
  }

  async updateDisease(id, data, currentUser) {
    const updateData = {
      name: data.name,
      category: data.category,
      icd_10_code: data.icd10Code || null,
      is_active: data.isActive !== false
    };
    await database.update('diseases', id, updateData);
    // Invalidate cache
    cacheManager.clear('diseases:all');
    cacheManager.clear(`disease:${id}`);
    // ✅ Log activity with details
    if (currentUser?.userId) {
      const details = `Updated disease to: ${data.name} (Category: ${data.category}${data.icd10Code ? `, ICD-10: ${data.icd10Code}` : ''})`;
      await database.logActivity('update', 'Disease', id, currentUser.userId, details);
    }
    return await this.getDiseaseById(id);
  }

  async deleteDisease(id, currentUser) {
    // Get the disease name before deletion for audit trail
    const disease = await this.getDiseaseById(id);
    const diseaseName = disease?.name || 'Unknown';

    // Check if in use
    const medicalHistories = await database.query('medicalHistories', mh => mh.diseaseId === id);
    const familyHistories = await database.query('familyHistories', fh => fh.diseaseId === id);
    const totalUsage = medicalHistories.length + familyHistories.length;

    if (totalUsage > 0) {
      throw new Error(`Tidak dapat menghapus. Penyakit ini digunakan di ${totalUsage} catatan kesehatan.`);
    }
    await database.delete('diseases', id);
    // Invalidate cache
    cacheManager.clear('diseases:all');
    cacheManager.clear(`disease:${id}`);
    // ✅ Log activity with details
    if (currentUser?.userId) {
      await database.logActivity('delete', 'Disease', id, currentUser.userId,
        `Deleted disease: ${diseaseName} (${id})`);
    }
    return true;
  }
}

export const masterDataService = new MasterDataService();
