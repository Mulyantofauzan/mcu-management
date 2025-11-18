/**
 * File Upload Widget Component
 *
 * Provides a reusable file upload UI for MCU forms
 * Features:
 * - File input and drop zone
 * - Display uploaded files
 * - Delete files
 * - Upload progress indication
 * - File type/size validation
 */

import { uploadFile, deleteFile, getFilesByMCU } from '../services/supabaseStorageService.js';
import { isSupabaseEnabled } from '../config/supabase.js';
import { tempFileStorage } from '../services/tempFileStorage.js';

export class FileUploadWidget {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            return;
        }

        this.options = {
            employeeId: null,
            mcuId: null,
            userId: null,
            skipDBInsert: false, // If true, upload to storage only, don't insert metadata to DB yet
            onUploadStart: null,
            onUploadComplete: null,
            onError: null,
            ...options
        };

        this.uploadedFiles = [];
        this.isUploading = false;
        this.init();
    }

    /**
     * Initialize widget
     */
    async init() {
        if (!isSupabaseEnabled()) {
            this.container.innerHTML = '<p class="text-muted">⚠️ Storage service not available</p>';
            return;
        }

        this.render();
        this.attachEventListeners();

        // Load existing files if mcuId provided
        if (this.options.mcuId) {
            await this.loadFiles();
        }
    }

    /**
     * Render HTML for the widget
     */
    render() {
        this.container.innerHTML = `
            <div class="file-upload-widget">
                <style>
                    .file-upload-widget {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 16px;
                        background-color: #f9f9f9;
                    }

                    .file-upload-widget h5 {
                        margin-top: 0;
                        margin-bottom: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #333;
                    }

                    .upload-zone {
                        border: 2px dashed #ccc;
                        border-radius: 4px;
                        padding: 20px;
                        text-align: center;
                        background-color: white;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .upload-zone:hover {
                        border-color: #999;
                        background-color: #f5f5f5;
                    }

                    .upload-zone.dragover {
                        border-color: #0066cc;
                        background-color: #e6f2ff;
                    }

                    .upload-zone-icon {
                        font-size: 24px;
                        margin-bottom: 8px;
                    }

                    .upload-zone-text {
                        font-size: 13px;
                        color: #666;
                        margin: 0;
                    }

                    .upload-zone-text small {
                        display: block;
                        color: #999;
                        margin-top: 4px;
                    }

                    #file-input {
                        display: none;
                    }

                    .files-list {
                        margin-top: 12px;
                    }

                    .file-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 8px;
                        background-color: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 3px;
                        margin-bottom: 6px;
                        font-size: 13px;
                    }

                    .file-item-info {
                        display: flex;
                        align-items: center;
                        flex: 1;
                    }

                    .file-item-icon {
                        font-size: 16px;
                        margin-right: 8px;
                        color: #0066cc;
                    }

                    .file-item-details {
                        flex: 1;
                    }

                    .file-item-name {
                        font-weight: 500;
                        color: #333;
                        margin: 0;
                    }

                    .file-item-meta {
                        font-size: 12px;
                        color: #999;
                        margin: 2px 0 0 0;
                    }

                    .file-item-actions {
                        display: flex;
                        gap: 6px;
                        margin-left: 8px;
                    }

                    .btn-file-action {
                        padding: 4px 8px;
                        font-size: 12px;
                        border: 1px solid #ddd;
                        background-color: white;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .btn-file-action:hover {
                        background-color: #f5f5f5;
                    }

                    .btn-delete {
                        color: #d32f2f;
                        border-color: #ffcdd2;
                    }

                    .btn-delete:hover {
                        background-color: #ffebee;
                    }

                    .upload-progress {
                        margin-top: 8px;
                        font-size: 12px;
                        color: #666;
                    }

                    .progress-bar {
                        width: 100%;
                        height: 4px;
                        background-color: #e0e0e0;
                        border-radius: 2px;
                        margin-top: 4px;
                        overflow: hidden;
                    }

                    .progress-fill {
                        height: 100%;
                        background-color: #4caf50;
                        transition: width 0.2s;
                    }

                    .error-message {
                        padding: 8px;
                        background-color: #ffebee;
                        color: #d32f2f;
                        border-radius: 3px;
                        margin-top: 8px;
                        font-size: 12px;
                    }

                    .success-message {
                        padding: 8px;
                        background-color: #e8f5e9;
                        color: #388e3c;
                        border-radius: 3px;
                        margin-top: 8px;
                        font-size: 12px;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 12px;
                        color: #999;
                        font-size: 13px;
                    }
                </style>

                <h5>📎 Upload Document</h5>

                <div class="upload-zone" id="upload-zone">
                    <div class="upload-zone-icon">📁</div>
                    <p class="upload-zone-text">
                        Click to select file or drag & drop
                        <small>PDF, JPG, PNG (Max 3MB per file)</small>
                    </p>
                </div>

                <input type="file" id="file-input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />

                <div id="upload-message" class="upload-progress" style="display: none;"></div>

                <div class="files-list" id="files-list">
                    <div class="empty-state">No files uploaded</div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const uploadZone = this.container.querySelector('#upload-zone');
        const fileInput = this.container.querySelector('#file-input');

        // Click to select file
        uploadZone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
                // Reset input so same file can be selected again
                e.target.value = '';
            }
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(file) {
        if (this.isUploading) {
            this.showError('Upload already in progress');
            return;
        }

        if (!this.options.employeeId || !this.options.userId) {
            this.showError('Missing required information (employeeId or userId)');
            return;
        }

        await this.uploadFileToStorage(file);
    }

    /**
     * Store file in temporary storage (memory)
     * File will be uploaded to Supabase when MCU is saved, not immediately
     * This prevents orphaned files if user cancels MCU creation
     */
    async uploadFileToStorage(file) {
        this.isUploading = true;
        this.showProgress(`Adding ${file.name}...`);

        if (this.options.onUploadStart) {
            this.options.onUploadStart();
        }

        try {
            // Add file to temporary storage (in memory, not to Supabase yet)
            tempFileStorage.addFile(this.options.mcuId, file);

            this.isUploading = false;
            this.showSuccess(`File ready to upload: ${file.name}`);

            // Add to local list for UI display
            this.addFileToList({
                filename: file.name,
                filetype: file.type,
                filesize: file.size,
                uploaded_at: new Date().toISOString(),
                isTemp: true // Mark as temporary (not yet in database)
            });

            if (this.options.onUploadComplete) {
                this.options.onUploadComplete({ success: true, message: 'File added to upload queue' });
            }
        } catch (error) {
            this.isUploading = false;
            this.showError(`Failed to add file: ${error.message}`);

            if (this.options.onError) {
                this.options.onError(error.message);
            }
        }
    }

    /**
     * Load existing files for MCU
     */
    async loadFiles() {
        try {
            const files = await getFilesByMCU(this.options.mcuId);

            if (files.length > 0) {
                this.uploadedFiles = files;
                this.renderFilesList();
            }
        } catch (error) {
        }
    }

    /**
     * Add file to UI list
     */
    addFileToList(file) {
        // Generate a temporary fileid if not provided (for temp files)
        if (!file.fileid) {
            file.fileid = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        this.uploadedFiles.push(file);
        this.renderFilesList();
    }

    /**
     * Render files list
     */
    renderFilesList() {
        const filesList = this.container.querySelector('#files-list');

        if (this.uploadedFiles.length === 0) {
            filesList.innerHTML = '<div class="empty-state">No files uploaded</div>';
            return;
        }

        filesList.innerHTML = this.uploadedFiles
            .map(file => this.renderFileItem(file))
            .join('');

        // Attach delete handlers
        this.container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.handleDelete(btn.dataset.fileid));
        });
    }

    /**
     * Render single file item
     */
    renderFileItem(file) {
        const fileIcon = this.getFileIcon(file.filetype);
        const fileSize = this.formatFileSize(file.filesize);
        const uploadDate = new Date(file.uploaded_at).toLocaleDateString();

        return `
            <div class="file-item" data-fileid="${file.fileid}">
                <div class="file-item-info">
                    <div class="file-item-icon">${fileIcon}</div>
                    <div class="file-item-details">
                        <p class="file-item-name">${file.filename}</p>
                        <p class="file-item-meta">${fileSize} • ${uploadDate}</p>
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="btn-file-action btn-delete" data-fileid="${file.fileid}">
                        ✕ Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle file deletion
     */
    async handleDelete(fileid) {
        if (!confirm('Yakin ingin menghapus file ini?')) {
            return;
        }

        // Find the file to determine if it's temporary or already uploaded
        const fileToDelete = this.uploadedFiles.find(f => f.fileid === fileid);

        if (!fileToDelete) {
            this.showError('File not found');
            return;
        }

        // If file is marked as temporary (not yet in database), just remove from queue
        if (fileToDelete.isTemp) {
            // Remove from tempFileStorage by finding the file with matching name
            const tempFiles = tempFileStorage.getFiles(this.options.mcuId);
            const fileIndex = tempFiles.findIndex(f => f.name === fileToDelete.filename);
            if (fileIndex >= 0) {
                tempFileStorage.removeFile(this.options.mcuId, fileIndex);
            }

            // Remove from UI list
            this.uploadedFiles = this.uploadedFiles.filter(f => f.fileid !== fileid);
            this.renderFilesList();
            this.showSuccess(`File dihapus dari antrian: ${fileToDelete.filename}`);
            return;
        }

        // For already-uploaded files, call delete API
        this.showProgress('Menghapus file...');

        const result = await deleteFile(fileid);

        if (result.success) {
            this.uploadedFiles = this.uploadedFiles.filter(f => f.fileid !== fileid);
            this.renderFilesList();
            this.showSuccess('File berhasil dihapus');
        } else {
            this.showError(`Gagal menghapus: ${result.error}`);
        }
    }

    /**
     * Get file icon based on type
     */
    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('image')) return '🖼️';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        return '📎';
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Show progress message
     */
    showProgress(message) {
        const messageDiv = this.container.querySelector('#upload-message');
        messageDiv.innerHTML = `
            <div>⏳ ${message}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 50%;"></div>
            </div>
        `;
        messageDiv.style.display = 'block';
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.clearMessage();
        const messageDiv = this.container.querySelector('#upload-message');
        messageDiv.innerHTML = `<div class="success-message">✓ ${message}</div>`;
        messageDiv.style.display = 'block';

        setTimeout(() => this.clearMessage(), 3000);
    }

    /**
     * Show error message
     */
    showError(message) {
        this.clearMessage();
        const messageDiv = this.container.querySelector('#upload-message');
        messageDiv.innerHTML = `<div class="error-message">✕ ${message}</div>`;
        messageDiv.style.display = 'block';

        setTimeout(() => this.clearMessage(), 5000);
    }

    /**
     * Clear message
     */
    clearMessage() {
        const messageDiv = this.container.querySelector('#upload-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }

    /**
     * Set options
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get uploaded files
     */
    getFiles() {
        return this.uploadedFiles;
    }
}

export default FileUploadWidget;
