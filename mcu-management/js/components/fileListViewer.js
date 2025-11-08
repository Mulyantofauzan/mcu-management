/**
 * File List Viewer Component
 *
 * Displays list of files uploaded for an MCU record
 * Features:
 * - Display files grouped by MCU
 * - Download file functionality
 * - File metadata display (name, size, upload date, uploader)
 * - Delete functionality (with confirmation)
 * - Responsive design for detail views
 */

import { getFilesByMCU } from '../services/supabaseStorageService.js';
import { downloadFile, deleteFile } from '../services/supabaseStorageService.js';
import { showToast, confirmDialog } from '../utils/uiHelpers.js';
import { formatDateDisplay } from '../utils/dateHelpers.js';

export class FileListViewer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`⚠️ Container #${containerId} not found`);
            return;
        }

        this.options = {
            mcuId: null,
            employeeId: null,
            readOnly: false, // If true, hide delete button
            compact: false,  // If true, use compact layout
            ...options
        };

        this.files = [];
        this.init();
    }

    /**
     * Initialize component
     */
    async init() {
        if (!this.options.mcuId) {
            this.container.innerHTML = '<p class="text-sm text-gray-500">No MCU ID provided</p>';
            return;
        }

        await this.loadFiles();
        this.render();
    }

    /**
     * Load files for MCU
     */
    async loadFiles() {
        try {
            console.log(`📂 Loading files for MCU: ${this.options.mcuId}`);
            this.files = await getFilesByMCU(this.options.mcuId);
            console.log(`📂 Files found: ${this.files.length}`, this.files);
        } catch (error) {
            console.error('Error loading files:', error);
            this.files = [];
        }
    }

    /**
     * Render component
     */
    render() {
        if (this.files.length === 0) {
            this.container.innerHTML = '<p class="text-sm text-gray-500 italic">Tidak ada file</p>';
            return;
        }

        if (this.options.compact) {
            this.renderCompact();
        } else {
            this.renderStandard();
        }
    }

    /**
     * Render standard layout (detailed)
     */
    renderStandard() {
        const html = `
            <div class="space-y-3">
                ${this.files.map(file => this.renderFileItem(file)).join('')}
            </div>
        `;
        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Render compact layout (simple list)
     */
    renderCompact() {
        const html = `
            <div class="space-y-2">
                ${this.files.map(file => `
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            ${this.getFileIcon(file.filetype)}
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium truncate">${file.filename}</p>
                                <p class="text-xs text-gray-500">${this.formatFileSize(file.filesize)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-2">
                            <button class="file-download-btn text-blue-600 hover:text-blue-800 p-1" data-fileid="${file.fileid}" title="Download">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                </svg>
                            </button>
                            ${!this.options.readOnly ? `
                                <button class="file-delete-btn text-red-600 hover:text-red-800 p-1" data-fileid="${file.fileid}" title="Delete">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Render single file item (detailed)
     */
    renderFileItem(file) {
        return `
            <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                <div class="flex-shrink-0 mt-1">
                    ${this.getFileIcon(file.filetype, 'w-6 h-6')}
                </div>

                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 break-words">${file.filename}</p>
                    <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>📦 ${this.formatFileSize(file.filesize)}</span>
                        <span>📅 ${formatDateDisplay(file.uploadedat)}</span>
                        <span>👤 ${file.uploadedby || 'Unknown'}</span>
                    </div>
                </div>

                <div class="flex gap-2 flex-shrink-0">
                    <button class="file-download-btn px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            data-fileid="${file.fileid}">
                        Download
                    </button>
                    ${!this.options.readOnly ? `
                        <button class="file-delete-btn px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                                data-fileid="${file.fileid}">
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get file type icon
     */
    getFileIcon(fileType, sizeClass = 'w-4 h-4') {
        const baseClass = `${sizeClass} flex-shrink-0`;

        if (fileType.includes('pdf')) {
            return `<svg class="${baseClass} text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"></path></svg>`;
        } else if (fileType.includes('image')) {
            return `<svg class="${baseClass} text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
        } else {
            return `<svg class="${baseClass} text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path></svg>`;
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Download buttons
        this.container.querySelectorAll('.file-download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDownload(e));
        });

        // Delete buttons
        this.container.querySelectorAll('.file-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e));
        });
    }

    /**
     * Handle file download
     */
    async handleDownload(event) {
        const fileId = event.currentTarget.dataset.fileid;
        const file = this.files.find(f => f.fileid === fileId);

        if (!file) return;

        try {
            event.currentTarget.disabled = true;
            event.currentTarget.textContent = 'Downloading...';

            const result = await downloadFile(file.supabase_storage_path, file.filename);

            if (result.success) {
                showToast('Download dimulai', 'success');
            } else {
                showToast('Gagal download: ' + result.error, 'error');
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        } finally {
            event.currentTarget.disabled = false;
            event.currentTarget.textContent = 'Download';
        }
    }

    /**
     * Handle file deletion
     */
    async handleDelete(event) {
        const fileId = event.currentTarget.dataset.fileid;
        const file = this.files.find(f => f.fileid === fileId);

        if (!file) return;

        const confirmed = await confirmDialog(
            'Hapus File?',
            `Apakah Anda yakin ingin menghapus file "${file.filename}"?`
        );

        if (!confirmed) return;

        try {
            event.currentTarget.disabled = true;
            const result = await deleteFile(fileId);

            if (result.success) {
                showToast('File berhasil dihapus', 'success');
                await this.loadFiles();
                this.render();
            } else {
                showToast('Gagal menghapus: ' + result.error, 'error');
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        } finally {
            event.currentTarget.disabled = false;
        }
    }

    /**
     * Refresh file list
     */
    async refresh() {
        await this.loadFiles();
        this.render();
    }
}

export default FileListViewer;
