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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
// Only PDF and images allowed
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

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
 * PDF and Office docs typically compress 50-70%
 * Images already compressed, minimal benefit
 */
async function compressFile(file) {
    try {
        // Only compress PDF files
        if (!isCompressible(file.type)) {
            console.log(`⏭️ Not compressed: ${file.name} (already optimized format)`);
            return file;
        }

        // PDF compression with gzip
        console.log(`🔄 Compressing ${file.name}...`);

        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Wait for pako to be available (loaded via CDN in index.html)
        let attempts = 0;
        while (typeof window.pako === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof window.pako === 'undefined') {
            console.warn('⚠️ pako not available, uploading uncompressed');
            return file;
        }

        const compressed = window.pako.gzip(data);
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
        console.error('❌ Compression error:', error);
        console.log('📄 Uploading original uncompressed file');
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
            .select('fileid, filename, filetype, filesize, uploadedat, uploadedby')
            .eq('mcuid', mcuId)
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
 * @returns {Promise<{success: boolean, uploadedCount?: number, failedCount?: number, error?: string}>}
 */
export async function uploadBatchFiles(files, employeeId, mcuId, userId) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        if (!files || files.length === 0) {
            return { success: true, uploadedCount: 0, failedCount: 0 };
        }

        console.log(`📦 Uploading ${files.length} file(s) in batch for MCU ${mcuId}...`);

        const supabase = getSupabaseClient();
        let uploadedCount = 0;
        let failedCount = 0;
        const uploadedFilesData = [];

        // Upload each file
        for (const file of files) {
            try {
                // Compress if applicable
                const processedFile = await compressFile(file);

                // Generate storage path with mcuId
                const storagePath = generateStoragePath(employeeId, mcuId, file.name);

                console.log(`   📤 Uploading: ${file.name}`);

                // Upload to storage
                const { data, error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(storagePath, processedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error(`   ❌ Upload failed: ${file.name}`, uploadError);
                    failedCount++;
                    continue;
                }

                uploadedCount++;
                uploadedFilesData.push({
                    employeeid: employeeId,
                    mcuid: mcuId,
                    filename: file.name,
                    filetype: file.type,
                    filesize: file.size,
                    supabase_storage_path: storagePath,
                    uploadedby: userId
                });

                console.log(`   ✅ Uploaded: ${file.name}`);
            } catch (error) {
                console.error(`   ❌ Error uploading ${file.name}:`, error);
                failedCount++;
            }
        }

        // Save all file metadata to database at once
        if (uploadedFilesData.length > 0) {
            const { error: insertError } = await supabase
                .from('mcufiles')
                .insert(uploadedFilesData);

            if (insertError) {
                console.error('❌ Database insert failed:', insertError);
                throw new Error(`Database error: ${insertError.message}`);
            }

            console.log(`✅ Saved ${uploadedFilesData.length} file(s) to database`);
        }

        return {
            success: true,
            uploadedCount,
            failedCount,
            message: `Uploaded ${uploadedCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`
        };

    } catch (error) {
        console.error('❌ Batch upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
