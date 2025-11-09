/**
 * Google Drive Upload Service
 *
 * Uploads files directly to Google Drive (via backend API endpoint):
 * - No compression (Google Drive has unlimited storage)
 * - Files stored per-employee folder structure
 * - Metadata saved in Supabase for easy reference
 *
 * Usage:
 * const result = await uploadFileWithServerCompression(file, employeeId, mcuId, progressCallback);
 */

/**
 * Upload file directly to Google Drive
 * @param {File} file - File object from input
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {Function} onProgress - Optional progress callback (current, total)
 * @returns {Promise<Object>} Upload result with Google Drive link
 */
export async function uploadFileWithServerCompression(file, employeeId, mcuId, onProgress = null) {
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

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal file 5MB per file`
      );
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);
    formData.append('mcuId', mcuId);

    console.log(`📤 Uploading to Google Drive: ${file.name}`);

    // Upload with progress tracking
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
            console.log(`✅ File uploaded to Google Drive successfully:`, response);
            resolve({
              success: true,
              fileName: file.name,
              originalSize: response.file.size,
              type: response.file.type,
              googleDriveLink: response.googleDrive.link,
              googleDriveFileId: response.googleDrive.fileId,
              googleDriveFolderId: response.googleDrive.folderId,
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

      // Send request to Google Drive upload API
      // Frontend and API are on different Vercel projects, use absolute URL
      const apiUrl = 'https://api-c63kpbae9-adels-projects-5899a1ad.vercel.app/compress-upload';
      console.log(`🔗 Uploading to: ${apiUrl}`);

      xhr.open('POST', apiUrl);
      // Note: Don't set Content-Type header when using FormData
      // Browser will automatically set it with boundary
      xhr.send(formData);
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    throw error;
  }
}

/**
 * Upload multiple files sequentially to Google Drive
 * @param {File[]} files - Array of file objects
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object[]>} Array of upload results
 */
export async function uploadFilesWithServerCompression(
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

  console.log(`📦 Uploading ${files.length} file(s) (total: ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n📄 File ${i + 1}/${files.length}: ${file.name}`);

    try {
      const result = await uploadFileWithServerCompression(
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

export default {
  uploadFileWithServerCompression,
  uploadFilesWithServerCompression
};
