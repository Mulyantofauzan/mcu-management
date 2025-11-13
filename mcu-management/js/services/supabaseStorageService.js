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
      console.warn(`⚠️ Large file detected: ${file.name} (${fileSizeMB}MB). Upload may take longer.`);
      showToast(`Perhatian: File ${file.name} berukuran ${fileSizeMB}MB. Proses upload mungkin memakan waktu lebih lama.`, 'warning');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);
    formData.append('mcuId', mcuId);

    console.log(`📤 Uploading to Cloudflare R2: ${file.name}`);

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
            console.log(`✅ File uploaded successfully:`, response);
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
      console.log(`🔗 Uploading to: ${apiUrl}`);

      xhr.open('POST', apiUrl);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
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

  console.log(`📦 Uploading ${files.length} file(s) to Cloudflare R2 (total: ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`   Employee ID: ${employeeId}`);
  console.log(`   MCU ID: ${mcuId}`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n📄 File ${i + 1}/${files.length}: ${file.name}`);

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

      console.log(
        `✅ Uploaded: ${(result.originalSize / 1024).toFixed(1)}KB`
      );
    } catch (error) {
      console.error(`❌ Failed to upload ${file.name}:`, error.message);
      results.push({
        success: false,
        fileName: file.name,
        error: error.message
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n✅ Upload complete: ${successCount}/${files.length} files successful`);

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
    console.error('Batch upload error:', error);
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
  console.log('saveUploadedFilesMetadata is not needed with new API (metadata saved automatically)');
  return { success: true, count: 0 };
}

/**
 * Delete orphaned files (stub for compatibility)
 * New API doesn't create orphaned files, so this is a no-op
 */
export async function deleteOrphanedFiles(mcuId, employeeId) {
  console.log('deleteOrphanedFiles is not needed with new API (no orphaned files created)');
  return { success: true, deletedCount: 0 };
}

/**
 * Delete file from storage (stub for compatibility)
 * Placeholder for potential future deletion functionality
 */
export async function deleteFile(fileId, mcuId) {
  console.log('deleteFile: File deletion not yet implemented in Supabase Storage');
  return { success: true };
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
      console.warn('⚠️ getFilesByMCU: Missing mcuId');
      return { success: true, files: [] };
    }

    const apiUrl = '/api/get-mcu-files';
    console.log(`📂 Fetching files for MCU: ${mcuId}`);

    const response = await fetch(`${apiUrl}?mcuId=${encodeURIComponent(mcuId)}`);

    if (!response.ok) {
      console.error(`⚠️ API error: ${response.status}`);
      return { success: false, files: [], error: `HTTP ${response.status}` };
    }

    const result = await response.json();

    if (!result.success) {
      console.error(`⚠️ API returned error: ${result.error}`);
      return { success: false, files: [], error: result.error };
    }

    console.log(`✅ Retrieved ${result.files?.length || 0} file(s) for MCU ${mcuId}`);
    return {
      success: true,
      files: result.files || [],
      count: result.count || 0
    };
  } catch (error) {
    console.error('❌ Error getting files:', error.message);
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

    console.log(`📥 Requesting download for file: ${fileId}`);

    // Request signed URL from server
    const apiUrl = '/api/download-file';
    const response = await fetch(`${apiUrl}?fileId=${encodeURIComponent(fileId)}&userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Download error:', error);
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`
      };
    }

    const result = await response.json();

    if (!result.success || !result.signedUrl) {
      console.error('❌ No signed URL received:', result);
      return {
        success: false,
        error: result.error || 'Failed to generate download link'
      };
    }

    console.log(`✅ Signed URL received, opening download...`);
    console.log(`   File: ${result.fileName}`);
    console.log(`   Expires in: ${result.expiresIn}s`);

    // Open signed URL in new tab
    window.open(result.signedUrl, '_blank');

    return {
      success: true,
      fileName: result.fileName,
      expiresIn: result.expiresIn
    };
  } catch (error) {
    console.error('Download error:', error);
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

    console.log(`📦 Getting all files for MCU: ${mcuId}`);

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

    console.log(`✅ Retrieved ${result.count || 0} file(s) with signed URLs`);
    return result;
  } catch (error) {
    console.error('Error getting MCU files:', error);
    return { success: false, error: error.message, files: [] };
  }
}

export default {
  uploadFileToSupabase,
  uploadFilesToSupabase,
  uploadBatchFiles,
  saveUploadedFilesMetadata,
  deleteOrphanedFiles,
  deleteFile,
  uploadFile,
  getFilesByMCU,
  downloadFile,
  getMCUFilesWithSignedUrls
};
