/**
 * Google Drive File Upload Service
 * Handles file uploads to Google Drive for MCU documents
 * Stores only metadata links in Supabase
 */

import { database } from './database.js';
import { logger } from '../utils/logger.js';

class GoogleDriveService {
  constructor() {
    this.rootFolderId = null; // Will be set from config
    this.uploadEndpoint = null; // Firebase Cloud Function URL
  }

  /**
   * Initialize with configuration
   * @param {string} rootFolderId - Google Drive root folder ID for MCU documents
   * @param {string} uploadEndpoint - Firebase Cloud Function endpoint for uploads
   */
  async init(rootFolderId, uploadEndpoint) {
    this.rootFolderId = rootFolderId;
    this.uploadEndpoint = uploadEndpoint;
    logger.info(`Google Drive service initialized. Root folder: ${rootFolderId}`);
  }

  /**
   * Get MIME type from filename (fallback for unreliable file.type)
   * @param {string} fileName - File name
   * @returns {string|null} - MIME type or null
   */
  getMimeTypeFromFileName(fileName) {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
    };

    if (!fileName || typeof fileName !== 'string') {
      logger.warn(`Invalid fileName for MIME type detection: ${fileName}`);
      return null;
    }

    const extension = fileName.toLowerCase().split('.').pop();
    const detected = mimeTypes[extension];

    if (detected) {
      logger.info(`Detected MIME type from filename "${fileName}": ${detected}`);
    } else {
      logger.warn(`Could not detect MIME type for extension: ${extension}`);
    }

    return detected || null;
  }

  /**
   * Ensure file has reliable MIME type - override file.type if necessary
   * @param {File} file - File object
   * @returns {File} - File with corrected MIME type property
   */
  ensureMimeType(file) {
    // Try all methods to get the correct MIME type
    let mimeType = null;

    // Method 1: Check if file already has correct type
    if (file.type && file.type !== 'application/octet-stream') {
      mimeType = file.type;
    }

    // Method 2: Try to detect from filename
    if (!mimeType) {
      mimeType = this.getMimeTypeFromFileName(file.name);
    }

    // Method 3: Check custom property if it exists
    if (!mimeType && file.__detectedMimeType) {
      mimeType = file.__detectedMimeType;
    }

    // If we found a MIME type, create a new File with it properly set
    if (mimeType && file.type !== mimeType) {
      logger.info(`Overriding file MIME type from "${file.type}" to "${mimeType}"`);
      try {
        // Create a new File with the correct type
        const newFile = new File([file], file.name, {
          type: mimeType,
          lastModified: file.lastModified,
        });
        // Also set it as a property for extra safety
        Object.defineProperty(newFile, 'type', {
          value: mimeType,
          writable: false
        });
        return newFile;
      } catch (e) {
        logger.warn(`Failed to create new File object: ${e.message}`);
      }
    }

    return file;
  }

  /**
   * Upload file to Google Drive
   * Frontend calls this, which triggers backend Cloud Function
   * @param {File} file - File object from input
   * @param {string} employeeId - Employee ID for folder organization
   * @param {Object} currentUser - Current user object for logging
   * @returns {Object} - Upload result with metadata
   */
  async uploadFile(file, employeeId, currentUser) {
    try {
      if (!this.uploadEndpoint) {
        throw new Error('Google Drive service not initialized. Check uploadEndpoint configuration.');
      }

      if (!file || !employeeId) {
        throw new Error('File and employeeId are required');
      }

      // Ensure file has correct MIME type
      file = this.ensureMimeType(file);

      // Validate file size before compression (should be pre-compressed by frontend)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // Validate file type - should now have correct MIME type after ensureMimeType()
      const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
      let actualMimeType = file.type;
      logger.info(`File after ensureMimeType: type="${actualMimeType}", filename="${file.name}"`);

      if (!ALLOWED_TYPES.includes(actualMimeType)) {
        throw new Error(`File type not allowed. Allowed: PDF, JPEG, PNG. Provided: ${file.type || 'unknown'}`);
      }

      // Prepare form data for upload
      const formData = new FormData();
      formData.append('file', file, file.name); // Include filename and type
      formData.append('employeeId', employeeId);
      formData.append('userId', currentUser?.userId || 'unknown');
      formData.append('userName', currentUser?.displayName || 'Unknown');
      // Pass the actualMimeType we validated, not the unreliable file.type
      formData.append('mimeType', actualMimeType);

      // Call Cloud Function endpoint
      logger.info(`Uploading file: ${file.name} for employee ${employeeId}`);
      const response = await fetch(this.uploadEndpoint, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      // Log the upload activity
      if (currentUser) {
        await database.logActivity('create', 'MCU_FILE', result.fileId, currentUser.userId,
          `Uploaded file: ${file.name}. Employee: ${employeeId}. Size: ${(file.size / 1024).toFixed(2)}KB. Google Drive: ${result.googleDriveFileId}`);
      }

      logger.info(`File uploaded successfully: ${result.fileId}`);
      return result;
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Get all files for an employee
   * @param {string} employeeId - Employee ID
   * @returns {Array} - Array of file metadata
   */
  async getEmployeeFiles(employeeId) {
    try {
      const files = await database.query('mcuFiles',
        file => file.employeeId === employeeId && !file.deletedAt
      );
      return files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    } catch (error) {
      logger.error('Error fetching employee files:', error);
      throw error;
    }
  }

  /**
   * Delete file (soft delete)
   * @param {string} fileId - File metadata ID in Supabase
   * @param {Object} currentUser - Current user
   * @returns {boolean}
   */
  async deleteFile(fileId, currentUser) {
    try {
      const file = await database.get('mcuFiles', fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Soft delete in Supabase
      await database.update('mcuFiles', fileId, {
        deletedAt: new Date().toISOString()
      });

      // Log activity
      if (currentUser) {
        await database.logActivity('delete', 'MCU_FILE', fileId, currentUser.userId,
          `Deleted file: ${file.fileName}. Employee: ${file.employeeId}. Google Drive: ${file.googleDriveFileId}`);
      }

      logger.info(`File soft deleted: ${fileId}`);
      return true;
    } catch (error) {
      logger.error('File deletion error:', error);
      throw error;
    }
  }

  /**
   * Get file download URL
   * @param {string} googleDriveFileId - Google Drive file ID
   * @returns {string} - Download URL
   */
  getDownloadUrl(googleDriveFileId) {
    // Google Drive direct download URL
    return `https://drive.google.com/uc?export=download&id=${googleDriveFileId}`;
  }

  /**
   * Get file preview URL (for images and PDFs)
   * @param {string} googleDriveFileId - Google Drive file ID
   * @returns {string} - Preview URL
   */
  getPreviewUrl(googleDriveFileId) {
    // Google Drive preview URL (works for images and PDFs)
    return `https://drive.google.com/file/d/${googleDriveFileId}/preview`;
  }
}

export const googleDriveService = new GoogleDriveService();
