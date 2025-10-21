/**
 * Database Adapter
 *
 * This adapter provides a unified interface for both IndexedDB (Dexie) and Supabase.
 * It automatically detects which database is available and uses it.
 *
 * Priority: Supabase (if configured) → IndexedDB (fallback)
 */

import { isSupabaseEnabled, getSupabaseClient } from '../config/supabase.js';
import { transformUser, transformEmployee, transformMCU, transformMCUChange, transformMasterDataItem, transformActivityLog } from './databaseAdapter-transforms.js';
import { database as indexedDB } from './database-old.js';  // Direct import of IndexedDB instance (no circular dependency)

// Determine which database to use
const useSupabase = isSupabaseEnabled();

if (useSupabase) {
    console.log('🚀 Using Supabase as primary database');
} else {
    console.log('📦 Using IndexedDB (Dexie) as database');
}

/**
 * Get database instance
 */
export function getDatabase() {
    if (useSupabase) {
        return getSupabaseClient();
    }
    return indexedDB;
}

/**
 * Check if using Supabase
 */
export function isUsingSupabase() {
    return useSupabase;
}

// ============================================
// UNIFIED DATABASE OPERATIONS
// ============================================

/**
 * USERS
 */
export const Users = {
    async getAll() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(transformUser);
        }
        return await indexedDB.db.users.toArray();
    },

    async getByUsername(username) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return transformUser(data);
        }
        return await indexedDB.db.users.where('username').equals(username).first();
    },

    async getById(userId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return transformUser(data);
        }
        return await indexedDB.db.users.where('userId').equals(userId).first();
    },

    async add(user) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error} = await supabase
                .from('users')
                .insert({
                    user_id: user.userId,
                    username: user.username,
                    password_hash: user.passwordHash,
                    display_name: user.displayName,
                    role: user.role,
                    active: user.active !== undefined ? user.active : true
                })
                .select()
                .single();

            if (error) throw error;
            return transformUser(data);
        }
        return await indexedDB.db.users.add(user);
    },

    async update(userId, updates) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const updateData = {};
            if (updates.username) updateData.username = updates.username;
            if (updates.passwordHash) updateData.password_hash = updates.passwordHash;
            if (updates.displayName) updateData.display_name = updates.displayName;
            if (updates.role) updateData.role = updates.role;
            if (updates.lastLogin !== undefined) updateData.last_login = updates.lastLogin;
            if (updates.updatedAt) updateData.updated_at = updates.updatedAt;

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return transformUser(data);
        }
        return await indexedDB.db.users.where('userId').equals(userId).modify(updates);
    },

    async delete(userId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.users.where('userId').equals(userId).delete();
    }
};

/**
 * EMPLOYEES
 */
export const Employees = {
    async getAll(includeDeleted = false) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            let query = supabase.from('employees').select('*');

            if (!includeDeleted) {
                query = query.is('deleted_at', null);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(transformEmployee);
        }

        if (includeDeleted) {
            return await indexedDB.db.employees.toArray();
        }
        return await indexedDB.db.employees.filter(e => !e.deletedAt).toArray();
    },

    async getById(employeeId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', employeeId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return transformEmployee(data);
        }
        return await indexedDB.db.employees.where('employeeId').equals(employeeId).first();
    },

    async add(employee) {
        if (useSupabase) {
            const supabase = getSupabaseClient();

            // Resolve job title ID to name
            let jobTitleName = '';
            if (employee.jobTitleId) {
                const jobTitles = await MasterData.getJobTitles();
                // Convert to number for comparison (form inputs are strings)
                const jobTitleIdNum = parseInt(employee.jobTitleId, 10);
                const jt = jobTitles.find(j => j.id === jobTitleIdNum || j.id === employee.jobTitleId || j.jobTitleId === employee.jobTitleId);
                jobTitleName = jt ? jt.name : (employee.jobTitle || String(employee.jobTitleId));
            } else {
                jobTitleName = employee.jobTitle || '';
            }

            // Resolve department ID to name
            let departmentName = '';
            if (employee.departmentId) {
                const departments = await MasterData.getDepartments();
                // Convert to number for comparison (form inputs are strings)
                const departmentIdNum = parseInt(employee.departmentId, 10);
                const dept = departments.find(d => d.id === departmentIdNum || d.id === employee.departmentId || d.departmentId === employee.departmentId);
                departmentName = dept ? dept.name : (employee.department || String(employee.departmentId));
            } else {
                departmentName = employee.department || '';
            }

            const { data, error } = await supabase
                .from('employees')
                .insert({
                    employee_id: employee.employeeId,
                    name: employee.name,
                    job_title: jobTitleName,
                    department: departmentName,
                    date_of_birth: employee.dateOfBirth || employee.birthDate,
                    blood_type: employee.bloodType,
                    employee_type: employee.employeeType || employee.employmentStatus || 'Company',
                    vendor_name: employee.vendorName,
                    is_active: employee.isActive !== undefined ? employee.isActive : (employee.activeStatus === 'Active' || employee.activeStatus === true),
                    inactive_reason: employee.inactiveReason || null
                })
                .select()
                .single();

            if (error) throw error;
            return transformEmployee(data);
        }
        return await indexedDB.db.employees.add(employee);
    },

    async update(employeeId, updates) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const updateData = {};

            // Map camelCase to snake_case and resolve IDs
            if (updates.name) updateData.name = updates.name;

            // Resolve job title ID to name if provided
            if (updates.jobTitleId) {
                const jobTitles = await MasterData.getJobTitles();
                // Convert to number for comparison (form inputs are strings)
                const jobTitleIdNum = parseInt(updates.jobTitleId, 10);
                const jt = jobTitles.find(j => j.id === jobTitleIdNum || j.id === updates.jobTitleId || j.jobTitleId === updates.jobTitleId);
                updateData.job_title = jt ? jt.name : (updates.jobTitle || String(updates.jobTitleId));
            } else if (updates.jobTitle) {
                updateData.job_title = updates.jobTitle;
            }

            // Resolve department ID to name if provided
            if (updates.departmentId) {
                const departments = await MasterData.getDepartments();
                // Convert to number for comparison (form inputs are strings)
                const departmentIdNum = parseInt(updates.departmentId, 10);
                const dept = departments.find(d => d.id === departmentIdNum || d.id === updates.departmentId || d.departmentId === updates.departmentId);
                updateData.department = dept ? dept.name : (updates.department || String(updates.departmentId));
            } else if (updates.department) {
                updateData.department = updates.department;
            }

            if (updates.dateOfBirth || updates.birthDate) updateData.date_of_birth = updates.dateOfBirth || updates.birthDate;
            if (updates.bloodType) updateData.blood_type = updates.bloodType;
            if (updates.employeeType) updateData.employee_type = updates.employeeType;
            if (updates.employmentStatus) updateData.employee_type = updates.employmentStatus;
            if (updates.vendorName !== undefined) updateData.vendor_name = updates.vendorName;
            if (updates.inactiveReason !== undefined) updateData.inactive_reason = updates.inactiveReason;

            // Handle active status (multiple formats)
            if (updates.isActive !== undefined) {
                updateData.is_active = updates.isActive;
            } else if (updates.activeStatus !== undefined) {
                updateData.is_active = updates.activeStatus === 'Active' || updates.activeStatus === true;
            }

            if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt;
            if (updates.updatedAt) updateData.updated_at = updates.updatedAt;

            const { data, error } = await supabase
                .from('employees')
                .update(updateData)
                .eq('employee_id', employeeId)
                .select()
                .single();

            if (error) throw error;
            return transformEmployee(data);
        }
        return await indexedDB.db.employees.where('employeeId').equals(employeeId).modify(updates);
    },

    async softDelete(employeeId) {
        return await this.update(employeeId, { deletedAt: new Date().toISOString() });
    },

    async hardDelete(employeeId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('employee_id', employeeId);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.employees.where('employeeId').equals(employeeId).delete();
    },

    async delete(employeeId) {
        // Alias for hardDelete for backward compatibility
        return await this.hardDelete(employeeId);
    }
};

/**
 * MCUs
 */
export const MCUs = {
    async getAll(includeDeleted = false) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            let query = supabase.from('mcus').select('*');

            if (!includeDeleted) {
                query = query.is('deleted_at', null);
            }

            const { data, error } = await query.order('mcu_date', { ascending: false });

            if (error) throw error;
            return data.map(transformMCU);
        }

        if (includeDeleted) {
            return await indexedDB.db.mcus.toArray();
        }
        return await indexedDB.db.mcus.filter(m => !m.deletedAt).toArray();
    },

    async getById(mcuId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcus')
                .select('*')
                .eq('mcu_id', mcuId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return transformMCU(data);
        }
        return await indexedDB.db.mcus.where('mcuId').equals(mcuId).first();
    },

    async getByEmployeeId(employeeId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcus')
                .select('*')
                .eq('employee_id', employeeId)
                .is('deleted_at', null)
                .order('mcu_date', { ascending: false });

            if (error) throw error;
            return data.map(transformMCU);
        }
        return await indexedDB.db.mcus
            .where('employeeId').equals(employeeId)
            .filter(m => !m.deletedAt)
            .toArray();
    },

    async add(mcu) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcus')
                .insert({
                    mcu_id: mcu.mcuId,
                    employee_id: mcu.employeeId,
                    mcu_type: mcu.mcuType,
                    mcu_date: mcu.mcuDate,
                    // Examination results (single set, not initial/final)
                    bmi: mcu.bmi,
                    blood_pressure: mcu.bloodPressure,
                    vision: mcu.vision,
                    audiometry: mcu.audiometry,
                    spirometry: mcu.spirometry,
                    hbsag: mcu.hbsag,
                    sgot: mcu.sgot,
                    sgpt: mcu.sgpt,
                    cbc: mcu.cbc,
                    xray: mcu.xray,
                    ekg: mcu.ekg,
                    treadmill: mcu.treadmill,
                    kidney_liver_function: mcu.kidneyLiverFunction,
                    napza: mcu.napza,
                    // Initial and final results
                    initial_result: mcu.initialResult,
                    initial_notes: mcu.initialNotes,
                    final_result: mcu.finalResult,
                    final_notes: mcu.finalNotes,
                    status: mcu.status,
                    created_by: mcu.createdBy,
                    updated_by: mcu.updatedBy
                })
                .select()
                .single();

            if (error) throw error;
            return transformMCU(data);
        }
        return await indexedDB.db.mcus.add(mcu);
    },

    async update(mcuId, updates) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const updateData = {};

            // Map all possible fields to match actual Supabase schema
            const fieldMapping = {
                mcuType: 'mcu_type',
                mcuDate: 'mcu_date',
                // Examination results (single set)
                bmi: 'bmi',
                bloodPressure: 'blood_pressure',
                vision: 'vision',
                audiometry: 'audiometry',
                spirometry: 'spirometry',
                hbsag: 'hbsag',
                sgot: 'sgot',
                sgpt: 'sgpt',
                cbc: 'cbc',
                xray: 'xray',
                ekg: 'ekg',
                treadmill: 'treadmill',
                kidneyLiverFunction: 'kidney_liver_function',
                napza: 'napza',
                // Results
                initialResult: 'initial_result',
                initialNotes: 'initial_notes',
                finalResult: 'final_result',
                finalNotes: 'final_notes',
                status: 'status',
                // Timestamps
                createdAt: 'created_at',
                updatedAt: 'updated_at',
                deletedAt: 'deleted_at',
                createdBy: 'created_by',
                updatedBy: 'updated_by'
            };

            Object.keys(updates).forEach(key => {
                const dbKey = fieldMapping[key] || key;
                updateData[dbKey] = updates[key];
            });

            const { data, error } = await supabase
                .from('mcus')
                .update(updateData)
                .eq('mcu_id', mcuId)
                .select()
                .single();

            if (error) throw error;
            return transformMCU(data);
        }
        return await indexedDB.db.mcus.where('mcuId').equals(mcuId).modify(updates);
    },

    async softDelete(mcuId) {
        return await this.update(mcuId, { deletedAt: new Date().toISOString() });
    },

    async hardDelete(mcuId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('mcus')
                .delete()
                .eq('mcu_id', mcuId);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.mcus.where('mcuId').equals(mcuId).delete();
    },

    async delete(mcuId) {
        // Alias for hardDelete for backward compatibility
        return await this.hardDelete(mcuId);
    }
};

/**
 * MCU CHANGES (Change History)
 */
export const MCUChanges = {
    async getAll() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcu_changes')
                .select('*')
                .order('changed_at', { ascending: false });

            if (error) throw error;
            return data.map(transformMCUChange);
        }
        return await indexedDB.db.mcuChanges.toArray();
    },

    async getById(id) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcu_changes')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return transformMCUChange(data);
        }
        return await indexedDB.db.mcuChanges.get(id);
    },

    async getByMcuId(mcuId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcu_changes')
                .select('*')
                .eq('mcu_id', mcuId)
                .order('changed_at', { ascending: false });

            if (error) throw error;
            return data.map(transformMCUChange);
        }
        return await indexedDB.db.mcuChanges
            .where('mcuId').equals(mcuId)
            .reverse()
            .sortBy('changedAt');
    },

    async add(change) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcu_changes')
                .insert({
                    mcu_id: change.mcuId,
                    field_name: change.fieldName,
                    old_value: change.oldValue,
                    new_value: change.newValue,
                    changed_by: change.changedBy
                })
                .select()
                .single();

            if (error) throw error;
            return transformMCUChange(data);
        }
        return await indexedDB.db.mcuChanges.add(change);
    },

    async update(id, updates) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const updateData = {};
            if (updates.fieldName) updateData.field_name = updates.fieldName;
            if (updates.oldValue !== undefined) updateData.old_value = updates.oldValue;
            if (updates.newValue !== undefined) updateData.new_value = updates.newValue;
            if (updates.changedBy) updateData.changed_by = updates.changedBy;

            const { data, error } = await supabase
                .from('mcu_changes')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return transformMCUChange(data);
        }
        return await indexedDB.db.mcuChanges.update(id, updates);
    },

    async delete(id) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('mcu_changes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.mcuChanges.delete(id);
    }
};

/**
 * MASTER DATA (JobTitles, Departments, Vendors)
 */
export const MasterData = {
    async getJobTitles() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('job_titles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data.map(item => transformMasterDataItem(item, 'jobTitle'));
        }
        return await indexedDB.db.jobTitles.toArray();
    },

    async getDepartments() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data.map(item => transformMasterDataItem(item, 'department'));
        }
        return await indexedDB.db.departments.toArray();
    },

    async getVendors() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data.map(item => transformMasterDataItem(item, 'vendor'));
        }
        return await indexedDB.db.vendors.toArray();
    },

    async addJobTitle(dataOrName) {
        // Support both object (with jobTitleId) and string (just name)
        const isObject = typeof dataOrName === 'object' && dataOrName !== null;
        const name = isObject ? dataOrName.name : dataOrName;
        const fullData = isObject ? dataOrName : { name };

        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error} = await supabase
                .from('job_titles')
                .insert({ name })
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data);
        }
        // For IndexedDB, use the full object if provided (includes ID and timestamps)
        return await indexedDB.db.jobTitles.add(fullData);
    },

    async addDepartment(dataOrName) {
        // Support both object (with departmentId) and string (just name)
        const isObject = typeof dataOrName === 'object' && dataOrName !== null;
        const name = isObject ? dataOrName.name : dataOrName;
        const fullData = isObject ? dataOrName : { name };

        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('departments')
                .insert({ name })
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data);
        }
        // For IndexedDB, use the full object if provided (includes ID and timestamps)
        return await indexedDB.db.departments.add(fullData);
    },

    async addVendor(dataOrName) {
        // Support both object (with vendorId) and string (just name)
        const isObject = typeof dataOrName === 'object' && dataOrName !== null;
        const name = isObject ? dataOrName.name : dataOrName;
        const fullData = isObject ? dataOrName : { name };

        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('vendors')
                .insert({ name })
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data);
        }
        // For IndexedDB, use the full object if provided (includes ID and timestamps)
        return await indexedDB.db.vendors.add(fullData);
    },

    async updateJobTitle(id, name) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('job_titles')
                .update({ name })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data, 'jobTitle');
        }
        // Dexie: use where().modify() for non-primary key fields
        await indexedDB.db.jobTitles.where('jobTitleId').equals(id).modify({ name });
        return await indexedDB.db.jobTitles.where('jobTitleId').equals(id).first();
    },

    async updateDepartment(id, name) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('departments')
                .update({ name })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data, 'department');
        }
        // Dexie: use where().modify() for non-primary key fields
        await indexedDB.db.departments.where('departmentId').equals(id).modify({ name });
        return await indexedDB.db.departments.where('departmentId').equals(id).first();
    },

    async updateVendor(id, name) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('vendors')
                .update({ name })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data, 'vendor');
        }
        // Dexie: use where().modify() for non-primary key fields
        await indexedDB.db.vendors.where('vendorId').equals(id).modify({ name });
        return await indexedDB.db.vendors.where('vendorId').equals(id).first();
    },

    async deleteJobTitle(id) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('job_titles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.jobTitles.delete(id);
    },

    async deleteDepartment(id) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.departments.delete(id);
    },

    async deleteVendor(id) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('vendors')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.vendors.delete(id);
    }
};

/**
 * ACTIVITY LOG
 */
export const ActivityLog = {
    async getAll(limit = 50) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('activity_log')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data.map(transformActivityLog);
        }
        return await indexedDB.db.activityLog.orderBy('timestamp').reverse().limit(limit).toArray();
    },

    async add(activity) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('activity_log')
                .insert({
                    user_id: activity.userId,
                    user_name: activity.userName || null,
                    action: activity.action,
                    target: activity.entityType || activity.target, // Map entityType to target
                    details: activity.entityId || activity.details, // Map entityId to details
                    timestamp: activity.timestamp
                })
                .select()
                .single();

            if (error) throw error;
            return transformActivityLog(data);
        }
        return await indexedDB.db.activityLog.add(activity);
    }
};

export default {
    Users,
    Employees,
    MCUs,
    MCUChanges,
    MasterData,
    ActivityLog,
    getDatabase,
    isUsingSupabase
};
