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

// Determine which database to use (lazy - check when needed, not on load)
// This allows Supabase to finish initializing asynchronously
const getUseSupabase = () => {
    const enabled = isSupabaseEnabled();
    return enabled;
};

/**
 * Get database instance
 */
export function getDatabase() {
    if (getUseSupabase()) {
        return getSupabaseClient();
    }
    return indexedDB;
}

/**
 * Check if using Supabase
 */
export function isUsingSupabase() {
    return getUseSupabase();
}

// ============================================
// UNIFIED DATABASE OPERATIONS
// ============================================

/**
 * USERS
 */
export const Users = {
    async getAll() {
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
                    jenis_kelamin: employee.jenisKelamin || 'Laki-laki',
                    job_title: jobTitleName,
                    department: departmentName,
                    date_of_birth: employee.dateOfBirth || employee.birthDate,
                    blood_type: employee.bloodType,
                    employee_type: employee.employeeType || employee.employmentStatus || 'Karyawan PST',
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
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const updateData = {};

            // Map camelCase to snake_case and resolve IDs
            if (updates.name) updateData.name = updates.name;
            if (updates.jenisKelamin) updateData.jenis_kelamin = updates.jenisKelamin;

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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();

            const insertPayload = {
                mcu_id: mcu.mcuId,
                employee_id: mcu.employeeId,
                mcu_type: mcu.mcuType,
                mcu_date: mcu.mcuDate,
                // Note: age_at_mcu is calculated on backend, not stored in database
                // Examination results (vital signs)
                bmi: mcu.bmi,
                blood_pressure: mcu.bloodPressure,
                respiratory_rate: mcu.respiratoryRate,
                pulse: mcu.pulse,
                temperature: mcu.temperature,
                // 8-field vision structure (map camelCase to snake_case)
                vision_distant_unaided_left: mcu.visionDistantUnaideLeft,
                vision_distant_unaided_right: mcu.visionDistantUnaideRight,
                vision_distant_spectacles_left: mcu.visionDistantSpectaclesLeft,
                vision_distant_spectacles_right: mcu.visionDistantSpectaclesRight,
                vision_near_unaided_left: mcu.visionNearUnaideLeft,
                vision_near_unaided_right: mcu.visionNearUnaideRight,
                vision_near_spectacles_left: mcu.visionNearSpectaclesLeft,
                vision_near_spectacles_right: mcu.visionNearSpectaclesRight,
                // Legacy single vision field (for backward compatibility)
                vision: mcu.vision,
                // Other exams
                audiometry: mcu.audiometry,
                spirometry: mcu.spirometry,
                hbsag: mcu.hbsag,
                napza: mcu.napza,
                colorblind: mcu.colorblind,
                xray: mcu.xray,
                ekg: mcu.ekg,
                treadmill: mcu.treadmill,
                sgot: mcu.sgot,
                sgpt: mcu.sgpt,
                cbc: mcu.cbc,
                // Lifestyle fields
                smoking_status: mcu.smokingStatus,
                exercise_frequency: mcu.exerciseFrequency,
                // Rujukan/Referral fields
                doctor: mcu.doctor,
                recipient: mcu.recipient,
                keluhan_utama: mcu.keluhanUtama,
                diagnosis_kerja: mcu.diagnosisKerja,
                alasan_rujuk: mcu.alasanRujuk,
                // Initial and final results
                initial_result: mcu.initialResult,
                initial_notes: mcu.initialNotes,
                final_result: mcu.finalResult,
                final_notes: mcu.finalNotes,
                status: mcu.status,
                created_by: mcu.createdBy,
                updated_by: mcu.updatedBy
            };

            const { data, error } = await supabase
                .from('mcus')
                .insert(insertPayload)
                .select()
                .single();

            if (error) throw error;
            return transformMCU(data);
        }
        return await indexedDB.db.mcus.add(mcu);
    },

    async update(mcuId, updates) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const updateData = {};

            // Map all possible fields to match actual Supabase schema
            const fieldMapping = {
                mcuType: 'mcu_type',
                mcuDate: 'mcu_date',
                // Note: ageAtMCU is calculated on backend, not stored in database
                // Vital signs
                bmi: 'bmi',
                bloodPressure: 'blood_pressure',
                respiratoryRate: 'respiratory_rate',
                pulse: 'pulse',
                temperature: 'temperature',
                // 8-field vision structure
                visionDistantUnaideLeft: 'vision_distant_unaided_left',
                visionDistantUnaideRight: 'vision_distant_unaided_right',
                visionDistantSpectaclesLeft: 'vision_distant_spectacles_left',
                visionDistantSpectaclesRight: 'vision_distant_spectacles_right',
                visionNearUnaideLeft: 'vision_near_unaided_left',
                visionNearUnaideRight: 'vision_near_unaided_right',
                visionNearSpectaclesLeft: 'vision_near_spectacles_left',
                visionNearSpectaclesRight: 'vision_near_spectacles_right',
                // Legacy single vision field (for backward compatibility)
                vision: 'vision',
                // Other exams
                audiometry: 'audiometry',
                spirometry: 'spirometry',
                hbsag: 'hbsag',
                xray: 'xray',
                ekg: 'ekg',
                treadmill: 'treadmill',
                napza: 'napza',
                colorblind: 'colorblind',
                sgot: 'sgot',
                sgpt: 'sgpt',
                cbc: 'cbc',
                // Lifestyle fields
                smokingStatus: 'smoking_status',
                exerciseFrequency: 'exercise_frequency',
                // Rujukan/Referral fields
                doctor: 'doctor',
                recipient: 'recipient',
                keluhanUtama: 'keluhan_utama',
                diagnosisKerja: 'diagnosis_kerja',
                alasanRujuk: 'alasan_rujuk',
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
                .select();

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                // If update didn't return data, fetch it directly
                const { data: fetchedData, error: fetchError } = await supabase
                    .from('mcus')
                    .select()
                    .eq('mcu_id', mcuId)
                    .single();

                if (fetchError) {
                    throw fetchError;
                }

                return transformMCU(fetchedData);
            }

            return transformMCU(data[0]);
        }
        return await indexedDB.db.mcus.where('mcuId').equals(mcuId).modify(updates);
    },

    async softDelete(mcuId) {
        return await this.update(mcuId, { deletedAt: new Date().toISOString() });
    },

    async hardDelete(mcuId) {
        if (getUseSupabase()) {
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
 * MCU FILES (File Storage)
 */
export const MCUFiles = {
    async getAll(includeDeleted = false) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            let query = supabase.from('mcufiles').select('*');

            if (!includeDeleted) {
                query = query.is('deletedat', null);
            }

            const { data, error } = await query.order('uploadedat', { ascending: false });

            if (error) throw error;
            return data || [];
        }

        if (includeDeleted) {
            return await indexedDB.db.mcufiles?.toArray() || [];
        }
        return await indexedDB.db.mcufiles?.filter(f => !f.deletedAt).toArray() || [];
    },

    async getById(fileId) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcufiles')
                .select('*')
                .eq('fileid', fileId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        }
        return await indexedDB.db.mcufiles?.where('fileid').equals(fileId).first();
    },

    async hardDelete(fileId) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('mcufiles')
                .delete()
                .eq('fileid', fileId);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.mcufiles?.where('fileid').equals(fileId).delete();
    },

    async delete(fileId) {
        // Alias for hardDelete for backward compatibility
        return await this.hardDelete(fileId);
    },

    async update(fileId, data) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { data: result, error } = await supabase
                .from('mcufiles')
                .update(data)
                .eq('fileid', fileId);

            if (error) throw error;
            return result;
        }
        // IndexedDB: Update record
        const file = await indexedDB.db.mcufiles?.where('fileid').equals(fileId).first();
        if (file) {
            Object.assign(file, data);
            await indexedDB.db.mcufiles?.put(file);
        }
        return file;
    }
};

/**
 * MCU CHANGES (Change History)
 */
export const MCUChanges = {
    async getAll() {
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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

        if (getUseSupabase()) {
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

        if (getUseSupabase()) {
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

        if (getUseSupabase()) {
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

    async updateJobTitle(id, data) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();

            // Handle both string (legacy) and object (new) formats
            let updateData = {};
            if (typeof data === 'string') {
                // Legacy: just name
                updateData = { name: data };
            } else if (typeof data === 'object') {
                // New: object with name and optional risk_level
                updateData = {
                    name: data.name || data,
                    ...(data.risk_level && { risk_level: data.risk_level })
                };
            }

            const { data: result, error } = await supabase
                .from('job_titles')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(result, 'jobTitle');
        }

        // Dexie: use where().modify() for non-primary key fields
        let updateData = {};
        if (typeof data === 'string') {
            updateData = { name: data };
        } else if (typeof data === 'object') {
            updateData = {
                name: data.name || data,
                ...(data.risk_level && { risk_level: data.risk_level })
            };
        }

        await indexedDB.db.jobTitles.where('jobTitleId').equals(id).modify(updateData);
        return await indexedDB.db.jobTitles.where('jobTitleId').equals(id).first();
    },

    async updateDepartment(id, name) {
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
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
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('vendors')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.vendors.delete(id);
    },

    async getDoctors() {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('doctors')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data.map(item => transformMasterDataItem(item, 'doctor'));
        }
        return await indexedDB.db.doctors.toArray();
    },

    async addDoctor(dataOrName) {
        // Support both object (with doctorId) and string (just name)
        const isObject = typeof dataOrName === 'object' && dataOrName !== null;
        const name = isObject ? dataOrName.name : dataOrName;
        const fullData = isObject ? dataOrName : { name };

        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            // CRITICAL: Create brand new object with ONLY name field
            // Do NOT use spread operator or object references
            // Supabase SDK might be reading unexpected properties
            const cleanData = {};
            cleanData.name = String(name).trim();

            const { data, error} = await supabase
                .from('doctors')
                .insert([cleanData])
                .select('*')
                .single();

            if (error) throw error;
            return transformMasterDataItem(data, 'doctor');
        }
        // For IndexedDB, use the full object if provided (includes ID and timestamps)
        return await indexedDB.db.doctors.add(fullData);
    },

    async updateDoctor(id, name) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('doctors')
                .update({ name })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return transformMasterDataItem(data, 'doctor');
        }
        // Dexie: use where().modify() for non-primary key fields
        // NOTE: IndexedDB doctors table uses 'id' as primary key (not 'doctorId')
        await indexedDB.db.doctors.update(id, { name });
        return await indexedDB.db.doctors.get(id);
    },

    async deleteDoctor(id) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('doctors')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        }
        return await indexedDB.db.doctors.delete(id);
    }
};

/**
 * ACTIVITY LOG
 */
export const ActivityLog = {
    async getAll(limit = 50) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            try {
                const { data, error } = await supabase
                    .from('activity_log')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(limit);

                if (error) {
                    return [];
                }

                return data ? data.map(transformActivityLog) : [];
            } catch (err) {
                return [];
            }
        }

        // IndexedDB primary source (only when Supabase is disabled)
        try {
            const result = await indexedDB.db.activityLog.orderBy('timestamp').reverse().limit(limit).toArray();
            return result || [];
        } catch (err) {
            return [];
        }
    },

    /**
     * Get activity log with server-side filtering and pagination
     * @param {Object} filters - { action, target, userName, fromDate, toDate }
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @returns {Object} - { data, total, page, limit, totalPages }
     */
    async getFiltered(filters = {}, page = 1, limit = 20) {
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            try {
                let query = supabase.from('activity_log').select('*', { count: 'exact' });

                // Apply filters
                if (filters.action) {
                    query = query.eq('action', filters.action);
                }
                if (filters.target) {
                    query = query.eq('target', filters.target);
                }
                if (filters.userName) {
                    query = query.ilike('user_name', `%${filters.userName}%`);
                }
                if (filters.fromDate) {
                    const fromDate = new Date(filters.fromDate);
                    fromDate.setHours(0, 0, 0, 0);
                    query = query.gte('timestamp', fromDate.toISOString());
                }
                if (filters.toDate) {
                    const toDate = new Date(filters.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    query = query.lte('timestamp', toDate.toISOString());
                }

                // Apply sorting, pagination
                query = query
                    .order('timestamp', { ascending: false })
                    .range((page - 1) * limit, page * limit - 1);

                const { data, error, count } = await query;

                if (error) {
                    return { data: [], total: 0, page, limit, totalPages: 0 };
                }

                const total = count || 0;
                const totalPages = Math.ceil(total / limit);

                return {
                    data: data ? data.map(transformActivityLog) : [],
                    total,
                    page,
                    limit,
                    totalPages
                };
            } catch (err) {
                return { data: [], total: 0, page, limit, totalPages: 0 };
            }
        }

        // For IndexedDB - do client-side filtering
        try {
            const allRecords = await indexedDB.db.activityLog.orderBy('timestamp').reverse().toArray();

            // Apply filters
            let filtered = allRecords.filter(activity => {
                if (filters.action && activity.action !== filters.action) return false;
                if (filters.target && activity.entityType !== filters.target && activity.target !== filters.target) return false;
                if (filters.userName && !(activity.userName || '').toLowerCase().includes(filters.userName.toLowerCase())) return false;

                if (filters.fromDate || filters.toDate) {
                    const activityDate = new Date(activity.timestamp);
                    if (filters.fromDate) {
                        const fromDate = new Date(filters.fromDate);
                        fromDate.setHours(0, 0, 0, 0);
                        if (activityDate < fromDate) return false;
                    }
                    if (filters.toDate) {
                        const toDate = new Date(filters.toDate);
                        toDate.setHours(23, 59, 59, 999);
                        if (activityDate > toDate) return false;
                    }
                }
                return true;
            });

            const total = filtered.length;
            const totalPages = Math.ceil(total / limit);
            const start = (page - 1) * limit;
            const end = start + limit;
            const data = filtered.slice(start, end);

            return { data, total, page, limit, totalPages };
        } catch (err) {
            return { data: [], total: 0, page, limit, totalPages: 0 };
        }
    },

    async add(activity) {
        // When Supabase is enabled, use ONLY Supabase (no IndexedDB caching to prevent duplicates)
        if (getUseSupabase()) {
            const supabase = getSupabaseClient();
            try {
                // ✅ FIX: Match EXACT Supabase schema columns
                // Available columns: id, user_id, user_name, action, target, target_id, details, timestamp
                const insertData = {
                    user_id: activity.userId || null,
                    user_name: activity.userName || null,
                    action: activity.action,
                    target: activity.entityType || activity.target || null,
                    target_id: activity.entityId || null,  // ✅ Store entityId in dedicated column
                    details: activity.details || null,      // ✅ Details only for additional text info
                    timestamp: activity.timestamp
                };

                // Insert to Supabase
                const { data, error } = await supabase
                    .from('activity_log')
                    .insert([insertData])
                    .select();

                if (error) {
                    throw error;
                }

                if (data && data.length > 0) {
                    return data[0];
                } else {
                    return null;
                }
            } catch (err) {
                // ✅ Silently fail - activity log is non-critical
                return null;
            }
            // ✅ IMPORTANT: Return here to prevent IndexedDB fallback execution
            return null;
        }

        // IndexedDB storage (only when Supabase is disabled)
        try {
            const id = await indexedDB.db.activityLog.add(activity);
            return { ...activity, id };
        } catch (err) {
            return activity;
        }
    }
};

export default {
    Users,
    Employees,
    MCUs,
    MCUFiles,
    MCUChanges,
    MasterData,
    ActivityLog,
    getDatabase,
    isUsingSupabase
};
