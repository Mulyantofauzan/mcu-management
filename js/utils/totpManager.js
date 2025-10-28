/**
 * TOTP Manager - Handles Time-based One-Time Password generation and verification
 * Used for 2FA/MFA implementation
 *
 * Library: TweetNaCl.js or similar (needs to be added as dependency)
 * Reference: RFC 6238 - TOTP specification
 */

class TOTPManager {
  constructor(options = {}) {
    // TOTP configuration
    this.TIME_STEP = 30; // Time step in seconds (standard: 30)
    this.DIGITS = 6; // Number of digits in OTP (standard: 6)
    this.ALGORITHM = 'SHA1'; // HMAC algorithm (standard: SHA1)

    // Window for code verification (allows time skew)
    this.VERIFY_WINDOW = 1; // Allow ±1 time window (30 seconds tolerance)

    // Custom options
    Object.assign(this, options);
  }

  /**
   * Generate random secret key for new user
   * Returns base32 encoded secret (for QR code generation)
   *
   * @returns {Object} { secret: base32_string, qrCode: url_string }
   */
  generateSecret(userEmail, issuer = 'MCU Management') {
    // Generate 20 random bytes (160 bits) for TOTP secret
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);

    // Convert to base32
    const secret = this.toBase32(randomBytes);

    // Generate QR code URL for authenticator app
    // Format: otpauth://totp/LABEL?secret=SECRET&issuer=ISSUER
    const label = encodeURIComponent(`MCU Management (${userEmail})`);
    const encodedSecret = encodeURIComponent(secret);
    const qrCodeUrl = `otpauth://totp/${label}?secret=${encodedSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret: secret,
      qrCodeUrl: qrCodeUrl,
      qrCodeDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeUrl)}`
    };
  }

  /**
   * Verify TOTP code provided by user
   * Allows for time window tolerance to handle clock skew
   *
   * @param {string} secret - User's secret key (base32)
   * @param {string} token - 6-digit code from authenticator app
   * @returns {boolean} true if valid, false if invalid
   */
  verifyTOTP(secret, token) {
    if (!secret || !token) {
      return false;
    }

    // Token must be exactly 6 digits
    if (!/^\d{6}$/.test(token)) {
      return false;
    }

    try {
      // Get current time counter
      const now = Math.floor(Date.now() / 1000);
      const counter = Math.floor(now / this.TIME_STEP);

      // Check current time window and ±1 windows (allow time skew)
      for (let i = -this.VERIFY_WINDOW; i <= this.VERIFY_WINDOW; i++) {
        const testCounter = counter + i;
        const generatedToken = this.generateTOTP(secret, testCounter);

        if (generatedToken === token) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('TOTP verification error:', error);
      return false;
    }
  }

  /**
   * Generate TOTP code for specific time counter
   * Internal method used by verifyTOTP
   *
   * @private
   * @param {string} secret - Base32 encoded secret
   * @param {number} counter - Time counter (unix_time / 30)
   * @returns {string} 6-digit TOTP code
   */
  generateTOTP(secret, counter) {
    try {
      // Decode base32 secret to bytes
      const secretBytes = this.fromBase32(secret);

      // Create counter bytes (8 bytes, big-endian)
      const counterBytes = this.counterToBytes(counter);

      // Generate HMAC-SHA1
      const hmac = this.hmacSHA1(secretBytes, counterBytes);

      // Dynamic truncation to get 6-digit code
      const offset = hmac[hmac.length - 1] & 0x0f;
      const truncated = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
      );

      const code = (truncated % 1000000).toString().padStart(6, '0');
      return code;
    } catch (error) {
      console.error('TOTP generation error:', error);
      return '';
    }
  }

  /**
   * Convert counter to 8-byte big-endian format
   * @private
   */
  counterToBytes(counter) {
    const bytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      bytes[i] = counter & 0xff;
      counter >>= 8;
    }
    return bytes;
  }

  /**
   * HMAC-SHA1 implementation
   * Uses SubtleCrypto API (built-in, no external library needed)
   * @private
   */
  async hmacSHA1Async(secretBytes, counterBytes) {
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, counterBytes);
    return new Uint8Array(signature);
  }

  /**
   * Synchronous HMAC-SHA1 using CryptoJS
   * If CryptoJS not available, use async version
   * @private
   */
  hmacSHA1(secretBytes, counterBytes) {
    // For synchronous operation, we need CryptoJS library
    // This is a fallback - in production, use async version
    if (typeof CryptoJS !== 'undefined') {
      const secretHex = Array.from(secretBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const counterHex = Array.from(counterBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const hmac = CryptoJS.HmacSHA1(
        CryptoJS.enc.Hex.parse(counterHex),
        CryptoJS.enc.Hex.parse(secretHex)
      );

      return new Uint8Array(
        hmac.toString().match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
    }

    // Throw error if CryptoJS not available
    throw new Error('CryptoJS library required for synchronous HMAC-SHA1. Use hmacSHA1Async instead.');
  }

  /**
   * Convert bytes to base32 encoding
   * @private
   */
  toBase32(bytes) {
    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let base32 = '';

    // Convert bytes to binary string
    for (let i = 0; i < bytes.length; i++) {
      bits += bytes[i].toString(2).padStart(8, '0');
    }

    // Convert 5-bit groups to base32
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.substring(i, i + 5).padEnd(5, '0');
      base32 += BASE32_ALPHABET[parseInt(chunk, 2)];
    }

    return base32;
  }

  /**
   * Convert base32 string to bytes
   * @private
   */
  fromBase32(base32) {
    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.toUpperCase();

    let bits = '';
    let bytes = [];

    // Convert base32 to binary string
    for (let i = 0; i < base32.length; i++) {
      const char = base32[i];
      const value = BASE32_ALPHABET.indexOf(char);

      if (value === -1) {
        throw new Error(`Invalid base32 character: ${char}`);
      }

      bits += value.toString(2).padStart(5, '0');
    }

    // Convert 8-bit groups to bytes
    for (let i = 0; i < bits.length - 7; i += 8) {
      const byte = parseInt(bits.substring(i, i + 8), 2);
      bytes.push(byte);
    }

    return new Uint8Array(bytes);
  }

  /**
   * Generate backup codes for account recovery
   * User should save these in a secure location
   *
   * @param {number} count - Number of codes to generate (default: 8)
   * @returns {Array} Array of backup codes (plaintext)
   */
  generateBackupCodes(count = 8) {
    const codes = [];

    for (let i = 0; i < count; i++) {
      // Generate 4 groups of 4 random characters
      // Format: XXXX-XXXX-XXXX-XXXX
      const groups = [];

      for (let j = 0; j < 4; j++) {
        const bytes = new Uint8Array(4);
        crypto.getRandomValues(bytes);

        // Convert to base32-like characters (uppercase alphanumeric, no confusing chars)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let group = '';

        for (let k = 0; k < 4; k++) {
          group += chars[bytes[k] % chars.length];
        }

        groups.push(group);
      }

      codes.push(groups.join('-'));
    }

    return codes;
  }

  /**
   * Hash backup code for secure storage
   * Should be stored hashed in database, never plaintext
   *
   * @async
   * @param {string} code - Plaintext backup code
   * @returns {Promise<string>} Hashed code
   */
  async hashBackupCode(code) {
    // Remove dashes
    const normalized = code.replace(/-/g, '');

    // Use SubtleCrypto to hash
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify backup code against stored hash
   *
   * @async
   * @param {string} code - Plaintext backup code from user
   * @param {string} hash - Stored hash from database
   * @returns {Promise<boolean>} true if code matches hash
   */
  async verifyBackupCode(code, hash) {
    const codeHash = await this.hashBackupCode(code);
    return codeHash === hash;
  }

  /**
   * Get current TOTP code for display/debugging
   * Shows what the next code will be
   *
   * @param {string} secret - User's secret key
   * @returns {string} Current 6-digit code
   */
  getCurrentCode(secret) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const counter = Math.floor(now / this.TIME_STEP);
      return this.generateTOTP(secret, counter);
    } catch (error) {
      console.error('Error getting current code:', error);
      return '';
    }
  }

  /**
   * Get time remaining for current code (in seconds)
   * Shows how many seconds until code changes
   *
   * @returns {number} Seconds remaining (0-29)
   */
  getTimeRemaining() {
    return this.TIME_STEP - (Math.floor(Date.now() / 1000) % this.TIME_STEP);
  }
}

// Export as singleton
export const totpManager = new TOTPManager();

// Also export class for testing
export default TOTPManager;
