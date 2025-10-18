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
import * as adapter from './databaseAdapter.js';

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
        switch(tableName) {
            case 'users': return await adapter.Users.getAll();
            case 'employees': return await adapter.Employees.getAll();
            case 'mcus': return await adapter.MCUs.getAll();
            case 'departments': return await adapter.Departments.getAll();
            case 'jobTitles': return await adapter.JobTitles.getAll();
            case 'vendors': return await adapter.Vendors.getAll();
            case 'activityLog': return await adapter.ActivityLog.getAll();
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async add(tableName, data) {
        switch(tableName) {
            case 'users': return await adapter.Users.add(data);
            case 'employees': return await adapter.Employees.add(data);
            case 'mcus': return await adapter.MCUs.add(data);
            case 'departments': return await adapter.Departments.add(data);
            case 'jobTitles': return await adapter.JobTitles.add(data);
            case 'vendors': return await adapter.Vendors.add(data);
            case 'activityLog': return await adapter.ActivityLog.add(data);
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async update(tableName, id, data) {
        switch(tableName) {
            case 'users': return await adapter.Users.update(id, data);
            case 'employees': return await adapter.Employees.update(id, data);
            case 'mcus': return await adapter.MCUs.update(id, data);
            case 'departments': return await adapter.Departments.update(id, data);
            case 'jobTitles': return await adapter.JobTitles.update(id, data);
            case 'vendors': return await adapter.Vendors.update(id, data);
            default: throw new Error(`Unknown table: ${tableName}`);
        }
    }

    async delete(tableName, id) {
        switch(tableName) {
            case 'employees': return await adapter.Employees.softDelete(id);
            case 'mcus': return await adapter.MCUs.softDelete(id);
            default: throw new Error(`Delete not supported for: ${tableName}`);
        }
    }

    async get(tableName, id) {
        switch(tableName) {
            case 'users': return await adapter.Users.getById(id);
            case 'employees': return await adapter.Employees.getById(id);
            case 'mcus': return await adapter.MCUs.getById(id);
            case 'departments': return await adapter.Departments.getById(id);
            case 'jobTitles': return await adapter.JobTitles.getById(id);
            case 'vendors': return await adapter.Vendors.getById(id);
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
        return await adapter.ActivityLog.getAll(limit);
    }

    async logActivity(action, entityType, entityId, userId = null) {
        return await adapter.ActivityLog.add({
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
            const db = adapter.getDatabase();
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

    // Expose adapter modules directly for advanced usage
    get users() { return adapter.Users; }
    get employees() { return adapter.Employees; }
    get mcus() { return adapter.MCUs; }
    get departments() { return adapter.Departments; }
    get jobTitles() { return adapter.JobTitles; }
    get vendors() { return adapter.Vendors; }
    get activityLog() { return adapter.ActivityLog; }
}

// Export singleton instance
export const database = new DatabaseService();

// Also export direct access to database instance for legacy code
export const db = adapter.getDatabase();
