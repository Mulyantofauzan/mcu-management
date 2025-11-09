/**
 * Server-Side Compression Service
 *
 * Uploads files to /api/compress-upload which handles:
 * - PDF compression (gzip, 50-70% reduction)
 * - Image compression (sharp quality 70%, 60-80% reduction)
 * - Automatic Supabase storage upload
 * - Metadata persistence
 *
 * Usage:
 * const result = await serverCompressionService.uploadFile(file, employeeId, mcuId, progressCallback);
 */

/**
 * Upload file to server for compression and storage
 * @param {File} file - File object from input
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {Function} onProgress - Optional progress callback (current, total)
 * @returns {Promise<Object>} Upload result with compression stats
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

    // Validate file size (2MB max - Vercel serverless limit)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 2MB per file`
      );
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);
    formData.append('mcuId', mcuId);

    console.log(`📤 Starting server-side compression upload: ${file.name}`);

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
            console.log(`✅ File compressed and uploaded successfully:`, response);
            resolve({
              success: true,
              fileName: file.name,
              originalSize: response.file.originalSize,
              compressedSize: response.file.compressedSize,
              compressionRatio: response.file.compressionRatio,
              type: response.file.type,
              uploadUrl: response.upload.originalUrl,
              storagePath: response.upload.storagePath,
              fileId: response.upload.fileId,
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

      // Send request to compression API
      // Use relative path (same Vercel deployment, no CORS issues)
      const apiUrl = '/api/compress-upload';
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
 * Upload multiple files sequentially with compression
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
        `✅ Compressed: ${result.originalSize} → ${result.compressedSize} bytes (${result.compressionRatio}% reduction)`
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
 * Get compression stats for a file without uploading
 * (For previewing compression benefit)
 */
export async function estimateCompressionRatio(file) {
  try {
    // This is a rough estimate based on file type
    // PDF: 50-70% reduction
    // JPG: 20-40% reduction (already compressed)
    // PNG: 60-80% reduction

    let estimatedRatio = 0;

    if (file.type === 'application/pdf') {
      // PDFs typically compress well with gzip (50-70%)
      estimatedRatio = 55; // Conservative estimate
    } else if (file.type === 'image/png') {
      // PNG compresses well (60-80%)
      estimatedRatio = 70;
    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      // JPG already compressed, less benefit (20-40%)
      estimatedRatio = 30;
    }

    const estimatedSize = Math.round(file.size * (1 - estimatedRatio / 100));

    return {
      originalSize: file.size,
      estimatedSize,
      estimatedRatio
    };
  } catch (error) {
    console.error('Error estimating compression:', error.message);
    return null;
  }
}

export default {
  uploadFileWithServerCompression,
  uploadFilesWithServerCompression,
  estimateCompressionRatio
};
