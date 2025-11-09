/**
 * Supabase Storage Service
 *
 * Handles file upload/download to Supabase Storage bucket 'mcu-documents'
 * Features:
 * - File compression before upload (50%+ reduction for PDFs/DOC)
 * - Metadata tracking in mcufiles table
 * - File deletion
 * - Error handling and validation
 * - Smart compression based on file type
 */

import { getSupabaseClient, isSupabaseEnabled } from '../config/supabase.js';

const BUCKET_NAME = 'mcu-documents';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file (Vercel serverless limit)
// Only PDF and images allowed
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

// Pako initialization promise - ensure pako loads only once
let pakoInitPromise = null;

/**
 * Call the compress-pdf Edge Function to compress PDFs server-side
 * This ensures all PDFs are compressed regardless of browser pako availability
 * @param {string} filePath - Path to file in storage (e.g., 'employee-123/mcu-456/file.pdf')
 * @param {string} mimeType - File MIME type (e.g., 'application/pdf')
 */
async function triggerEdgeFunctionCompression(filePath, mimeType) {
    try {
        // Only trigger for PDFs
        if (mimeType !== 'application/pdf') {
            return { skipped: true };
        }

        const supabase = getSupabaseClient();

        // Call the Edge Function
        const { data, error } = await supabase.functions.invoke('compress-pdf', {
            body: {
                record: {
                    name: filePath,
                    metadata: { mimetype: mimeType }
                }
            }
        });

        if (error) {
            console.warn(`⚠️ Compression error: ${error.message}`);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.warn(`⚠️ Compression failed: ${error.message}`);
        // Don't throw - compression is optional, upload already succeeded
        return { success: false, error: error.message };
    }
}

/**
 * Ensure pako is loaded and available
 * Returns promise that resolves when pako is ready
 * Waits up to 10 seconds for pako CDN to load from multiple sources
 */
function getPakoReady() {
    if (pakoInitPromise) {
        return pakoInitPromise;
    }

    pakoInitPromise = new Promise((resolve, reject) => {
        // If pako already loaded, resolve immediately
        if (typeof window.pako !== 'undefined' && window.pako.gzip) {
            resolve(window.pako);
            return;
        }

        // If pakoReady flag is false, all CDN sources failed
        if (window.pakoReady === false) {
            const error = new Error('Pako compression library failed from all CDN sources.');
            console.error('❌ Pako load failed:', error);
            reject(error);
            return;
        }

        // Otherwise wait for it to load (dynamic loader in index.html tries multiple CDNs)
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds total (100 * 100ms)

        const checkPako = setInterval(() => {
            attempts++;
            if (typeof window.pako !== 'undefined' && window.pako.gzip) {
                clearInterval(checkPako);
                resolve(window.pako);
                return;
            }

            if (window.pakoReady === false) {
                clearInterval(checkPako);
                const error = new Error('Pako compression library failed from all CDN sources.');
                console.error('❌ Pako load failed:', error);
                reject(error);
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(checkPako);
                const error = new Error('Pako compression library failed to load after 10 seconds from all CDN sources.');
                console.error('❌ Pako initialization timeout:', error);
                reject(error);
            }
        }, 100);
    });

    return pakoInitPromise;
}

/**
 * Check if file type benefits from compression
 * Only PDFs compress well (50-70% reduction)
 * Images are already compressed
 */
function isCompressible(mimeType) {
    // Only compress PDFs
    return mimeType === 'application/pdf';
}

/**
 * Compress file using pako gzip compression
 * SMART COMPRESSION: Only compress files < 5MB to avoid browser overhead
 * - PDF files < 5MB: Compress (50-70% reduction)
 * - PDF files >= 5MB: Upload as-is (too heavy to compress in browser)
 * - Images: Never compress (already optimized)
 */
async function compressFile(file) {
    // Only compress PDF files
    if (!isCompressible(file.type)) {
        console.log(`⏭️ Not compressed: ${file.name} (already optimized format)`);
        return file;
    }

    const COMPRESSION_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit for browser compression

    // Skip compression for large files (too heavy for browser)
    if (file.size >= COMPRESSION_SIZE_LIMIT) {
        console.log(`⏭️ Not compressed: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > 5MB limit, upload as-is)`);
        return file;
    }

    // For small PDFs: try to compress
    console.log(`🔄 Attempting to compress ${file.name} (${(file.size / 1024).toFixed(1)}KB)...`);

    try {
        // Wait for pako to be ready (max 10 seconds)
        const pako = await getPakoReady();

        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Perform compression
        const compressed = pako.gzip(data);
        const originalSize = file.size;
        const compressedSize = compressed.length;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        console.log(`✅ Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`);

        // Create new File object with compressed data
        const compressedFile = new File(
            [compressed],
            file.name + '.gz',
            { type: 'application/gzip' }
        );

        return compressedFile;

    } catch (error) {
        // Compression failed - but upload can still proceed without compression
        console.warn(`⚠️ Compression failed: ${error.message}`);
        console.log(`📤 Uploading ${file.name} without compression (CDN unavailable)`);
        // Return original uncompressed file - upload will still work
        return file;
    }
}

/**
 * Generate storage path for file
 * Format: {timestamp}-{mcuId}-{filename}
 * This includes mcuId so files can be found later when saving metadata
 * (BUCKET_NAME is 'mcu-documents', so path is relative to bucket)
 */
function generateStoragePath(employeeId, mcuId, fileName) {
    const timestamp = Date.now(); // Simple timestamp
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Include mcuId if available, so we can find files later when saving metadata
    if (mcuId) {
        return `${timestamp}-${mcuId}-${sanitizedName}`;
    }
    return `${timestamp}-${sanitizedName}`;
}

/**
 * Validate file before upload
 */
function validateFile(file) {
    if (!file) {
        throw new Error('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed. Allowed: PDF, JPG, PNG`);
    }

    return true;
}

/**
 * Upload file to Supabase Storage
 *
 * @param {File} file - File object to upload
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID (optional for orphaned files)
 * @param {string} userId - User ID uploading file
 * @param {boolean} skipDBInsert - If true, upload to storage only without saving metadata to DB (default: false)
 * @returns {Promise<{success: boolean, fileid?: string, storagePath?: string, error?: string}>}
 */
export async function uploadFile(file, employeeId, mcuId, userId, skipDBInsert = false) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        // Validate file
        validateFile(file);

        const supabase = getSupabaseClient();

        // Note: Using custom authentication from database, not Supabase Auth
        // RLS is disabled on mcufiles table, so no auth check needed
        console.log(`👤 Upload initiated by userId: ${userId}`);

        // Compress file if applicable
        const processedFile = await compressFile(file);

        // Generate storage path
        const storagePath = generateStoragePath(employeeId, mcuId, file.name);

        console.log(`📤 Uploading: ${file.name} (${(file.size / 1024).toFixed(1)}KB) to path: ${storagePath}`);

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, processedFile, {
                cacheControl: '3600',
                upsert: false // Don't overwrite existing files
            });

        if (uploadError) {
            // Detailed error logging for diagnostics
            console.error('📋 Upload error details:');
            console.error('   Status:', uploadError.status);
            console.error('   Message:', uploadError.message);
            console.error('   Code:', uploadError.statusCode);

            // Provide helpful diagnostic message
            let diagnosticHint = '';
            if (uploadError.message.includes('violates row-level security')) {
                diagnosticHint = '\n\n💡 This is an RLS policy issue. Check: RLS-DIAGNOSIS-AND-FIX.md';
            } else if (uploadError.message.includes('mime type')) {
                diagnosticHint = '\n\n💡 This is a MIME type restriction. Check bucket settings in Supabase Dashboard.';
            } else if (uploadError.message.includes('does not exist')) {
                diagnosticHint = '\n\n💡 Bucket does not exist or is inaccessible.';
            }

            throw new Error(`Upload failed: ${uploadError.message}${diagnosticHint}`);
        }

        console.log(`✅ File stored: ${data?.path || storagePath}`);

        // Trigger server-side compression for PDFs (non-blocking)
        // This ensures all PDFs are compressed regardless of browser pako availability
        triggerEdgeFunctionCompression(storagePath, file.type).catch(err => {
            console.warn('⚠️ Edge Function compression failed (non-critical):', err);
        });

        // If skipDBInsert is true, only upload to storage, don't save metadata yet
        if (skipDBInsert) {
            console.log(`⏳ File uploaded to storage. DB insert skipped (will be saved on MCU creation)`);
            return {
                success: true,
                storagePath: storagePath,
                message: 'File uploaded to storage. Will be linked to MCU on save.'
            };
        }

        // Save metadata to mcufiles table (using camelCase column names)
        const { data: fileRecord, error: dbError } = await supabase
            .from('mcufiles')
            .insert({
                employeeid: employeeId,
                mcuid: mcuId || null,
                filename: file.name,
                filetype: file.type,
                filesize: file.size,
                supabase_storage_path: storagePath,
                uploadedby: userId
            })
            .select('fileid')
            .single();

        if (dbError) {
            console.error('📋 Database error details:', dbError);
            // Clean up uploaded file if database insert fails
            await supabase.storage
                .from(BUCKET_NAME)
                .remove([storagePath]);
            throw new Error(`Database error: ${dbError.message}`);
        }

        console.log(`✅ File uploaded successfully: ${fileRecord.fileid}`);

        return {
            success: true,
            fileid: fileRecord.fileid,
            storagePath: storagePath
        };
    } catch (error) {
        console.error('❌ Upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete file from storage and database
 *
 * @param {string} fileid - File ID from mcufiles table
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFile(fileid) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        const supabase = getSupabaseClient();

        // Get file metadata
        const { data: fileRecord, error: queryError } = await supabase
            .from('mcufiles')
            .select('supabase_storage_path, filename')
            .eq('fileid', fileid)
            .single();

        if (queryError || !fileRecord) {
            throw new Error('File not found in database');
        }

        // Soft delete in database (mark as deleted using camelCase column name)
        const { error: deleteError } = await supabase
            .from('mcufiles')
            .update({ deletedat: new Date().toISOString() })
            .eq('fileid', fileid);

        if (deleteError) {
            throw new Error(`Database delete failed: ${deleteError.message}`);
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([fileRecord.supabase_storage_path]);

        if (storageError) {
            // Log error but don't fail - file is already marked as deleted in DB
            console.warn(`⚠️ Storage delete failed: ${storageError.message}`);
        }

        console.log(`✅ File deleted: ${fileRecord.filename}`);

        return { success: true };
    } catch (error) {
        console.error('❌ Delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get list of files for an MCU
 *
 * @param {string} mcuId - MCU ID
 * @returns {Promise<Array>}
 */
export async function getFilesByMCU(mcuId) {
    try {
        if (!isSupabaseEnabled()) {
            return [];
        }

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('mcufiles')
            .select('fileid, filename, filetype, filesize, uploadedat, uploadedby, mcuid, supabase_storage_path')
            .eq('mcuid', mcuId)
            .is('deletedat', null)
            .order('uploadedat', { ascending: false });

        if (error) {
            console.error('❌ Error loading files for MCU:', error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('❌ Error loading files:', error.message);
        return [];
    }
}

/**
 * Get list of files for an employee
 *
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Array>}
 */
export async function getFilesByEmployee(employeeId) {
    try {
        if (!isSupabaseEnabled()) {
            return [];
        }

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('mcufiles')
            .select('fileid, mcuid, filename, filetype, filesize, uploadedat')
            .eq('employeeid', employeeId)
            .is('deletedat', null)
            .order('uploadedat', { ascending: false });

        if (error) {
            console.error('❌ Query error:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('❌ Get files error:', error);
        return [];
    }
}

/**
 * Download file from Supabase Storage
 *
 * @param {string} storagePath - Full storage path
 * @param {string} fileName - File name for download
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function downloadFile(storagePath, fileName) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        const supabase = getSupabaseClient();

        // Get download URL (public link)
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        if (!data) {
            throw new Error('Failed to generate download URL');
        }

        // Trigger download
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ Download started: ${fileName}`);

        return { success: true };
    } catch (error) {
        console.error('❌ Download error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get download URL for file (without auto-download)
 *
 * @param {string} storagePath - Full storage path
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getDownloadUrl(storagePath) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        const supabase = getSupabaseClient();

        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        if (!data) {
            throw new Error('Failed to generate URL');
        }

        return {
            success: true,
            url: data.publicUrl
        };
    } catch (error) {
        console.error('❌ Get URL error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Save uploaded files' metadata to database for a specific MCU
 * This is called after MCU is created, to link temporarily uploaded files to the MCU
 * @param {string} mcuId - MCU ID
 * @param {string} employeeId - Employee ID
 * @param {string} userId - User ID uploading files
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function saveUploadedFilesMetadata(mcuId, employeeId, userId) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        const supabase = getSupabaseClient();

        // List all files in storage with this MCU ID (formatted as part of path)
        // Path format: {timestamp}-{mcuId}-{filename}
        const { data: files, error: listError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(`${employeeId}`);

        if (listError) {
            console.error('Error listing files:', listError);
            return { success: false, error: listError.message };
        }

        if (!files || files.length === 0) {
            console.log(`ℹ️ No files to save for MCU ${mcuId}`);
            return { success: true, count: 0 };
        }

        // Filter files that belong to this MCU (path contains mcuId)
        const mcuFiles = files.filter(file => file.name.includes(mcuId));

        if (mcuFiles.length === 0) {
            console.log(`ℹ️ No files found for MCU ${mcuId}`);
            return { success: true, count: 0 };
        }

        // Prepare batch insert data
        const fileRecords = mcuFiles.map(file => {
            // Parse filename: {timestamp}-{mcuId}-{filename}
            // Remove timestamp and mcuId prefix to get original filename
            const parts = file.name.split('-');
            const originalFilename = parts.slice(2).join('-'); // Skip timestamp and mcuId parts

            return {
                employeeid: employeeId,
                mcuid: mcuId,
                filename: originalFilename || file.name, // Fallback to full name if parsing fails
                filetype: getFileTypeFromPath(file.name),
                filesize: file.metadata?.size || 0,
                supabase_storage_path: `${employeeId}/${file.name}`,
                uploadedby: userId
            };
        });

        // Insert all file metadata at once
        const { error: insertError } = await supabase
            .from('mcufiles')
            .insert(fileRecords);

        if (insertError) {
            console.error('Error saving file metadata:', insertError);
            return { success: false, error: insertError.message };
        }

        console.log(`✅ Saved ${fileRecords.length} file(s) metadata for MCU ${mcuId}`);
        return { success: true, count: fileRecords.length };

    } catch (error) {
        console.error('❌ Error saving file metadata:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Extract file type from file path/name
 */
function getFileTypeFromPath(filename) {
    if (filename.toLowerCase().endsWith('.pdf')) return 'application/pdf';
    if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) return 'image/jpeg';
    if (filename.toLowerCase().endsWith('.png')) return 'image/png';
    return 'application/octet-stream';
}

/**
 * Delete orphaned files (files uploaded but MCU was not created)
 * Called when MCU creation fails to clean up uploaded files
 * @param {string} mcuId - MCU ID that was generated
 * @param {string} employeeId - Employee ID
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
 */
export async function deleteOrphanedFiles(mcuId, employeeId) {
    try {
        if (!isSupabaseEnabled()) {
            return { success: true, deletedCount: 0 };
        }

        if (!mcuId || !employeeId) {
            return { success: true, deletedCount: 0 };
        }

        const supabase = getSupabaseClient();

        // List all files for this employee
        const { data: files, error: listError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(`${employeeId}`);

        if (listError) {
            console.warn('⚠️ Could not list files for cleanup:', listError.message);
            return { success: true, deletedCount: 0 }; // Don't fail, just log warning
        }

        if (!files || files.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        // Find files with this MCU ID in their path
        const orphanedFiles = files.filter(file => file.name.includes(mcuId));

        if (orphanedFiles.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        // Delete orphaned files
        const pathsToDelete = orphanedFiles.map(f => `${employeeId}/${f.name}`);

        const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(pathsToDelete);

        if (deleteError) {
            console.warn(`⚠️ Failed to delete ${orphanedFiles.length} orphaned file(s):`, deleteError.message);
            return { success: true, deletedCount: 0 }; // Don't fail, just log warning
        }

        console.log(`🗑️ Deleted ${orphanedFiles.length} orphaned file(s) for MCU ${mcuId}`);
        return { success: true, deletedCount: orphanedFiles.length };

    } catch (error) {
        console.warn('⚠️ Error deleting orphaned files:', error.message);
        return { success: true, deletedCount: 0 }; // Don't fail cleanup
    }
}

/**
 * Upload batch of files to storage and save metadata to database
 * Used when MCU is saved to upload all pending files
 * @param {File[]} files - Array of File objects
 * @param {string} employeeId - Employee ID
 * @param {string} mcuId - MCU ID
 * @param {string} userId - User ID
 * @param {Function} onProgress - Optional callback: (current, total) => { ... }
 * @returns {Promise<{success: boolean, uploadedCount?: number, failedCount?: number, error?: string}>}
 */
export async function uploadBatchFiles(files, employeeId, mcuId, userId, onProgress = null) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        if (!files || files.length === 0) {
            return { success: true, uploadedCount: 0, failedCount: 0 };
        }

        // Use server-side compression for all file uploads
        const { uploadFilesWithServerCompression } = await import('./serverCompressionService.js');

        console.log(`📦 Uploading ${files.length} file(s) with server-side compression for MCU ${mcuId}...`);

        try {
            const results = await uploadFilesWithServerCompression(
                files,
                employeeId,
                mcuId,
                onProgress
            );

            // Count successful and failed uploads
            const uploadedCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;

            // Log compression stats for successful uploads
            for (const result of results) {
                if (result.success) {
                    console.log(
                        `✅ ${result.fileName}: ${result.originalSize} → ${result.compressedSize} bytes (${result.compressionRatio}% reduction)`
                    );
                } else {
                    console.error(`❌ ${result.fileName}: ${result.error}`);
                }
            }

            return {
                success: uploadedCount > 0,
                uploadedCount,
                failedCount,
                message: `Uploaded ${uploadedCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
                results
            };
        } catch (error) {
            console.error('❌ Server compression error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }

    } catch (error) {
        console.error('❌ Batch upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
