/**
 * Database Service - Unified Interface
 *
 * This is a wrapper that uses databaseAdapter to support both:
 * - Supabase (production - cloud database)
 * - IndexedDB/Dexie (fallback - local storage)
 *
 * Priority: Supabase → IndexedDB
 */

import { isSupabaseEnabled } from '../config/supabase.js';

// Lazy load adapter to avoid circular dependency
let adapter = null;
const getAdapter = async () => {
    if (!adapter) {
        adapter = await import('./databaseAdapter.js');
    }
    return adapter;
};

// Check which database is being used
if (isSupabaseEnabled()) {

} else {
    console.log('📦 Using IndexedDB (Dexie) as fallback database');
}

/**
 * Database wrapper class that proxies to databaseAdapter
 */
class DatabaseService {
    constructor() {

    }

    // Users
    async getAll(tableName, includeDeleted = false) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.getAll();
            case 'employees': return await adp.Employees.getAll(includeDeleted);
            case 'mcus': return await adp.MCUs.getAll(includeDeleted);
            case 'mcuChanges': return await adp.MCUChanges.getAll();
            case 'departments': return await adp.MasterData.getDepartments();
            case 'jobTitles': return await adp.MasterData.getJobTitles();
            case 'vendors': return await adp.MasterData.getVendors();
            case 'doctors': return await adp.MasterData.getDoctors();
            case 'activityLog': return await adp.ActivityLog.getAll();
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async add(tableName, data) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.add(data);
            case 'employees': return await adp.Employees.add(data);
            case 'mcus': return await adp.MCUs.add(data);
            case 'mcuChanges': return await adp.MCUChanges.add(data);
            // For master data, if data is an object with ID, pass the whole object
            // Otherwise (legacy), pass just the name string
            case 'departments':
                return typeof data === 'object' && data.departmentId
                    ? await adp.MasterData.addDepartment(data)
                    : await adp.MasterData.addDepartment(data.name || data);
            case 'jobTitles':
                return typeof data === 'object' && data.jobTitleId
                    ? await adp.MasterData.addJobTitle(data)
                    : await adp.MasterData.addJobTitle(data.name || data);
            case 'vendors':
                return typeof data === 'object' && data.vendorId
                    ? await adp.MasterData.addVendor(data)
                    : await adp.MasterData.addVendor(data.name || data);
            case 'doctors':
                return typeof data === 'object' && data.doctorId
                    ? await adp.MasterData.addDoctor(data)
                    : await adp.MasterData.addDoctor(data.name || data);
            case 'activityLog': return await adp.ActivityLog.add(data);
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async update(tableName, id, data) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.update(id, data);
            case 'employees': return await adp.Employees.update(id, data);
            case 'mcus': return await adp.MCUs.update(id, data);
            case 'mcuChanges': return await adp.MCUChanges.update(id, data);
            case 'departments': return await adp.MasterData.updateDepartment(id, data.name);
            case 'jobTitles': return await adp.MasterData.updateJobTitle(id, data.name);
            case 'vendors': return await adp.MasterData.updateVendor(id, data.name);
            case 'doctors': return await adp.MasterData.updateDoctor(id, data.name);
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async delete(tableName, id) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.delete(id);
            case 'employees': return await adp.Employees.softDelete(id);
            case 'mcus': return await adp.MCUs.softDelete(id);
            case 'mcuChanges': return await adp.MCUChanges.delete(id);
            case 'jobTitles': return await adp.MasterData.deleteJobTitle(id);
            case 'departments': return await adp.MasterData.deleteDepartment(id);
            case 'vendors': return await adp.MasterData.deleteVendor(id);
            case 'doctors': return await adp.MasterData.deleteDoctor(id);
            default: throw new Error(`Delete not supported for: ${tableName}`);
        }
    }

    async hardDelete(tableName, id) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.delete(id);
            case 'employees': return await adp.Employees.hardDelete(id);
            case 'mcus': return await adp.MCUs.hardDelete(id);
            case 'mcuChanges': return await adp.MCUChanges.delete(id);
            case 'jobTitles': return await adp.MasterData.deleteJobTitle(id);
            case 'departments': return await adp.MasterData.deleteDepartment(id);
            case 'vendors': return await adp.MasterData.deleteVendor(id);
            case 'doctors': return await adp.MasterData.deleteDoctor(id);
            default: throw new Error(`Hard delete not supported for: ${tableName}`);
        }
    }

    async get(tableName, id) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.getById(id);
            case 'employees': return await adp.Employees.getById(id);
            case 'mcus': return await adp.MCUs.getById(id);
            case 'mcuChanges': return await adp.MCUChanges.getById(id);
            case 'departments': {
                const all = await adp.MasterData.getDepartments();
                return all.find(item => item.id === id || item.departmentId === id);
            }
            case 'jobTitles': {
                const all = await adp.MasterData.getJobTitles();
                return all.find(item => item.id === id || item.jobTitleId === id);
            }
            case 'vendors': {
                const all = await adp.MasterData.getVendors();
                return all.find(item => item.id === id || item.vendorId === id);
            }
            case 'doctors': {
                const all = await adp.MasterData.getDoctors();
                return all.find(item => item.id === id || item.doctorId === id);
            }
            default: throw new Error(`Get not supported for: ${tableName}`);
        }
    }

    async query(tableName, queryFn) {
        // This is a generic query function for IndexedDB
        // For Supabase, we'd need to translate to SQL query
        // For now, we'll get all and filter in memory (not efficient, but works)
        const all = await this.getAll(tableName);
        return all.filter(queryFn);
    }

    // Activity log
    async getActivityLog(limit = 20) {
        const adp = await getAdapter();
        return await adp.ActivityLog.getAll(limit);
    }

    async logActivity(action, entityType, entityId, userId = null) {
        // Only log CRUD operations - create, read, update, delete
        const allowedActions = ['create', 'update', 'delete', 'restore'];
        if (!allowedActions.includes(action)) {
            return null;
        }

        const adp = await getAdapter();

        // Get user name if userId is provided
        let userName = null;
        if (userId) {
            try {
                const user = await this.get('users', userId);
                userName = user?.displayName || user?.username || null;
            } catch (e) {
                // Silent fail - userName will be null
            }
        }

        try {
            const result = await adp.ActivityLog.add({
                action,
                entityType,
                entityId,
                userId,
                userName,
                timestamp: new Date().toISOString()
            });
            return result;
        } catch (err) {
            // Activity log is non-critical - don't block main operations
            return null;
        }
    }

    // Clear all data (for seed/reset)
    async clearAll() {
        // For Supabase, we don't want to delete production data
        // For IndexedDB, we can clear it
        if (!isSupabaseEnabled()) {
            const adp = await getAdapter();
            const indexedDBInstance = adp.getDatabase();

            // indexedDBInstance is MCUDatabase class instance
            // It has a clearAll() method that handles Dexie db.delete()
            if (indexedDBInstance && typeof indexedDBInstance.clearAll === 'function') {
                await indexedDBInstance.clearAll();
            } else {
                console.warn('⚠️ clearAll() not available on database instance');
            }
        } else {
            console.warn('⚠️ clearAll() is disabled for Supabase to prevent accidental data loss');
            // If you really need to clear Supabase data, do it manually from Supabase Dashboard
        }
    }

    // Expose adapter modules directly for advanced usage (lazy loaded)
    async getUsers() {
        const adp = await getAdapter();
        return adp.Users;
    }
    async getEmployees() {
        const adp = await getAdapter();
        return adp.Employees;
    }
    async getMCUs() {
        const adp = await getAdapter();
        return adp.MCUs;
    }
    async getMasterData() {
        const adp = await getAdapter();
        return adp.MasterData;
    }
}

// Export singleton instance
export const database = new DatabaseService();

// Legacy export (for compatibility) - export the IndexedDB instance
export { database as db } from './database-old.js';
