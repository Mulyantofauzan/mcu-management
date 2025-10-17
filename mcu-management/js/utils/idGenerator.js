/**
 * ID Generator Utility
 * Generates unique IDs with format: PREFIX-YYYYMMDD-XXXX
 * XXXX is an incrementing counter per day
 */

class IDGenerator {
  constructor() {
    this.counters = this.loadCounters();
  }

  loadCounters() {
    const stored = localStorage.getItem('idCounters');
    return stored ? JSON.parse(stored) : {};
  }

  saveCounters() {
    localStorage.setItem('idCounters', JSON.stringify(this.counters));
  }

  getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  generate(prefix) {
    const dateStr = this.getCurrentDate();
    const key = `${prefix}-${dateStr}`;

    // Initialize counter for this prefix-date combination
    if (!this.counters[key]) {
      this.counters[key] = 0;
    }

    // Increment counter
    this.counters[key]++;

    // Format counter with leading zeros (4 digits)
    const counter = String(this.counters[key]).padStart(4, '0');

    // Save counters
    this.saveCounters();

    // Generate ID
    const id = `${prefix}-${dateStr}-${counter}`;

    return id;
  }

  /**
   * Generate UUID v4 (alternative method)
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Validate ID format
   */
  isValid(id, prefix) {
    if (!id || typeof id !== 'string') return false;

    // Check if it's UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return true;

    // Check PREFIX-YYYYMMDD-XXXX format
    const regex = new RegExp(`^${prefix}-\\d{8}-\\d{4}$`);
    return regex.test(id);
  }
}

// Export singleton instance
const idGenerator = new IDGenerator();

// Export functions
export function generateEmployeeId() {
  return idGenerator.generate('EMP');
}

export function generateMCUId() {
  return idGenerator.generate('MCU');
}

export function generateChangeId() {
  return idGenerator.generate('CHG');
}

export function generateJobTitleId() {
  return idGenerator.generate('JOB');
}

export function generateDepartmentId() {
  return idGenerator.generate('DEPT');
}

export function generateStatusId() {
  return idGenerator.generate('STS');
}

export function generateVendorId() {
  return idGenerator.generate('VND');
}

export function generateUserId() {
  return idGenerator.generate('USR');
}

export function generateUUID() {
  return idGenerator.generateUUID();
}

export function validateId(id, prefix) {
  return idGenerator.isValid(id, prefix);
}
