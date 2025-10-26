/**
 * Master Data Service
 * Handles CRUD for master data: JobTitle, Department, StatusMCU, Vendor
 */

import { database } from './database.js';
import {
  generateJobTitleId,
  generateDepartmentId,
  generateStatusId,
  generateVendorId,
  generateReferralRecipientId
} from '../utils/idGenerator.js';
import { getCurrentTimestamp } from '../utils/dateHelpers.js';

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
    return jobTitle;
  }

  async getAllJobTitles() {
    return await database.getAll('jobTitles');
  }

  async getJobTitleById(id) {
    return await database.get('jobTitles', id);
  }

  async updateJobTitle(id, data) {
    await database.update('jobTitles', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    return await this.getJobTitleById(id);
  }

  async deleteJobTitle(id) {
    // Check if in use
    const employees = await database.query('employees', emp => emp.jobTitleId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Jabatan ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('jobTitles', id);
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
    return department;
  }

  async getAllDepartments() {
    return await database.getAll('departments');
  }

  async getDepartmentById(id) {
    return await database.get('departments', id);
  }

  async updateDepartment(id, data) {
    await database.update('departments', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    return await this.getDepartmentById(id);
  }

  async deleteDepartment(id) {
    // Check if in use
    const employees = await database.query('employees', emp => emp.departmentId === id && !emp.deletedAt);
    if (employees.length > 0) {
      throw new Error(`Tidak dapat menghapus. Departemen ini digunakan oleh ${employees.length} karyawan.`);
    }
    await database.delete('departments', id);
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
    return vendor;
  }

  async getAllVendors() {
    return await database.getAll('vendors');
  }

  async getVendorById(id) {
    return await database.get('vendors', id);
  }

  async updateVendor(id, data) {
    await database.update('vendors', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
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
    return true;
  }

  // Referral Recipients
  async createReferralRecipient(data) {
    const referralRecipient = {
      id: generateReferralRecipientId(),
      name: data.name,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    await database.add('referralRecipients', referralRecipient);
    return referralRecipient;
  }

  async getAllReferralRecipients() {
    return await database.getAll('referralRecipients');
  }

  async getReferralRecipientById(id) {
    return await database.get('referralRecipients', id);
  }

  async updateReferralRecipient(id, data) {
    await database.update('referralRecipients', id, {
      name: data.name,
      updatedAt: getCurrentTimestamp()
    });
    return await this.getReferralRecipientById(id);
  }

  async deleteReferralRecipient(id) {
    await database.delete('referralRecipients', id);
    return true;
  }
}

export const masterDataService = new MasterDataService();
