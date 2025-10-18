/**
 * Database Adapter
 *
 * This adapter provides a unified interface for both IndexedDB (Dexie) and Supabase.
 * It automatically detects which database is available and uses it.
 *
 * Priority: Supabase (if configured) → IndexedDB (fallback)
 */

import { db } from './database.js';
import { isSupabaseEnabled, getSupabaseClient } from '../config/supabase.js';

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
    return db;
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
// Helper function to transform Supabase snake_case to camelCase for users
function transformUser(user) {
    if (!user) return user;
    return {
        id: user.id,
        userId: user.user_id,
        username: user.username,
        passwordHash: user.password_hash,
        displayName: user.display_name,
        role: user.role,
        active: user.active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
    };
}

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
        return await db.users.toArray();
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
        return await db.users.where('username').equals(username).first();
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
        return await db.users.where('userId').equals(userId).first();
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
        return await db.users.add(user);
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

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return transformUser(data);
        }
        return await db.users.where('userId').equals(userId).modify(updates);
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
            return data;
        }

        if (includeDeleted) {
            return await db.employees.toArray();
        }
        return await db.employees.filter(e => !e.deletedAt).toArray();
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
            return data;
        }
        return await db.employees.where('employeeId').equals(employeeId).first();
    },

    async add(employee) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('employees')
                .insert({
                    employee_id: employee.employeeId,
                    name: employee.name,
                    job_title: employee.jobTitle,
                    department: employee.department,
                    date_of_birth: employee.dateOfBirth,
                    blood_type: employee.bloodType,
                    employee_type: employee.employeeType,
                    vendor_name: employee.vendorName,
                    is_active: employee.isActive
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.employees.add(employee);
    },

    async update(employeeId, updates) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const updateData = {};

            // Map camelCase to snake_case
            if (updates.name) updateData.name = updates.name;
            if (updates.jobTitle) updateData.job_title = updates.jobTitle;
            if (updates.department) updateData.department = updates.department;
            if (updates.dateOfBirth) updateData.date_of_birth = updates.dateOfBirth;
            if (updates.bloodType) updateData.blood_type = updates.bloodType;
            if (updates.employeeType) updateData.employee_type = updates.employeeType;
            if (updates.vendorName !== undefined) updateData.vendor_name = updates.vendorName;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
            if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt;

            const { data, error } = await supabase
                .from('employees')
                .update(updateData)
                .eq('employee_id', employeeId)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.employees.where('employeeId').equals(employeeId).modify(updates);
    },

    async delete(employeeId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('employee_id', employeeId);

            if (error) throw error;
            return true;
        }
        return await db.employees.where('employeeId').equals(employeeId).delete();
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
            return data;
        }

        if (includeDeleted) {
            return await db.mcus.toArray();
        }
        return await db.mcus.filter(m => !m.deletedAt).toArray();
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
            return data;
        }
        return await db.mcus.where('mcuId').equals(mcuId).first();
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
            return data;
        }
        return await db.mcus
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
                    initial_bmi: mcu.initialBmi,
                    initial_blood_pressure: mcu.initialBloodPressure,
                    initial_vision: mcu.initialVision,
                    initial_hearing: mcu.initialHearing,
                    initial_color_blindness: mcu.initialColorBlindness,
                    initial_heart: mcu.initialHeart,
                    initial_lungs: mcu.initialLungs,
                    initial_blood_test: mcu.initialBloodTest,
                    initial_urine_test: mcu.initialUrineTest,
                    initial_x_ray: mcu.initialXRay,
                    initial_result: mcu.initialResult,
                    initial_notes: mcu.initialNotes,
                    final_bmi: mcu.finalBmi,
                    final_blood_pressure: mcu.finalBloodPressure,
                    final_vision: mcu.finalVision,
                    final_hearing: mcu.finalHearing,
                    final_color_blindness: mcu.finalColorBlindness,
                    final_heart: mcu.finalHeart,
                    final_lungs: mcu.finalLungs,
                    final_blood_test: mcu.finalBloodTest,
                    final_urine_test: mcu.finalUrineTest,
                    final_x_ray: mcu.finalXRay,
                    final_result: mcu.finalResult,
                    final_notes: mcu.finalNotes
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.mcus.add(mcu);
    },

    async update(mcuId, updates) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const updateData = {};

            // Map all possible fields
            const fieldMapping = {
                mcuType: 'mcu_type',
                mcuDate: 'mcu_date',
                initialBmi: 'initial_bmi',
                initialBloodPressure: 'initial_blood_pressure',
                initialVision: 'initial_vision',
                initialHearing: 'initial_hearing',
                initialColorBlindness: 'initial_color_blindness',
                initialHeart: 'initial_heart',
                initialLungs: 'initial_lungs',
                initialBloodTest: 'initial_blood_test',
                initialUrineTest: 'initial_urine_test',
                initialXRay: 'initial_x_ray',
                initialResult: 'initial_result',
                initialNotes: 'initial_notes',
                finalBmi: 'final_bmi',
                finalBloodPressure: 'final_blood_pressure',
                finalVision: 'final_vision',
                finalHearing: 'final_hearing',
                finalColorBlindness: 'final_color_blindness',
                finalHeart: 'final_heart',
                finalLungs: 'final_lungs',
                finalBloodTest: 'final_blood_test',
                finalUrineTest: 'final_urine_test',
                finalXRay: 'final_x_ray',
                finalResult: 'final_result',
                finalNotes: 'final_notes',
                deletedAt: 'deleted_at'
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
            return data;
        }
        return await db.mcus.where('mcuId').equals(mcuId).modify(updates);
    },

    async delete(mcuId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('mcus')
                .delete()
                .eq('mcu_id', mcuId);

            if (error) throw error;
            return true;
        }
        return await db.mcus.where('mcuId').equals(mcuId).delete();
    }
};

/**
 * MCU CHANGES (Change History)
 */
export const MCUChanges = {
    async getByMcuId(mcuId) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('mcu_changes')
                .select('*')
                .eq('mcu_id', mcuId)
                .order('changed_at', { ascending: false });

            if (error) throw error;
            return data;
        }
        return await db.mcuChanges
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
            return data;
        }
        return await db.mcuChanges.add(change);
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
            return data;
        }
        return await db.jobTitles.toArray();
    },

    async getDepartments() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        }
        return await db.departments.toArray();
    },

    async getVendors() {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        }
        return await db.vendors.toArray();
    },

    async addJobTitle(name) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('job_titles')
                .insert({ name })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.jobTitles.add({ name });
    },

    async addDepartment(name) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('departments')
                .insert({ name })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.departments.add({ name });
    },

    async addVendor(name) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('vendors')
                .insert({ name })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.vendors.add({ name });
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
            return data;
        }
        return await db.jobTitles.update(id, { name });
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
            return data;
        }
        return await db.departments.update(id, { name });
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
            return data;
        }
        return await db.vendors.update(id, { name });
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
        return await db.jobTitles.delete(id);
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
        return await db.departments.delete(id);
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
        return await db.vendors.delete(id);
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
            return data;
        }
        return await db.activityLog.orderBy('timestamp').reverse().limit(limit).toArray();
    },

    async add(activity) {
        if (useSupabase) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('activity_log')
                .insert({
                    user_id: activity.userId,
                    user_name: activity.userName,
                    action: activity.action,
                    target: activity.target,
                    details: activity.details
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return await db.activityLog.add(activity);
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
