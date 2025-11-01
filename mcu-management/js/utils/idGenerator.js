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

    // Check old format: PREFIX-YYYYMMDD-XXXX
    const oldFormatRegex = new RegExp(`^${prefix}-\\d{8}-\\d{4}$`);
    if (oldFormatRegex.test(id)) return true;

    // Check new format: PREFIX-YYYYMMDD-timestamp-random OR PREFIX-timestamp-random
    const newFormatRegex = new RegExp(`^${prefix}-[a-z0-9]+-[A-Z0-9]+$`, 'i');
    if (newFormatRegex.test(id)) return true;

    // Check CHG format with UUID
    if (prefix === 'CHG' && id.startsWith('CHG-')) return true;

    return false;
  }
}

// Export singleton instance
const idGenerator = new IDGenerator();

// Export functions
// NOTE: Using UUID to prevent conflicts with soft-deleted records
export function generateEmployeeId() {
  // Use timestamp-based ID for better readability and sorting
  const dateStr = idGenerator.getCurrentDate();
  const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `EMP-${dateStr}-${timestamp}-${random}`;
}

export function generateMCUId() {
  const dateStr = idGenerator.getCurrentDate();
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `MCU-${dateStr}-${timestamp}-${random}`;
}

export function generateChangeId() {
  // For changes, UUID is fine as they're rarely displayed
  return `CHG-${idGenerator.generateUUID()}`;
}

export function generateJobTitleId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `JOB-${timestamp}-${random}`;
}

export function generateDepartmentId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `DEPT-${timestamp}-${random}`;
}

export function generateStatusId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `STS-${timestamp}-${random}`;
}

export function generateVendorId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `VND-${timestamp}-${random}`;
}

export function generateUserId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `USR-${timestamp}-${random}`;
}

export function generateDoctorId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `DOC-${timestamp}-${random}`;
}

export function generateUUID() {
  return idGenerator.generateUUID();
}

export function validateId(id, prefix) {
  return idGenerator.isValid(id, prefix);
}
