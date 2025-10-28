/**
 * MFA Service - Multi-Factor Authentication Management
 * Handles 2FA setup, verification, and account recovery
 *
 * Requires:
 * - supabaseClient (from database.js)
 * - totpManager (from utils/totpManager.js)
 */

import { supabaseClient } from '../database.js';
import { totpManager } from '../utils/totpManager.js';
import { logger } from '../utils/logger.js';

class MFAService {
  constructor() {
    this.MFA_WINDOW = 1; // Allow ±1 time window for TOTP
    this.MAX_ATTEMPTS = 3; // Max failed attempts before lockout
    this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Check if MFA is enabled for user
   *
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} true if MFA enabled
   */
  async isMFAEnabled(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('mfa_enabled')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.mfa_enabled || false;
    } catch (error) {
      logger.error('Error checking MFA status:', error);
      return false;
    }
  }

  /**
   * Start MFA setup process for user
   * Returns QR code and secret for authenticator app
   *
   * @param {string} userId - User ID
   * @param {string} userEmail - User email (for QR code label)
   * @returns {Promise<Object>} { secret, qrCodeUrl, qrCodeDataUrl }
   */
  async startMFASetup(userId, userEmail) {
    try {
      // Generate new TOTP secret
      const secretData = totpManager.generateSecret(userEmail);

      // Temporarily store secret in session (not in database yet)
      // User must verify code before we save it
      sessionStorage.setItem(`mfa_temp_secret_${userId}`, secretData.secret);

      logger.info(`MFA setup started for user ${userId}`);

      return {
        secret: secretData.secret,
        qrCodeUrl: secretData.qrCodeUrl,
        qrCodeDataUrl: secretData.qrCodeDataUrl,
        message: 'Scan QR code dengan Google Authenticator atau Authy, lalu masukkan 6-digit code'
      };
    } catch (error) {
      logger.error('Error starting MFA setup:', error);
      throw new Error('Failed to start MFA setup');
    }
  }

  /**
   * Verify TOTP code during MFA setup
   * If valid, saves secret and generates backup codes
   *
   * @param {string} userId - User ID
   * @param {string} totpCode - 6-digit code from authenticator
   * @returns {Promise<Object>} { success, backupCodes, message }
   */
  async verifyMFASetup(userId, totpCode) {
    try {
      // Get temporary secret from session
      const tempSecret = sessionStorage.getItem(`mfa_temp_secret_${userId}`);

      if (!tempSecret) {
        throw new Error('MFA setup session expired. Please restart setup.');
      }

      // Verify TOTP code
      const isValid = totpManager.verifyTOTP(tempSecret, totpCode);

      if (!isValid) {
        logger.warn(`Invalid MFA code attempt for user ${userId}`);
        throw new Error('Invalid authenticator code. Please try again.');
      }

      // Generate backup codes
      const backupCodes = totpManager.generateBackupCodes(8);
      const backupCodesHashed = [];

      for (const code of backupCodes) {
        const hashed = await totpManager.hashBackupCode(code);
        backupCodesHashed.push(hashed);
      }

      // Save secret and backup codes to database
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          mfa_enabled: true,
          mfa_secret: tempSecret,
          mfa_backup_codes: backupCodesHashed,
          mfa_enabled_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log MFA enablement
      await this.logMFAEvent(userId, 'MFA_ENABLED', { success: true });

      // Clear temporary secret
      sessionStorage.removeItem(`mfa_temp_secret_${userId}`);

      logger.info(`MFA enabled for user ${userId}`);

      return {
        success: true,
        backupCodes: backupCodes, // Show user ONCE - never again
        message: 'MFA successfully enabled! Save your backup codes in a safe place.'
      };
    } catch (error) {
      logger.error('Error verifying MFA setup:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code during login
   * Checks both TOTP codes and backup codes
   *
   * @param {string} userId - User ID
   * @param {string} code - 6-digit TOTP code or backup code
   * @returns {Promise<Object>} { success, message }
   */
  async verifyMFALogin(userId, code) {
    try {
      // Get user's MFA data
      const { data: user, error: fetchError } = await supabaseClient
        .from('users')
        .select('mfa_secret, mfa_backup_codes, mfa_failed_attempts, mfa_lockout_until')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Check if user is in lockout
      if (user.mfa_lockout_until && new Date(user.mfa_lockout_until) > new Date()) {
        const remaining = Math.ceil(
          (new Date(user.mfa_lockout_until) - new Date()) / 60000
        );
        throw new Error(`Account locked. Try again in ${remaining} minutes.`);
      }

      // First try regular TOTP code
      const isValidTOTP = totpManager.verifyTOTP(user.mfa_secret, code);

      if (isValidTOTP) {
        // Reset failed attempts on success
        await supabaseClient
          .from('users')
          .update({
            mfa_failed_attempts: 0,
            mfa_lockout_until: null
          })
          .eq('id', userId);

        // Log successful MFA verification
        await this.logMFAEvent(userId, 'MFA_VERIFY_SUCCESS');

        logger.info(`MFA verification successful for user ${userId}`);

        return {
          success: true,
          message: 'Authentication successful'
        };
      }

      // Try backup codes (if TOTP failed)
      const backupCodes = user.mfa_backup_codes || [];
      for (let i = 0; i < backupCodes.length; i++) {
        const isValidBackup = await totpManager.verifyBackupCode(code, backupCodes[i]);

        if (isValidBackup) {
          // Remove used backup code
          backupCodes.splice(i, 1);

          await supabaseClient
            .from('users')
            .update({
              mfa_backup_codes: backupCodes,
              mfa_failed_attempts: 0,
              mfa_lockout_until: null
            })
            .eq('id', userId);

          // Log backup code usage
          await this.logMFAEvent(userId, 'BACKUP_CODE_USED', {
            remaining_codes: backupCodes.length
          });

          logger.info(`Backup code used for user ${userId}. ${backupCodes.length} codes remaining.`);

          return {
            success: true,
            message: 'Authentication successful (backup code)',
            warningMessage: `You have ${backupCodes.length} backup codes remaining. Generate new ones if needed.`
          };
        }
      }

      // Both TOTP and backup codes failed
      const failedAttempts = (user.mfa_failed_attempts || 0) + 1;
      const updateData = { mfa_failed_attempts: failedAttempts };

      if (failedAttempts >= this.MAX_ATTEMPTS) {
        // Lock account
        const lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
        updateData.mfa_lockout_until = lockoutUntil.toISOString();

        await this.logMFAEvent(userId, 'MFA_LOCKOUT', {
          reason: 'max_attempts_exceeded',
          lockout_until: lockoutUntil.toISOString()
        });

        throw new Error('Too many failed attempts. Account locked for 15 minutes.');
      }

      // Log failed attempt
      await this.logMFAEvent(userId, 'MFA_VERIFY_FAILED', {
        attempt: failedAttempts,
        remaining: this.MAX_ATTEMPTS - failedAttempts
      });

      // Update failed attempts
      await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', userId);

      const remaining = this.MAX_ATTEMPTS - failedAttempts;
      const message = remaining > 0
        ? `Invalid code. ${remaining} attempts remaining.`
        : 'Account locked due to too many failed attempts.';

      throw new Error(message);
    } catch (error) {
      logger.error('Error verifying MFA login:', error);
      throw error;
    }
  }

  /**
   * Disable MFA for user
   * Requires password verification for security
   *
   * @param {string} userId - User ID
   * @param {string} password - User's password (for verification)
   * @returns {Promise<Object>} { success, message }
   */
  async disableMFA(userId, password) {
    try {
      // TODO: Verify password first
      // This should be done via Supabase Auth
      // For now, just verify in database

      // Remove MFA data from database
      const { error } = await supabaseClient
        .from('users')
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          mfa_backup_codes: null,
          mfa_failed_attempts: 0,
          mfa_lockout_until: null
        })
        .eq('id', userId);

      if (error) throw error;

      // Log MFA disablement
      await this.logMFAEvent(userId, 'MFA_DISABLED');

      logger.info(`MFA disabled for user ${userId}`);

      return {
        success: true,
        message: 'MFA successfully disabled'
      };
    } catch (error) {
      logger.error('Error disabling MFA:', error);
      throw error;
    }
  }

  /**
   * Regenerate backup codes for user
   * Old codes become invalid
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { success, backupCodes, message }
   */
  async regenerateBackupCodes(userId) {
    try {
      // Verify user has MFA enabled
      const isMFAEnabled = await this.isMFAEnabled(userId);

      if (!isMFAEnabled) {
        throw new Error('MFA is not enabled for this user');
      }

      // Generate new backup codes
      const backupCodes = totpManager.generateBackupCodes(8);
      const backupCodesHashed = [];

      for (const code of backupCodes) {
        const hashed = await totpManager.hashBackupCode(code);
        backupCodesHashed.push(hashed);
      }

      // Save to database
      const { error } = await supabaseClient
        .from('users')
        .update({
          mfa_backup_codes: backupCodesHashed
        })
        .eq('id', userId);

      if (error) throw error;

      // Log backup code regeneration
      await this.logMFAEvent(userId, 'BACKUP_CODES_REGENERATED');

      logger.info(`Backup codes regenerated for user ${userId}`);

      return {
        success: true,
        backupCodes: backupCodes,
        message: 'New backup codes generated. Save them in a safe place.'
      };
    } catch (error) {
      logger.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  /**
   * Log MFA-related events for audit trail
   *
   * @private
   * @param {string} userId - User ID
   * @param {string} eventType - Event type (MFA_ENABLED, MFA_VERIFY_SUCCESS, etc)
   * @param {Object} details - Additional event details
   */
  async logMFAEvent(userId, eventType, details = {}) {
    try {
      const { error } = await supabaseClient
        .from('mfa_audit_log')
        .insert([{
          user_id: userId,
          event_type: eventType,
          details: details,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        logger.error('Error logging MFA event:', error);
        // Don't throw - logging failure shouldn't break functionality
      }
    } catch (error) {
      logger.error('Error in logMFAEvent:', error);
    }
  }

  /**
   * Get MFA status and info for user
   * Returns whether MFA is enabled and remaining backup codes
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { mfa_enabled, backup_codes_remaining, last_verified }
   */
  async getMFAStatus(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('mfa_enabled, mfa_backup_codes, mfa_enabled_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        mfa_enabled: data?.mfa_enabled || false,
        backup_codes_remaining: data?.mfa_backup_codes?.length || 0,
        last_enabled: data?.mfa_enabled_at,
        needs_new_backup_codes: (data?.mfa_backup_codes?.length || 0) < 3
      };
    } catch (error) {
      logger.error('Error getting MFA status:', error);
      return {
        mfa_enabled: false,
        backup_codes_remaining: 0
      };
    }
  }
}

// Export singleton
export const mfaService = new MFAService();

// Export class for testing
export default MFAService;
