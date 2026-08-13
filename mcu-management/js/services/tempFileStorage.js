/**
 * Temporary File Storage Service
 *
 * Stores files in memory temporarily before upload to Supabase Storage
 * Files are kept in memory until MCU is saved, then batch uploaded
 * If user cancels, files are discarded (no storage waste)
 */

class TempFileStorage {
    constructor() {
        // Store files by mcuId: { mcuId: [file1, file2, ...] }
        this.tempFiles = {};
        this.pendingPreparations = {};
    }

    /**
     * Add file to temporary storage
     * @param {string} mcuId - MCU ID
     * @param {File} file - File object to store temporarily
     */
    addFile(mcuId, file) {
        if (!this.tempFiles[mcuId]) {
            this.tempFiles[mcuId] = [];
        }
        this.tempFiles[mcuId].push(file);
    }

    /**
     * Get all temporary files for an MCU
     * @param {string} mcuId - MCU ID
     * @returns {File[]} Array of File objects
     */
    getFiles(mcuId) {
        return this.tempFiles[mcuId] || [];
    }

    /**
     * Get file count for an MCU
     * @param {string} mcuId - MCU ID
     * @returns {number} Number of files
     */
    getFileCount(mcuId) {
        return (this.tempFiles[mcuId] || []).length;
    }

    /**
     * Remove a specific file from temporary storage
     * @param {string} mcuId - MCU ID
     * @param {number} index - File index in array
     */
    removeFile(mcuId, index) {
        if (this.tempFiles[mcuId] && this.tempFiles[mcuId][index]) {
            const file = this.tempFiles[mcuId][index];
            this.tempFiles[mcuId].splice(index, 1);
            // Clean up empty entries
            if (this.tempFiles[mcuId].length === 0) {
                delete this.tempFiles[mcuId];
            }
        }
    }

    retainFiles(mcuId, indexes) {
        if (!this.tempFiles[mcuId] || !Array.isArray(indexes)) return;
        const keep = new Set(indexes);
        this.tempFiles[mcuId] = this.tempFiles[mcuId].filter((file, index) => keep.has(index));
        if (this.tempFiles[mcuId].length === 0) delete this.tempFiles[mcuId];
    }

    /**
     * Clear all temporary files for an MCU
     * @param {string} mcuId - MCU ID
     */
    clearFiles(mcuId) {
        if (this.tempFiles[mcuId]) {
            delete this.tempFiles[mcuId];
        }
    }

    /**
     * Clear all temporary files (when canceling, etc.)
     */
    clearAll() {
        this.tempFiles = {};
        this.pendingPreparations = {};
    }

    /**
     * Get total size of files for an MCU
     * @param {string} mcuId - MCU ID
     * @returns {number} Total size in bytes
     */
    getTotalSize(mcuId) {
        return (this.tempFiles[mcuId] || []).reduce((sum, file) => sum + file.size, 0);
    }

    setPendingPreparation(mcuId, promise) {
        this.pendingPreparations[mcuId] = promise;
    }

    clearPendingPreparation(mcuId, promise) {
        if (this.pendingPreparations[mcuId] === promise) {
            delete this.pendingPreparations[mcuId];
        }
    }

    async waitForPending(mcuId) {
        const pending = this.pendingPreparations[mcuId];
        if (pending) await pending;
    }
}

// Create singleton instance
export const tempFileStorage = new TempFileStorage();

export default tempFileStorage;
