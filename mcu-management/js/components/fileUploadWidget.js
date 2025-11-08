/**
 * File Upload Widget Component
 * Reusable component for uploading MCU files to Google Drive
 * Can be integrated into any MCU form or detail page
 */

import { googleDriveService } from '../services/googleDriveService.js';
import { fileCompression } from '../utils/fileCompression.js';
import { authService } from '../services/authService.js';
import { showToast } from '../utils/uiHelpers.js';
import { logger } from '../utils/logger.js';

class FileUploadWidget {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.employeeId = options.employeeId || null;
    this.mcuId = options.mcuId || null;
    this.maxFiles = options.maxFiles || 5;
    this.onUploadComplete = options.onUploadComplete || null;
    this.uploadedFiles = [];
    this.isUploading = false;

    if (!this.container) {
      throw new Error(`Container with ID "${containerId}" not found`);
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the file upload widget UI
   */
  render() {
    this.container.innerHTML = `
      <div class="file-upload-widget">
        <!-- Upload Area -->
        <div class="upload-area" id="upload-area">
          <input
            type="file"
            id="file-input-${this.containerId}"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            style="display: none;"
          />
          <div class="upload-prompt">
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p class="upload-text">Drag files here or <span class="click-link">click to browse</span></p>
            <p class="upload-hint">PDF, JPEG, PNG • Max 5MB per file</p>
          </div>
        </div>

        <!-- File List -->
        <div class="uploaded-files-section" id="uploaded-files-section" style="display: none;">
          <h4>Uploaded Files (<span id="file-count">0</span>/<span id="max-files">${this.maxFiles}</span>)</h4>
          <ul class="file-list" id="file-list"></ul>
        </div>

        <!-- Upload Progress -->
        <div class="upload-progress" id="upload-progress" style="display: none;">
          <div class="progress-item">
            <span class="file-name" id="uploading-file-name"></span>
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <span class="progress-text" id="progress-text">0%</span>
          </div>
        </div>

        <!-- Error Message -->
        <div class="error-message" id="error-message" style="display: none;"></div>
      </div>

      <style>
        .file-upload-widget {
          margin-top: 1rem;
        }

        .upload-area {
          border: 2px dashed #ccc;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #f9fafb;
        }

        .upload-area.dragover {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }

        .upload-icon {
          width: 3rem;
          height: 3rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .upload-text {
          margin: 0.5rem 0;
          color: #1f2937;
          font-weight: 500;
        }

        .click-link {
          color: #3b82f6;
          cursor: pointer;
          text-decoration: underline;
        }

        .upload-hint {
          margin: 0.5rem 0 0;
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .uploaded-files-section {
          margin-top: 1.5rem;
        }

        .uploaded-files-section h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .file-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .file-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          background-color: #f3f4f6;
          border-radius: 0.375rem;
          margin-bottom: 0.5rem;
          gap: 0.75rem;
        }

        .file-item.uploading {
          background-color: #fef3c7;
          border: 1px solid #fcd34d;
        }

        .file-item.success {
          background-color: #d1fae5;
          border: 1px solid #6ee7b7;
        }

        .file-item.error {
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
        }

        .file-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: #6b7280;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1f2937;
          word-break: break-word;
        }

        .file-size {
          display: block;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.125rem;
        }

        .file-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .file-btn {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          background-color: transparent;
          color: #3b82f6;
          transition: all 0.2s ease;
        }

        .file-btn:hover {
          background-color: rgba(59, 130, 246, 0.1);
        }

        .file-btn.delete {
          color: #ef4444;
        }

        .file-btn.delete:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }

        .upload-progress {
          margin-top: 1rem;
        }

        .progress-item {
          margin-bottom: 1rem;
        }

        .progress-bar {
          width: 100%;
          height: 0.5rem;
          background-color: #e5e7eb;
          border-radius: 0.25rem;
          overflow: hidden;
          margin: 0.5rem 0;
        }

        .progress-fill {
          height: 100%;
          background-color: #3b82f6;
          transition: width 0.2s ease;
          width: 0%;
        }

        .progress-text {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .error-message {
          padding: 0.75rem;
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 0.375rem;
          color: #dc2626;
          font-size: 0.875rem;
          margin-top: 1rem;
        }
      </style>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const uploadArea = this.container.querySelector('#upload-area');
    const fileInput = this.container.querySelector(`#file-input-${this.containerId}`);

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      this.handleFileSelect(e.dataTransfer.files);
    });
  }

  /**
   * Handle file selection
   * @param {FileList} files - Selected files
   */
  async handleFileSelect(files) {
    if (this.isUploading) {
      showToast('Upload in progress. Please wait.', 'warning');
      return;
    }

    if (!files || files.length === 0) return;

    try {
      for (const file of files) {
        await this.uploadFile(file);
      }

      if (this.onUploadComplete) {
        this.onUploadComplete(this.uploadedFiles);
      }
    } catch (error) {
      logger.error('File selection error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Upload single file
   * @param {File} file - File to upload
   */
  async uploadFile(file) {
    let fileItem = null;
    try {
      if (this.uploadedFiles.length >= this.maxFiles) {
        throw new Error(`Maximum ${this.maxFiles} files allowed`);
      }

      // First, detect MIME type from extension if browser didn't set it
      file = fileCompression.detectMimeType(file);

      // Validate file
      fileCompression.validateFile(file);

      // Show uploading state
      fileItem = this.addFileToList(file, 'uploading');

      // Compress file
      this.showProgress(file.name, 0);
      const compressedFile = await fileCompression.compressFile(file);

      // Initialize service if needed
      if (!googleDriveService.uploadEndpoint) {
        const { googleDriveConfig, initializeGoogleDriveConfig } = await import('../config/googleDriveConfig.js');
        // Ensure env vars are loaded before validating
        await initializeGoogleDriveConfig();
        googleDriveConfig.validate();
        await googleDriveService.init(
          googleDriveConfig.rootFolderId,
          googleDriveConfig.uploadEndpoint
        );
      }

      // Upload file
      this.showProgress(file.name, 50);
      const currentUser = authService.getCurrentUser();
      const result = await googleDriveService.uploadFile(
        compressedFile,
        this.employeeId,
        currentUser
      );
      this.showProgress(file.name, 100);

      // Update file list
      this.updateFileItem(fileItem, result, 'success');
      this.uploadedFiles.push(result);
      this.updateFileCount();

      showToast(`File uploaded: ${file.name}`, 'success');
    } catch (error) {
      logger.error('File upload error:', error);
      // Get safe error message without stringifying the whole error object
      const errorMsg = error?.message || String(error) || 'Upload failed';
      this.showError(errorMsg);
      if (fileItem) {
        this.updateFileItem(fileItem, null, 'error', errorMsg);
      }
    } finally {
      this.hideProgress();
    }
  }

  /**
   * Add file to list
   * @param {File} file - File object
   * @param {string} status - uploading|success|error
   * @returns {HTMLElement} - File item element
   */
  addFileToList(file, status = 'uploading') {
    const fileList = this.container.querySelector('#file-list');
    const fileItem = document.createElement('li');
    fileItem.className = `file-item ${status}`;
    fileItem.dataset.fileName = file.name;
    fileItem.innerHTML = `
      <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
      <div class="file-info">
        <span class="file-name">${file.name}</span>
        <span class="file-size">${fileCompression.formatFileSize(file.size)}</span>
      </div>
      <div class="file-actions">
        <button type="button" class="file-btn delete" data-action="delete" title="Delete">✕</button>
      </div>
    `;

    // Delete button
    fileItem.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.preventDefault();
      fileItem.remove();
      this.updateFileCount();
      this.uploadedFiles = this.uploadedFiles.filter(f => f.fileName !== file.name);
    });

    fileList.appendChild(fileItem);
    this.container.querySelector('#uploaded-files-section').style.display = 'block';

    return fileItem;
  }

  /**
   * Update file item with upload result
   * @param {HTMLElement} fileItem - File item element
   * @param {Object} result - Upload result
   * @param {string} status - success|error
   * @param {string} errorMsg - Error message if failed
   */
  updateFileItem(fileItem, result, status, errorMsg = '') {
    if (!fileItem) return;

    fileItem.className = `file-item ${status}`;

    if (status === 'success' && result) {
      // Update with success info
      fileItem.innerHTML = `
        <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <div class="file-info">
          <span class="file-name">${result.fileName}</span>
          <span class="file-size">${fileCompression.formatFileSize(result.fileSize)}</span>
        </div>
        <div class="file-actions">
          <a href="${googleDriveService.getDownloadUrl(result.googleDriveFileId)}"
             target="_blank"
             class="file-btn"
             title="Download">↓</a>
          <button type="button" class="file-btn delete" data-action="delete" title="Delete">✕</button>
        </div>
      `;

      fileItem.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.preventDefault();
        fileItem.remove();
        this.updateFileCount();
        this.uploadedFiles = this.uploadedFiles.filter(f => f.fileId !== result.fileId);
      });
    } else if (status === 'error') {
      fileItem.innerHTML = `
        <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <div class="file-info">
          <span class="file-name">${fileItem.dataset.fileName}</span>
          <span class="file-size" style="color: #dc2626;">${errorMsg}</span>
        </div>
        <div class="file-actions">
          <button type="button" class="file-btn delete" data-action="delete" title="Delete">✕</button>
        </div>
      `;

      fileItem.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.preventDefault();
        fileItem.remove();
        this.updateFileCount();
      });
    }
  }

  /**
   * Show upload progress
   * @param {string} fileName - File name
   * @param {number} percent - Progress percentage (0-100)
   */
  showProgress(fileName, percent) {
    const progress = this.container.querySelector('#upload-progress');
    progress.style.display = 'block';
    this.container.querySelector('#uploading-file-name').textContent = fileName;
    this.container.querySelector('#progress-fill').style.width = `${percent}%`;
    this.container.querySelector('#progress-text').textContent = `${percent}%`;
  }

  /**
   * Hide upload progress
   */
  hideProgress() {
    this.container.querySelector('#upload-progress').style.display = 'none';
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorDiv = this.container.querySelector('#error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  /**
   * Update file count display
   */
  updateFileCount() {
    const fileCount = this.container.querySelectorAll('.file-item').length;
    this.container.querySelector('#file-count').textContent = fileCount;

    if (fileCount === 0) {
      this.container.querySelector('#uploaded-files-section').style.display = 'none';
    }
  }

  /**
   * Get uploaded files
   * @returns {Array} - Array of uploaded file metadata
   */
  getUploadedFiles() {
    return this.uploadedFiles;
  }

  /**
   * Clear uploaded files
   */
  clear() {
    this.uploadedFiles = [];
    this.container.querySelector('#file-list').innerHTML = '';
    this.container.querySelector('#uploaded-files-section').style.display = 'none';
  }
}

export { FileUploadWidget };
