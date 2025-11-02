/**
 * IndexedDB Database Service using Dexie
 * This file will be loaded via CDN in production or can be bundled
 */

// Note: Dexie will be loaded via CDN in HTML
// This is a wrapper service for the database operations

class MCUDatabase {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    // Check if Dexie is available
    if (typeof Dexie === 'undefined') {

      // Fallback to localStorage mode
      this.useFallback = true;
      return;
    }

    this.db = new Dexie('MCU_Database');

    // Define schema - version 2 adds 'active' field to users
    this.db.version(1).stores({
      employees: 'employeeId, name, departmentId, jobTitleId, activeStatus, deletedAt',
      mcus: 'mcuId, employeeId, mcuDate, mcuType, status, deletedAt, lastUpdatedTimestamp',
      mcuChanges: 'changeId, mcuId, changedAt, changedBy',
      jobTitles: 'jobTitleId, name',
      departments: 'departmentId, name',
      statusMCU: 'statusId, name',
      vendors: 'vendorId, name',
      users: 'userId, username, role',
      activityLog: '++id, timestamp, action, entityType, entityId'
    });

    // Version 2: Add 'active' index to users table
    this.db.version(2).stores({
      users: 'userId, username, role, active'
    });

    // Version 3: Add doctors table for referral data
    this.db.version(3).stores({
      doctors: '++id, name'
    });

    // Version 4: Clear old doctor data with text IDs
    this.db.version(4).stores({
      doctors: '++id, name'
    }).upgrade(db => {
      // Clear all old doctors data to prevent sync errors
      // Old data had text IDs (mhho7xe703956), new data uses numeric IDs (1, 2, 3)
      return db.doctors.clear();
    });

    try {
      await this.db.open();
      console.log('IndexedDB initialized successfully (version ' + this.db.verno + ')');
    } catch (error) {
      // If version conflict, delete and recreate
      if (error.name === 'VersionError') {

        await this.db.delete();
        // Recreate with correct version
        await this.db.open();

      } else {
        throw error;
      }
    }
  }

  // Generic CRUD operations
  async add(tableName, data) {
    if (this.useFallback) {
      return this.fallbackAdd(tableName, data);
    }
    try {
      const id = await this.db[tableName].add(data);
      this.logActivity('create', tableName, data);
      return id;
    } catch (error) {

      throw error;
    }
  }

  async get(tableName, id) {
    if (this.useFallback) {
      return this.fallbackGet(tableName, id);
    }
    try {
      return await this.db[tableName].get(id);
    } catch (error) {

      throw error;
    }
  }

  async getAll(tableName) {
    if (this.useFallback) {
      return this.fallbackGetAll(tableName);
    }
    try {
      return await this.db[tableName].toArray();
    } catch (error) {

      throw error;
    }
  }

  async update(tableName, id, data) {
    if (this.useFallback) {
      return this.fallbackUpdate(tableName, id, data);
    }
    try {
      await this.db[tableName].update(id, data);
      this.logActivity('update', tableName, { id, ...data });
      return true;
    } catch (error) {

      throw error;
    }
  }

  async delete(tableName, id) {
    if (this.useFallback) {
      return this.fallbackDelete(tableName, id);
    }
    try {
      await this.db[tableName].delete(id);
      this.logActivity('delete', tableName, { id });
      return true;
    } catch (error) {

      throw error;
    }
  }

  async query(tableName, filterFn) {
    if (this.useFallback) {
      return this.fallbackQuery(tableName, filterFn);
    }
    try {
      return await this.db[tableName].filter(filterFn).toArray();
    } catch (error) {

      throw error;
    }
  }

  // Activity logging
  async logActivity(action, entityType, data) {
    const activity = {
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId: data.id || data.employeeId || data.mcuId || null,
      data: JSON.stringify(data)
    };

    if (this.useFallback) {
      const logs = JSON.parse(localStorage.getItem('activityLog') || '[]');
      logs.unshift(activity);
      // Keep only last 100 activities
      if (logs.length > 100) logs.splice(100);
      localStorage.setItem('activityLog', JSON.stringify(logs));
    } else if (this.db) {
      try {
        await this.db.activityLog.add(activity);
        // Clean up old logs (keep last 100)
        const count = await this.db.activityLog.count();
        if (count > 100) {
          const oldLogs = await this.db.activityLog
            .orderBy('timestamp')
            .limit(count - 100)
            .toArray();
          for (const log of oldLogs) {
            await this.db.activityLog.delete(log.id);
          }
        }
      } catch (error) {

      }
    }
  }

  async getActivityLog(limit = 20) {
    if (this.useFallback) {
      const logs = JSON.parse(localStorage.getItem('activityLog') || '[]');
      return logs.slice(0, limit);
    }
    try {
      return await this.db.activityLog
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {

      return [];
    }
  }

  // LocalStorage fallback methods
  fallbackAdd(tableName, data) {
    const items = JSON.parse(localStorage.getItem(tableName) || '[]');
    items.push(data);
    localStorage.setItem(tableName, JSON.stringify(items));
    return data.id || data[Object.keys(data)[0]];
  }

  fallbackGet(tableName, id) {
    const items = JSON.parse(localStorage.getItem(tableName) || '[]');
    const idKey = Object.keys(items[0] || {})[0];
    return items.find(item => item[idKey] === id);
  }

  fallbackGetAll(tableName) {
    return JSON.parse(localStorage.getItem(tableName) || '[]');
  }

  fallbackUpdate(tableName, id, data) {
    const items = JSON.parse(localStorage.getItem(tableName) || '[]');
    const idKey = Object.keys(items[0] || {})[0];
    const index = items.findIndex(item => item[idKey] === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data };
      localStorage.setItem(tableName, JSON.stringify(items));
      return true;
    }
    return false;
  }

  fallbackDelete(tableName, id) {
    const items = JSON.parse(localStorage.getItem(tableName) || '[]');
    const idKey = Object.keys(items[0] || {})[0];
    const filtered = items.filter(item => item[idKey] !== id);
    localStorage.setItem(tableName, JSON.stringify(filtered));
    return true;
  }

  fallbackQuery(tableName, filterFn) {
    const items = JSON.parse(localStorage.getItem(tableName) || '[]');
    return items.filter(filterFn);
  }

  // Clear all data
  async clearAll() {
    if (this.useFallback) {
      const keys = ['employees', 'mcus', 'mcuChanges', 'jobTitles', 'departments', 'statusMCU', 'vendors', 'users', 'activityLog'];
      keys.forEach(key => localStorage.removeItem(key));
    } else if (this.db) {
      await this.db.delete();
      await this.init();
    }
  }
}

// Export singleton instance
export const database = new MCUDatabase();
