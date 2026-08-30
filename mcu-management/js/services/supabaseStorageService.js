/**
 * Supabase Storage Upload Service
 *
 * Frontend service untuk upload files ke Cloudflare R2
 * - PDF below 10 MiB; JPG/PNG up to 3 MiB
 * - All supported files upload directly to R2 through signed URLs
 * - Upload tracking dengan progress callback
 *
 * Usage:
 * const result = await uploadFileToSupabase(file, uploadContext, progressCallback);
 */

import { showToast } from '../utils/uiHelpers.js';
import { authService } from './authService.js';
import { validateMcuFile } from './mcuFilePolicy.mjs';

function getAuthHeaders(extraHeaders = {}) {
  const token = authService.getAccessToken();
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders;
}

async function postUploadAction(payload) {
  const response = await fetch('/api/mcu-file-upload', {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    const error = new Error(result.error || `Upload API gagal (HTTP ${response.status}).`);
    error.code = result.code
      || (response.status === 401 ? 'UPLOAD_UNAUTHORIZED' : 'UPLOAD_API_FAILED');
    error.status = response.status;
    error.requestId = result.requestId;
    throw error;
  }
  return result;
}

function putFileToSignedUrl(file, upload, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload.uploadUrl);
    Object.entries(upload.requiredHeaders || {}).forEach(([name, value]) => {
      xhr.setRequestHeader(name, value);
    });
    xhr.upload?.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(event.loaded, event.total, `Mengunggah: ${percent}%`);
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const error = new Error(`Upload ke R2 gagal (HTTP ${xhr.status}).`);
        error.code = /ExpiredRequest|request has expired/i.test(xhr.responseText || '')
          ? 'UPLOAD_URL_EXPIRED'
          : (xhr.status === 401 || xhr.status === 403
              ? 'UPLOAD_URL_REJECTED'
              : 'UPLOAD_R2_FAILED');
        error.status = xhr.status;
        reject(error);
      }
    });
    xhr.addEventListener('error', () => {
      const error = new Error('Koneksi terputus saat mengunggah file.');
      error.code = 'UPLOAD_NETWORK_ERROR';
      reject(error);
    });
    xhr.addEventListener('abort', () => {
      const error = new Error('Upload file dibatalkan.');
      error.code = 'UPLOAD_CANCELLED';
      reject(error);
    });
    xhr.send(file);
  });
}

async function uploadDirect(file, context, onProgress) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prepared = await postUploadAction({
      action: 'prepare-file-upload',
      employeeId: context.employeeId,
      mcuId: context.mcuId,
      fileName: file.name,
      contentLength: file.size
    });
    try {
      await putFileToSignedUrl(file, prepared.upload, onProgress);
      const confirmed = await postUploadAction({
        action: 'confirm-file-upload',
        objectKey: prepared.upload.objectKey,
        fileName: file.name
      });
      return {
        success: true,
        fileId: confirmed.file.id,
        fileName: confirmed.file.name,
        originalSize: confirmed.file.size,
        type: confirmed.file.type,
        publicUrl: confirmed.storage.publicUrl,
        storagePath: confirmed.storage.path,
        message: confirmed.message
      };
    } catch (error) {
      lastError = error;
      if (!['UPLOAD_NETWORK_ERROR', 'UPLOAD_URL_EXPIRED'].includes(error.code) || attempt === 1) {
        throw error;
      }
    }
  }
  throw lastError;
}

function currentUserId() {
  const user = authService.getCurrentUser() || {};
  return user.userId || user.user_id || user.id || null;
}

function normalizeUploadContext(contextOrEmployeeId, mcuId = null, userId = null) {
  const source = contextOrEmployeeId && typeof contextOrEmployeeId === 'object'
    ? contextOrEmployeeId
    : { employeeId: contextOrEmployeeId, mcuId, userId };
  const context = Object.freeze({
    employeeId: String(source.employeeId || '').normalize('NFKC').trim(),
    mcuId: String(source.mcuId || '').normalize('NFKC').trim(),
    userId: String(source.userId || currentUserId() || '').normalize('NFKC').trim()
  });
  if (!context.employeeId || !context.mcuId || !context.userId) {
    const error = new Error('Konteks Employee ID, MCU ID, atau pengguna tidak lengkap.');
    error.code = 'UPLOAD_CONTEXT_INVALID';
    throw error;
  }
  return context;
}

/**
 * Upload file ke Cloudflare R2
 * @param {File} file - File object dari input
 * @param {Object|string} contextOrEmployeeId - Immutable context or legacy Employee ID
 * @param {string|Function} mcuIdOrProgress - Legacy MCU ID or progress callback
 * @param {Function} onProgress - Optional progress callback (current, total, message)
 * @returns {Promise<Object>} Upload result dengan storage URL
 */
export async function uploadFileToSupabase(
  file,
  contextOrEmployeeId,
  mcuIdOrProgress = null,
  onProgress = null
) {
  const legacyCall = typeof contextOrEmployeeId !== 'object';
  const context = normalizeUploadContext(
    contextOrEmployeeId,
    legacyCall ? mcuIdOrProgress : null
  );
  const progress = legacyCall ? onProgress : mcuIdOrProgress;
  validateMcuFile(file);

  if (file.size > 2 * 1024 * 1024) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    showToast(`File ${file.name} berukuran ${fileSizeMB} MB. Upload mungkin lebih lama.`, 'warning');
  }
  return uploadDirect(file, context, progress);
}

/**
 * Upload multiple files sequentially to Supabase
 * @param {File[]} files - Array of file objects
 * @param {Object} context - Immutable upload context
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object[]>} Array of upload results
 */
export async function uploadFilesToSupabase(
  files,
  context,
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
        context,
        (current, total, message) => {
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
        fileIndex: i,
        fileName: file.name,
        error: error.message,
        code: error.code || 'UPLOAD_API_FAILED'
      });
    }
  }

  return results;
}

/**
 * Upload batch of files to Supabase Storage
 * Wrapper untuk uploadFilesToSupabase dengan format return yang konsisten
 * @param {File[]} files - Array of file objects
 * @param {Object|string} contextOrEmployeeId - Immutable context or legacy Employee ID
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Upload result with success status and counts
 */
export async function uploadBatchFiles(
  files,
  contextOrEmployeeId,
  mcuIdOrProgress = null,
  userId = null,
  legacyProgress = null
) {
  try {
    const legacyCall = typeof contextOrEmployeeId !== 'object';
    const context = normalizeUploadContext(
      contextOrEmployeeId,
      legacyCall ? mcuIdOrProgress : null,
      legacyCall ? userId : null
    );
    const onProgress = legacyCall ? legacyProgress : mcuIdOrProgress;
    if (!files || files.length === 0) {
      return { success: true, uploadedCount: 0, failedCount: 0, results: [] };
    }

    const results = await uploadFilesToSupabase(
      files,
      context,
      onProgress
    );

    // Count successful and failed uploads
    const uploadedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const firstFailure = results.find(result => !result.success);

    if (failedCount > 0) {
      const rollback = await deleteOrphanedFiles(results, context);
      return {
        success: false,
        uploadedCount: 0,
        failedCount,
        failedIndexes: files.map((file, index) => index),
        error: rollback.success
          ? firstFailure?.error
          : `${firstFailure?.error || 'Upload gagal.'} Pembersihan file juga gagal.`,
        errorCode: rollback.success ? firstFailure?.code : 'UPLOAD_ROLLBACK_FAILED',
        message: 'Upload batch gagal dan dibatalkan.',
        results
      };
    }

    return {
      success: failedCount === 0,
      uploadedCount,
      failedCount,
      failedIndexes: results.filter(result => !result.success).map(result => result.fileIndex),
      error: firstFailure?.error,
      errorCode: firstFailure?.code,
      message: `Uploaded ${uploadedCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      results
    };
  } catch (error) {
    return {
      success: false,
      uploadedCount: 0,
      failedCount: Array.isArray(files) ? files.length : 0,
      failedIndexes: Array.isArray(files) ? files.map((file, index) => index) : [],
      error: error.message,
      errorCode: error.code || 'UPLOAD_API_FAILED',
      results: []
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
 * Delete files created by a submission that failed before MCU persistence.
 */
export async function deleteOrphanedFiles(results, contextOrEmployeeId, mcuId = null, userId = null) {
  const context = normalizeUploadContext(contextOrEmployeeId, mcuId, userId);
  const uploaded = (Array.isArray(results) ? results : [])
    .filter(result => result?.success && result.fileId);
  let deletedCount = 0;
  const errors = [];

  for (const result of uploaded) {
    try {
      await postUploadAction({
        action: 'rollback-file-upload',
        employeeId: context.employeeId,
        mcuId: context.mcuId,
        fileId: result.fileId
      });
      deletedCount += 1;
    } catch (error) {
      errors.push(error);
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    error: errors[0]?.message,
    errorCode: errors[0]?.code
  };
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
      headers: getAuthHeaders({
        'Content-Type': 'application/json'
      })
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
    const response = await fetch(`${apiUrl}?mcuId=${encodeURIComponent(mcuId)}`, {
      headers: getAuthHeaders()
    });

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
export async function downloadFile(fileId, fileName, userId, targetWindow = null) {
  try {
    if (!fileId) {
      return { success: false, error: 'No file ID provided' };
    }

    if (!userId) {
      return { success: false, error: 'User authentication required' };
    }
    // Request signed URL from server
    const apiUrl = '/api/download-file';
    const response = await fetch(`${apiUrl}?fileId=${encodeURIComponent(fileId)}&userId=${encodeURIComponent(userId)}`, {
      headers: getAuthHeaders()
    });

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
    // Reuse a window opened directly by the user when supplied, avoiding popup blocking.
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = result.signedUrl;
    } else {
      window.open(result.signedUrl, '_blank');
    }

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
    const response = await fetch(`${apiUrl}?mcuId=${encodeURIComponent(mcuId)}&userId=${encodeURIComponent(userId)}`, {
      headers: getAuthHeaders()
    });

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
      headers: getAuthHeaders({
        'Content-Type': 'application/json'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: Failed to delete file`,
        details: errorData.details
      };
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
