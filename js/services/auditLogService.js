/**
 * Audit Log Service - Comprehensive Activity Logging
 * Logs all user actions for medical data compliance & security audits
 *
 * Required for:
 * - HIPAA compliance
 * - UU Perlindungan Data Pribadi (PDP) compliance
 * - Security incident investigation
 * - User behavior tracking
 *
 * Requires:
 * - supabaseClient (from database.js)
 * - authService (from services/authService.js)
 * - logger (from utils/logger.js)
 */

import { supabaseClient } from '../database.js';
import { authService } from './authService.js';
import { logger } from '../utils/logger.js';

class AuditLogService {
  constructor() {
    // Event categories for classification
    this.EVENT_TYPES = {
      // Authentication events
      LOGIN_SUCCESS: 'LOGIN_SUCCESS',
      LOGIN_FAILED: 'LOGIN_FAILED',
      LOGOUT: 'LOGOUT',
      MFA_ENABLED: 'MFA_ENABLED',
      MFA_DISABLED: 'MFA_DISABLED',
      MFA_VERIFY_SUCCESS: 'MFA_VERIFY_SUCCESS',
      MFA_VERIFY_FAILED: 'MFA_VERIFY_FAILED',
      PASSWORD_CHANGE: 'PASSWORD_CHANGE',

      // Data access
      VIEW_PATIENT_RECORD: 'VIEW_PATIENT_RECORD',
      VIEW_MCU_RESULT: 'VIEW_MCU_RESULT',
      VIEW_FOLLOW_UP: 'VIEW_FOLLOW_UP',
      VIEW_DASHBOARD: 'VIEW_DASHBOARD',
      EXPORT_PATIENT_DATA: 'EXPORT_PATIENT_DATA',
      EXPORT_REPORT: 'EXPORT_REPORT',

      // Data modification
      CREATE_PATIENT: 'CREATE_PATIENT',
      UPDATE_PATIENT: 'UPDATE_PATIENT',
      DELETE_PATIENT: 'DELETE_PATIENT',
      CREATE_MCU_RECORD: 'CREATE_MCU_RECORD',
      UPDATE_MCU_RECORD: 'UPDATE_MCU_RECORD',
      DELETE_MCU_RECORD: 'DELETE_MCU_RECORD',
      CREATE_FOLLOW_UP: 'CREATE_FOLLOW_UP',
      UPDATE_FOLLOW_UP: 'UPDATE_FOLLOW_UP',
      DELETE_FOLLOW_UP: 'DELETE_FOLLOW_UP',

      // Authorization
      PERMISSION_DENIED: 'PERMISSION_DENIED',
      UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
      ROLE_CHANGED: 'ROLE_CHANGED',

      // System events
      BACKUP_CREATED: 'BACKUP_CREATED',
      BACKUP_RESTORED: 'BACKUP_RESTORED',
      SYSTEM_CONFIGURATION_CHANGED: 'SYSTEM_CONFIGURATION_CHANGED'
    };

    // Severity levels
    this.SEVERITY = {
      INFO: 'INFO',
      WARNING: 'WARNING',
      CRITICAL: 'CRITICAL'
    };

    // Whether to also log to browser console in development
    this.DEBUG_MODE = isDevelopment();
  }

  /**
   * Main logging function
   * Logs user actions to database with full context
   *
   * @async
   * @param {Object} params - Log parameters
   * @param {string} params.type - Event type (use EVENT_TYPES constants)
   * @param {string} params.resourceType - Type of resource (PATIENT_DATA, MCU_RECORD, etc)
   * @param {string} params.resourceId - ID of affected resource
   * @param {string} params.result - Result status (SUCCESS, FAILED, DENIED)
   * @param {Object} params.details - Additional context (old values, new values, etc)
   * @param {string} params.severity - Event severity (INFO, WARNING, CRITICAL)
   *
   * @returns {Promise<Object>} { success, logId, message }
   *
   * @example
   * await auditLog.log({
   *   type: 'VIEW_PATIENT_RECORD',
   *   resourceType: 'PATIENT_DATA',
   *   resourceId: 'patient-123',
   *   result: 'SUCCESS',
   *   severity: 'INFO'
   * });
   */
  async log(params = {}) {
    try {
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        logger.warn('Audit log called without authenticated user');
        return { success: false, message: 'No authenticated user' };
      }

      // Construct audit log entry
      const auditEntry = {
        timestamp: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.displayName || 'Unknown',
        user_role: currentUser.role || 'Unknown',
        event_type: params.type || 'UNKNOWN',
        resource_type: params.resourceType || null,
        resource_id: params.resourceId || null,
        result: params.result || 'UNKNOWN',
        severity: params.severity || this.SEVERITY.INFO,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        details: params.details || {},
        created_at: new Date().toISOString()
      };

      // Save to database
      const { data, error } = await supabaseClient
        .from('audit_logs')
        .insert([auditEntry])
        .select('id')
        .single();

      if (error) {
        logger.error('Error saving audit log:', error);
        // Don't throw - audit logging failure shouldn't break app
        return { success: false, message: error.message };
      }

      // Log to console in development
      if (this.DEBUG_MODE) {
        console.log('[AUDIT]', auditEntry);
      }

      return {
        success: true,
        logId: data?.id,
        message: 'Audit log saved'
      };
    } catch (error) {
      logger.error('Unexpected error in audit logging:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Log authentication success
   *
   * @async
   * @param {string} userId - User ID
   * @param {Object} details - Optional additional details
   */
  async logLoginSuccess(userId, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.LOGIN_SUCCESS,
      resourceType: 'AUTHENTICATION',
      resourceId: userId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: { ...details, method: 'password' }
    });
  }

  /**
   * Log authentication failure
   *
   * @async
   * @param {string} username - Username attempted
   * @param {string} reason - Failure reason (invalid_password, user_not_found, account_locked)
   * @param {Object} details - Optional additional details
   */
  async logLoginFailed(username, reason = 'invalid_credentials', details = {}) {
    return this.log({
      type: this.EVENT_TYPES.LOGIN_FAILED,
      resourceType: 'AUTHENTICATION',
      resourceId: username,
      result: 'FAILED',
      severity: this.SEVERITY.WARNING,
      details: { ...details, reason, method: 'password' }
    });
  }

  /**
   * Log user logout
   *
   * @async
   * @param {Object} details - Optional additional details
   */
  async logLogout(details = {}) {
    const user = authService.getCurrentUser();
    if (!user) return;

    return this.log({
      type: this.EVENT_TYPES.LOGOUT,
      resourceType: 'AUTHENTICATION',
      resourceId: user.id,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: { ...details, method: 'user_initiated' }
    });
  }

  /**
   * Log patient record view
   *
   * @async
   * @param {string} patientId - Patient ID
   * @param {Object} details - Optional additional details
   */
  async logViewPatientRecord(patientId, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.VIEW_PATIENT_RECORD,
      resourceType: 'PATIENT_DATA',
      resourceId: patientId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details
    });
  }

  /**
   * Log MCU record view
   *
   * @async
   * @param {string} mcuId - MCU Record ID
   * @param {string} patientId - Associated patient ID
   * @param {Object} details - Optional additional details
   */
  async logViewMCUResult(mcuId, patientId, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.VIEW_MCU_RESULT,
      resourceType: 'MCU_RECORD',
      resourceId: mcuId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: { ...details, patient_id: patientId }
    });
  }

  /**
   * Log patient data creation
   *
   * @async
   * @param {string} patientId - New patient ID
   * @param {Object} details - Patient data that was created
   */
  async logCreatePatient(patientId, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.CREATE_PATIENT,
      resourceType: 'PATIENT_DATA',
      resourceId: patientId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: {
        ...details,
        // Don't log sensitive fields like contact info
        action: 'patient_created'
      }
    });
  }

  /**
   * Log patient data modification
   *
   * @async
   * @param {string} patientId - Patient ID
   * @param {Object} changes - Changed fields (old values, new values)
   * @param {Object} details - Optional additional details
   */
  async logUpdatePatient(patientId, changes = {}, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.UPDATE_PATIENT,
      resourceType: 'PATIENT_DATA',
      resourceId: patientId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: {
        ...details,
        changes: this.sanitizeChanges(changes),
        action: 'patient_updated'
      }
    });
  }

  /**
   * Log patient record deletion
   *
   * @async
   * @param {string} patientId - Patient ID
   * @param {Object} details - Optional additional details (reason, etc)
   */
  async logDeletePatient(patientId, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.DELETE_PATIENT,
      resourceType: 'PATIENT_DATA',
      resourceId: patientId,
      result: 'SUCCESS',
      severity: this.SEVERITY.WARNING,
      details: {
        ...details,
        action: 'patient_deleted_soft'
      }
    });
  }

  /**
   * Log MCU record creation
   *
   * @async
   * @param {string} mcuId - MCU Record ID
   * @param {string} patientId - Associated patient ID
   * @param {Object} details - Optional additional details
   */
  async logCreateMCU(mcuId, patientId, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.CREATE_MCU_RECORD,
      resourceType: 'MCU_RECORD',
      resourceId: mcuId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: {
        ...details,
        patient_id: patientId,
        action: 'mcu_created'
      }
    });
  }

  /**
   * Log MCU record update
   *
   * @async
   * @param {string} mcuId - MCU Record ID
   * @param {string} patientId - Associated patient ID
   * @param {Object} changes - Changed fields
   * @param {Object} details - Optional additional details
   */
  async logUpdateMCU(mcuId, patientId, changes = {}, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.UPDATE_MCU_RECORD,
      resourceType: 'MCU_RECORD',
      resourceId: mcuId,
      result: 'SUCCESS',
      severity: this.SEVERITY.INFO,
      details: {
        ...details,
        patient_id: patientId,
        changes: this.sanitizeChanges(changes),
        action: 'mcu_updated'
      }
    });
  }

  /**
   * Log authorization failure / unauthorized access attempt
   *
   * @async
   * @param {string} resourceType - Type of resource attempted
   * @param {string} resourceId - ID of resource
   * @param {string} reason - Reason for denial
   * @param {Object} details - Optional additional details
   */
  async logUnauthorizedAccess(resourceType, resourceId, reason, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.UNAUTHORIZED_ACCESS,
      resourceType,
      resourceId,
      result: 'DENIED',
      severity: this.SEVERITY.WARNING,
      details: {
        ...details,
        reason,
        action: 'unauthorized_access_attempt'
      }
    });
  }

  /**
   * Log data export
   *
   * @async
   * @param {string} exportType - Type of export (patient_data, report, etc)
   * @param {Object} details - Export details (number of records, format, etc)
   */
  async logExport(exportType, details = {}) {
    return this.log({
      type: this.EVENT_TYPES.EXPORT_PATIENT_DATA,
      resourceType: 'EXPORT',
      resourceId: exportType,
      result: 'SUCCESS',
      severity: this.SEVERITY.WARNING, // Exports are important to track
      details: {
        ...details,
        export_type: exportType,
        action: 'data_exported'
      }
    });
  }

  /**
   * Log password change
   *
   * @async
   * @param {Object} details - Optional additional details
   */
  async logPasswordChange(details = {}) {
    return this.log({
      type: this.EVENT_TYPES.PASSWORD_CHANGE,
      resourceType: 'AUTHENTICATION',
      result: 'SUCCESS',
      severity: this.SEVERITY.WARNING,
      details: {
        ...details,
        action: 'password_changed'
      }
    });
  }

  /**
   * Sanitize sensitive data from changes log
   * Don't log passwords, PII, medical data directly
   *
   * @private
   * @param {Object} changes - Changes object
   * @returns {Object} Sanitized changes
   */
  sanitizeChanges(changes) {
    const sanitized = { ...changes };
    const sensitiveFields = ['password', 'phone', 'email', 'nik', 'ktp', 'medical_history'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * Get client's IP address
   * Attempts to get from multiple sources
   *
   * @private
   * @returns {Promise<string>} IP address or 'UNKNOWN'
   */
  async getClientIP() {
    try {
      // Try to get from Cloudflare headers (if available)
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'UNKNOWN';
    } catch (error) {
      // Fallback: use placeholder
      return 'BROWSER_LOCAL';
    }
  }

  /**
   * Query audit logs with filters
   * For admin audit trail viewing
   *
   * @async
   * @param {Object} filters - Filter criteria
   * @param {string} filters.userId - Filter by user ID
   * @param {string} filters.eventType - Filter by event type
   * @param {string} filters.resourceType - Filter by resource type
   * @param {string} filters.startDate - Filter by start date (ISO string)
   * @param {string} filters.endDate - Filter by end date (ISO string)
   * @param {number} filters.limit - Number of records (default: 100, max: 1000)
   *
   * @returns {Promise<Array>} Array of audit log entries
   */
  async queryLogs(filters = {}) {
    try {
      let query = supabaseClient
        .from('audit_logs')
        .select('*');

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const limit = Math.min(filters.limit || 100, 1000);
      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error querying audit logs:', error);
      return [];
    }
  }

  /**
   * Generate audit summary report
   * Shows activity statistics for time period
   *
   * @async
   * @param {Object} params - Report parameters
   * @param {string} params.startDate - Start date (ISO string)
   * @param {string} params.endDate - End date (ISO string)
   *
   * @returns {Promise<Object>} Summary statistics
   */
  async generateSummaryReport(params = {}) {
    try {
      const logs = await this.queryLogs({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 10000
      });

      const summary = {
        total_events: logs.length,
        events_by_type: {},
        events_by_user: {},
        events_by_severity: {},
        failed_logins: 0,
        unauthorized_access: 0,
        data_exports: 0,
        critical_events: []
      };

      logs.forEach(log => {
        // Count by type
        summary.events_by_type[log.event_type] = (summary.events_by_type[log.event_type] || 0) + 1;

        // Count by user
        summary.events_by_user[log.user_name] = (summary.events_by_user[log.user_name] || 0) + 1;

        // Count by severity
        summary.events_by_severity[log.severity] = (summary.events_by_severity[log.severity] || 0) + 1;

        // Track specific concerns
        if (log.event_type === 'LOGIN_FAILED') summary.failed_logins++;
        if (log.event_type === 'UNAUTHORIZED_ACCESS') summary.unauthorized_access++;
        if (log.event_type === 'EXPORT_PATIENT_DATA') summary.data_exports++;

        // Collect critical events
        if (log.severity === 'CRITICAL') {
          summary.critical_events.push({
            timestamp: log.timestamp,
            event_type: log.event_type,
            user: log.user_name,
            resource: `${log.resource_type}:${log.resource_id}`
          });
        }
      });

      return summary;
    } catch (error) {
      logger.error('Error generating audit summary:', error);
      return null;
    }
  }
}

// Export singleton
export const auditLog = new AuditLogService();

// Export class for testing
export default AuditLogService;
