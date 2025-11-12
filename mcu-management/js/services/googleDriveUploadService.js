/**
 * Google Drive Upload Service
 * Handles file uploads to Google Drive via Supabase Edge Functions
 * Stores metadata in Supabase mcufiles table
 */

// Get Supabase URL from environment
const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://ygvhixktmnmgqmqfmtlr.supabase.co';
const GOOGLE_DRIVE_UPLOAD_ENDPOINT = `${SUPABASE_URL}/functions/v1/upload-to-google-drive`;

/**
 * Upload file to Google Drive via backend API
 * @param {File} file - File to upload
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {string} userId - User ID
 * @param {string} userName - User display name
 * @param {Function} onProgress - Progress callback (current, total, message)
 * @returns {Object} - Upload result with googleDriveFileId and metadata
 */
export async function uploadFileToGoogleDrive(file, employeeId, mcuId, userId, userName, onProgress = null) {
  try {
    if (!file || !employeeId || !mcuId) {
      throw new Error('Missing required parameters: file, employeeId, mcuId');
    }

    if (!GOOGLE_DRIVE_UPLOAD_ENDPOINT) {
      throw new Error('Google Drive upload endpoint not configured');
    }

    // Prepare form data for multipart upload
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('employeeId', employeeId);
    formData.append('mcuId', mcuId);
    formData.append('userId', userId || 'unknown');
    formData.append('userName', userName || 'Unknown');

    if (onProgress) {
      onProgress(0, 1, `Uploading ${file.name}...`);
    }

    // Call backend API to upload to Google Drive
    const response = await fetch(GOOGLE_DRIVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      let errorMsg = `Upload failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch (e) {
        errorMsg = `Upload failed: ${response.statusText || 'Unknown error'} (${response.status})`;
      }
      throw new Error(errorMsg);
    }

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      throw new Error(`Invalid response from server: ${response.statusText}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Result now contains:
    // - success: true
    // - fileId: UUID from Supabase
    // - googleDriveFileId: Google Drive file ID
    // - fileName: File name
    // - fileSize: File size in bytes
    // - uploadedAt: Upload timestamp

    if (onProgress) {
      onProgress(1, 1, `${file.name} uploaded successfully`);
    }

    return {
      success: true,
      fileId: result.fileId,
      googleDriveFileId: result.googleDriveFileId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      uploadedAt: result.uploadedAt,
      googleDriveLink: `https://drive.google.com/file/d/${result.googleDriveFileId}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${result.googleDriveFileId}`
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
}

/**
 * Upload batch of files to Google Drive
 * @param {Array<File>} files - Array of files to upload
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {string} userId - User ID
 * @param {Function} onProgress - Progress callback (current, total, message)
 * @returns {Object} - Upload result with count and details
 */
export async function uploadBatchFilesToGoogleDrive(files, employeeId, mcuId, userId, onProgress = null) {
  try {
    if (!files || files.length === 0) {
      return {
        success: true,
        uploadedCount: 0,
        failedCount: 0,
        results: [],
        error: null
      };
    }

    const results = [];
    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = i + 1;

      if (onProgress) {
        onProgress(fileIndex, files.length, `Uploading ${file.name}...`);
      }

      try {
        const result = await uploadFileToGoogleDrive(
          file,
          employeeId,
          mcuId,
          userId,
          null,
          onProgress
        );

        results.push({
          fileName: file.name,
          success: true,
          googleDriveFileId: result.googleDriveFileId,
          fileId: result.fileId
        });

        uploadedCount++;
      } catch (error) {
        failedCount++;
        results.push({
          fileName: file.name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: failedCount === 0,
      uploadedCount,
      failedCount,
      results,
      error: failedCount > 0 ? `${failedCount} file(s) failed to upload` : null
    };
  } catch (error) {
    console.error('Batch upload error:', error);
    return {
      success: false,
      uploadedCount: 0,
      failedCount: files.length,
      results: [],
      error: error.message
    };
  }
}

/**
 * Get Google Drive download URL
 * @param {string} googleDriveFileId - Google Drive file ID
 * @returns {string} - Download URL
 */
export function getGoogleDriveDownloadUrl(googleDriveFileId) {
  return `https://drive.google.com/uc?export=download&id=${googleDriveFileId}`;
}

/**
 * Get Google Drive preview URL
 * @param {string} googleDriveFileId - Google Drive file ID
 * @returns {string} - Preview URL
 */
export function getGoogleDrivePreviewUrl(googleDriveFileId) {
  return `https://drive.google.com/file/d/${googleDriveFileId}/preview`;
}

/**
 * Get Google Drive web view URL
 * @param {string} googleDriveFileId - Google Drive file ID
 * @returns {string} - Web view URL
 */
export function getGoogleDriveWebViewUrl(googleDriveFileId) {
  return `https://drive.google.com/file/d/${googleDriveFileId}/view`;
}

export default {
  uploadFileToGoogleDrive,
  uploadBatchFilesToGoogleDrive,
  getGoogleDriveDownloadUrl,
  getGoogleDrivePreviewUrl,
  getGoogleDriveWebViewUrl
};
