/**
 * File Compression Utility
 * Compresses files before upload to Google Drive
 * Uses built-in browser compression and library support
 */

import { logger } from './logger.js';

class FileCompression {
  constructor() {
    this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB target
    this.MAX_DIMENSION = 2048; // Max width/height for images
  }

  /**
   * Compress file before upload
   * @param {File} file - File to compress
   * @returns {Promise<File>} - Compressed file
   */
  async compressFile(file) {
    try {
      logger.info(`Compressing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      // If file is already small, no need to compress
      if (file.size < this.MAX_FILE_SIZE) {
        logger.info(`File size is acceptable (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return file;
      }

      // Handle different file types
      if (file.type.startsWith('image/')) {
        return await this.compressImage(file);
      } else if (file.type === 'application/pdf') {
        return await this.compressPDF(file);
      } else {
        return file; // No compression for other types
      }
    } catch (error) {
      logger.error('File compression error:', error);
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Compress image using canvas
   * @param {File} file - Image file
   * @returns {Promise<File>} - Compressed image
   */
  async compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      // Preserve original MIME type
      const originalType = file.type || 'image/jpeg';

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions (max 2048)
          if (width > height && width > this.MAX_DIMENSION) {
            height = Math.round((height * this.MAX_DIMENSION) / width);
            width = this.MAX_DIMENSION;
          } else if (height > this.MAX_DIMENSION) {
            width = Math.round((width * this.MAX_DIMENSION) / height);
            height = this.MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          // Use 'image/jpeg' for canvas.toBlob (always outputs JPEG),
          // but preserve original file type in File metadata for validation
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: originalType,  // Preserve original MIME type
                lastModified: file.lastModified,
              });

              logger.info(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.8 // JPEG quality: 80%
          );
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = event.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Note: PDF compression would require a library like PDFKit or pdf-lib
   * For now, we'll just validate the size and throw if too large
   * In production, consider using pdf-lib or backend compression
   * @param {File} file - PDF file
   * @returns {Promise<File>}
   */
  async compressPDF(file) {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `PDF file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). ` +
        `Maximum allowed size is 5MB. Please reduce file size using a PDF compression tool.`
      );
    }
    return file;
  }

  /**
   * Validate file before compression
   * @param {File} file - File to validate
   * @throws {Error} - If file is invalid
   */
  validateFile(file) {
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!file) {
      throw new Error('No file selected');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type not allowed. Supported: PDF, JPEG, PNG. Provided: ${file.type}`);
    }

    // File size check (before compression)
    const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB max to attempt compression
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error(`File size is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed: 50MB.`);
    }
  }

  /**
   * Get human-readable file size
   * @param {number} bytes - File size in bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const fileCompression = new FileCompression();
