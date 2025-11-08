/**
 * Google Drive Configuration
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Create credentials at: https://console.cloud.google.com/
 *    - Create Service Account "mcu-file-upload"
 *    - Download JSON key to /credentials/
 *
 * 2. Create "MCU Documents" folder in Google Drive
 *    - Note the folder ID from URL
 *
 * 3. Share folder with Service Account email (from JSON file)
 *    - Give "Editor" permission
 *
 * 4. Set environment variables:
 *    GOOGLE_DRIVE_ROOT_FOLDER_ID=<folder-id>
 *    GOOGLE_CREDENTIALS=<json-content>  (in Cloud Functions)
 *
 * 5. Deploy Cloud Function:
 *    firebase deploy --only functions:uploadToGoogleDrive
 */

// Import envConfig to ensure credentials are loaded
import { ENV, initializeEnv } from './envConfig.js';

// Flag to track if env has been initialized
let envInitialized = false;

// Async initialization function (called from fileUploadWidget before use)
export async function initializeGoogleDriveConfig() {
  if (!envInitialized) {
    await initializeEnv();
    envInitialized = true;
  }
}

// Get environment variables safely - lazy evaluation
function getEnvVar(varName) {
  // Special handling for Google Drive config keys
  const viteKey = varName === 'GOOGLE_DRIVE_ROOT_FOLDER_ID'
    ? 'VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID'
    : varName === 'GOOGLE_DRIVE_UPLOAD_ENDPOINT'
    ? 'VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT'
    : `VITE_${varName}`;

  // Try ENV from envConfig (runtime loaded from Vercel env vars or .env files)
  if (ENV && ENV[viteKey]) {
    return ENV[viteKey];
  }

  // Try import.meta.env (Vite build-time variables - embedded at build)
  try {
    if (typeof import !== 'undefined' && import.meta?.env?.[viteKey]) {
      return import.meta.env[viteKey];
    }
  } catch (e) {
    // import.meta might not be available in all contexts
  }

  // Try window.ENV (fallback from env-config.js)
  if (typeof window !== 'undefined' && window.ENV && window.ENV[viteKey]) {
    return window.ENV[viteKey];
  }

  // Fallback to process.env (for Node.js/build time)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[viteKey]) {
      return process.env[viteKey];
    }
  } catch (e) {
    // process might not be available in browser context
  }

  return null;
}

// Google Drive configuration with lazy getters
export const googleDriveConfig = {
  // Google OAuth2 Client ID for gapi
  // Create at: https://console.cloud.google.com/apis/credentials
  get clientId() {
    return getEnvVar('VITE_GOOGLE_CLIENT_ID');
  },

  // Root folder ID for MCU Documents (set from Google Drive URL)
  // Format: https://drive.google.com/drive/folders/1ABC123XYZ... → ID: 1ABC123XYZ...
  get rootFolderId() {
    return getEnvVar('VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID');
  },

  // Vercel Serverless Function endpoint for file uploads (DEPRECATED - using gapi instead)
  // Format: https://vercel-project.vercel.app/api/uploadToGoogleDrive
  get uploadEndpoint() {
    return getEnvVar('VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT');
  },

  // File upload settings
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxImageDimension: 2048, // pixels
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],

  // Folder structure in Google Drive
  // MCU Documents/
  //   EMP001 - John Doe/
  //     file1.pdf
  //     file2.jpg
  //   EMP002 - Jane Smith/
  //     file1.pdf

  /**
   * Get folder name for employee
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name (optional)
   * @returns {string}
   */
  getEmployeeFolderName(employeeId, employeeName = '') {
    if (employeeName) {
      return `${employeeId} - ${employeeName}`;
    }
    return employeeId;
  },

  /**
   * Get download URL for Google Drive file
   * @param {string} googleDriveFileId - File ID from Google Drive
   * @returns {string}
   */
  getDownloadUrl(googleDriveFileId) {
    return `https://drive.google.com/uc?export=download&id=${googleDriveFileId}`;
  },

  /**
   * Get preview URL for Google Drive file (works for images and PDFs)
   * @param {string} googleDriveFileId - File ID from Google Drive
   * @returns {string}
   */
  getPreviewUrl(googleDriveFileId) {
    return `https://drive.google.com/file/d/${googleDriveFileId}/preview`;
  },

  /**
   * Validate configuration
   * @throws {Error} If required config is missing
   */
  validate() {
    if (!this.rootFolderId) {
      throw new Error(
        'Google Drive root folder ID not configured. ' +
        'Set VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID environment variable.'
      );
    }
    if (!this.uploadEndpoint) {
      throw new Error(
        'Google Drive upload endpoint not configured. ' +
        'Set VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT environment variable.'
      );
    }
  },
};

// Example .env.local file:
/*
# Google Drive Configuration
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1ABC123XYZ...
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://region-project.cloudfunctions.net/uploadToGoogleDrive
*/
