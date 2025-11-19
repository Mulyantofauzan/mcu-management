/**
 * Supabase Storage Upload Service
 *
 * Frontend service untuk upload files ke Cloudflare R2
 * - Max 3MB per file
 * - Supported: PDF, JPG, PNG
 * - Upload tracking dengan progress callback
 *
 * Usage:
 * const result = await uploadFileToSupabase(file, employeeId, mcuId, progressCallback);
 */

import { showToast } from '../utils/uiHelpers.js';

/**
 * Upload file ke Cloudflare R2
 * @param {File} file - File object dari input
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {Function} onProgress - Optional progress callback (current, total, message)
 * @returns {Promise<Object>} Upload result dengan storage URL
 */
export async function uploadFileToSupabase(file, employeeId, mcuId, onProgress = null) {
  try {
    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    if (!employeeId || !mcuId) {
      throw new Error('Missing employeeId or mcuId');
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `File type not allowed. Only PDF and images (JPG/PNG) are supported. Got: ${file.type}`
      );
    }

    // Validate file size (3MB max)
    const maxSize = 3 * 1024 * 1024;
    const warningSize = 2 * 1024 * 1024; // 2MB warning threshold

    if (file.size > maxSize) {
      throw new Error(
        `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal file 3MB per file`
      );
    }

    // Show warning if file > 2MB
    if (file.size > warningSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      showToast(`Perhatian: File ${file.name} berukuran ${fileSizeMB}MB. Proses upload mungkin memakan waktu lebih lama.`, 'warning');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);
    formData.append('mcuId', mcuId);
    // Upload dengan progress tracking
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // Track upload progress
      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            onProgress(e.loaded, e.total, `Uploading: ${percentComplete}%`);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              fileName: file.name,
              originalSize: response.file.size,
              type: response.file.type,
              publicUrl: response.storage.publicUrl,
              storagePath: response.storage.path,
              message: response.message
            });
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Send request to API (using relative URL to work on any deployment)
      const apiUrl = '/api/compress-upload';
      xhr.open('POST', apiUrl);
      xhr.send(formData);
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Upload multiple files sequentially to Supabase
 * @param {File[]} files - Array of file objects
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object[]>} Array of upload results
 */
export async function uploadFilesToSupabase(
  files,
  employeeId,
  mcuId,
  onProgress = null
) {
  const results = [];
  let totalSize = 0;
  let uploadedSize = 0;

  // Calculate total size for progress
  for (const file of files) {
    totalSize += file.size;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await uploadFileToSupabase(
        file,
        employeeId,
        mcuId,
        (current, total, message) => {
          const progressPercent = Math.round(
            ((uploadedSize + current) / totalSize) * 100
          );
          if (onProgress) {
            onProgress(uploadedSize + current, totalSize, `[${i + 1}/${files.length}] ${message}`);
          }
        }
      );

      uploadedSize += file.size;
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        fileName: file.name,
        error: error.message
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return results;
}

/**
 * Upload batch of files to Supabase Storage
 * Wrapper untuk uploadFilesToSupabase dengan format return yang konsisten
 * @param {File[]} files - Array of file objects
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {string} userId - User ID (not used in new API, kept for compatibility)
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Upload result with success status and counts
 */
export async function uploadBatchFiles(files, employeeId, mcuId, userId, onProgress = null) {
  try {
    if (!files || files.length === 0) {
      return { success: true, uploadedCount: 0, failedCount: 0 };
    }

    // Upload files using new API
    const results = await uploadFilesToSupabase(
      files,
      employeeId,
      mcuId,
      onProgress
    );

    // Count successful and failed uploads
    const uploadedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    if (uploadedCount === 0) {
      return {
        success: false,
        uploadedCount: 0,
        failedCount: failedCount,
        error: 'All file uploads failed'
      };
    }

    return {
      success: true,
      uploadedCount,
      failedCount,
      message: `Uploaded ${uploadedCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      results
    };
  } catch (error) {
    return {
      success: false,
      uploadedCount: 0,
      error: error.message
    };
  }
}

/**
 * Save uploaded files metadata (stub for compatibility)
 * New API handles metadata automatically, so this is a no-op
 */
export async function saveUploadedFilesMetadata(mcuId, employeeId, userId) {
  return { success: true, count: 0 };
}

/**
 * Delete orphaned files (stub for compatibility)
 * New API doesn't create orphaned files, so this is a no-op
 */
export async function deleteOrphanedFiles(mcuId, employeeId) {
  return { success: true, deletedCount: 0 };
}

/**
 * Delete file by ID
 * Soft deletes the file (marks as deleted in database)
 * @param {string} fileId - File ID to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteFile(fileId) {
  try {
    if (!fileId) {
      throw new Error('Missing fileId');
    }
    const response = await fetch(`/api/delete-file?fileId=${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload single file (alias for uploadFileToSupabase for compatibility)
 */
export async function uploadFile(file, employeeId, mcuId, onProgress) {
  return uploadFileToSupabase(file, employeeId, mcuId, onProgress);
}

/**
 * Get files by MCU
 * Retrieves files from mcufiles table via API endpoint
 */
export async function getFilesByMCU(mcuId) {
  try {
    if (!mcuId) {
      return { success: true, files: [] };
    }

    const apiUrl = '/api/get-mcu-files';
    const response = await fetch(`${apiUrl}?mcuId=${encodeURIComponent(mcuId)}`);

    if (!response.ok) {
      return { success: false, files: [], error: `HTTP ${response.status}` };
    }

    const result = await response.json();

    if (!result.success) {
      return { success: false, files: [], error: result.error };
    }

    return {
      success: true,
      files: result.files || [],
      count: result.count || 0
    };
  } catch (error) {
    return { success: false, files: [], error: error.message };
  }
}

/**
 * Download file - Gets signed URL from server and opens file
 * For private R2 buckets, server generates temporary signed URLs
 * @param {string} fileId - File ID from mcufiles table
 * @param {string} fileName - File name (optional, for display)
 * @param {string} userId - Current user ID
 * @returns {Object} Download result
 */
export async function downloadFile(fileId, fileName, userId) {
  try {
    if (!fileId) {
      return { success: false, error: 'No file ID provided' };
    }

    if (!userId) {
      return { success: false, error: 'User authentication required' };
    }
    // Request signed URL from server
    const apiUrl = '/api/download-file';
    const response = await fetch(`${apiUrl}?fileId=${encodeURIComponent(fileId)}&userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`
      };
    }

    const result = await response.json();

    if (!result.success || !result.signedUrl) {
      return {
        success: false,
        error: result.error || 'Failed to generate download link'
      };
    }
    // Open signed URL in new tab
    window.open(result.signedUrl, '_blank');

    return {
      success: true,
      fileName: result.fileName,
      expiresIn: result.expiresIn
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all files for MCU with signed URLs (batch download)
 * @param {string} mcuId - MCU ID
 * @param {string} userId - Current user ID
 * @returns {Object} { success, files: [{filename, signedUrl}] }
 */
export async function getMCUFilesWithSignedUrls(mcuId, userId) {
  try {
    if (!mcuId || !userId) {
      return { success: false, error: 'MCU ID and user ID required', files: [] };
    }
    const apiUrl = '/api/download-file';
    const response = await fetch(`${apiUrl}?mcuId=${encodeURIComponent(mcuId)}&userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
        files: []
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        files: []
      };
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
}

/**
 * Delete file from Cloudflare R2 storage by storage path
 * @param {string} storagePath - Full path to file in storage (e.g., 'mcu_files/EMP_123/MCU_456/filename.pdf')
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFileFromStorage(storagePath) {
  try {
    if (!storagePath) {
      throw new Error('Missing storagePath');
    }
    // Call backend API to delete from R2 storage
    // The backend API will handle both R2 deletion and database cleanup
    const response = await fetch(`/api/hard-delete-file?storagePath=${encodeURIComponent(storagePath)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Return success anyway since we might be deleting a file that doesn't exist
      return { success: true, message: 'File deletion attempt completed' };
    }

    const result = await response.json();
    return { success: true, message: result.message || 'File deleted from storage' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  uploadFileToSupabase,
  uploadFilesToSupabase,
  uploadBatchFiles,
  saveUploadedFilesMetadata,
  deleteOrphanedFiles,
  deleteFile,
  deleteFileFromStorage,
  uploadFile,
  getFilesByMCU,
  downloadFile,
  getMCUFilesWithSignedUrls
};
