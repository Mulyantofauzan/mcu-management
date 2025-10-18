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
    console.log('🚀 Using Supabase as primary database');
} else {
    console.log('📦 Using IndexedDB (Dexie) as fallback database');
}

/**
 * Database wrapper class that proxies to databaseAdapter
 */
class DatabaseService {
    constructor() {
        console.log('Database initialized successfully');
    }

    // Users
    async getAll(tableName) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'users': return await adp.Users.getAll();
            case 'employees': return await adp.Employees.getAll();
            case 'mcus': return await adp.MCUs.getAll();
            case 'mcuChanges': return await adp.MCUChanges.getAll();
            case 'departments': return await adp.MasterData.getDepartments();
            case 'jobTitles': return await adp.MasterData.getJobTitles();
            case 'vendors': return await adp.MasterData.getVendors();
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
            case 'departments': return await adp.MasterData.addDepartment(data.name);
            case 'jobTitles': return await adp.MasterData.addJobTitle(data.name);
            case 'vendors': return await adp.MasterData.addVendor(data.name);
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
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async delete(tableName, id) {
        const adp = await getAdapter();
        switch(tableName) {
            case 'employees': return await adp.Employees.softDelete(id);
            case 'mcus': return await adp.MCUs.softDelete(id);
            case 'mcuChanges': return await adp.MCUChanges.delete(id);
            default: throw new Error(`Delete not supported for: ${tableName}`);
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
        const adp = await getAdapter();
        return await adp.ActivityLog.add({
            action,
            entityType,
            entityId,
            userId,
            timestamp: new Date().toISOString()
        });
    }

    // Clear all data (for seed/reset)
    async clearAll() {
        // For Supabase, we don't want to delete production data
        // For IndexedDB, we can clear it
        if (!isSupabaseEnabled()) {
            const adp = await getAdapter();
            const db = adp.getDatabase();
            if (db && db.delete) {
                await db.delete();
                // Re-initialize
                location.reload();
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
    async getActivityLog() {
        const adp = await getAdapter();
        return adp.ActivityLog;
    }
}

// Export singleton instance
export const database = new DatabaseService();

// Legacy export (for compatibility) - export the IndexedDB instance
export { database as db } from './database-old.js';
