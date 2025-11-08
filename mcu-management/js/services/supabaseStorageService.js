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
 *
 * TEMPORARILY DISABLED: Upload first, compression later
 */
async function compressFile(file) {
    // Compression disabled for now - focus on getting upload working first
    console.log(`⏭️ Compression disabled (file: ${file.name})`);
    return file;
}

/**
 * Generate storage path for file
 * Simple format: {timestamp}-{filename}
 * (BUCKET_NAME is 'mcu-documents', so path is relative to bucket)
 */
function generateStoragePath(employeeId, mcuId, fileName) {
    const timestamp = Date.now(); // Simple timestamp
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
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
 * @returns {Promise<{success: boolean, fileid?: string, storagePath?: string, error?: string}>}
 */
export async function uploadFile(file, employeeId, mcuId, userId) {
    try {
        if (!isSupabaseEnabled()) {
            throw new Error('Supabase is not configured');
        }

        // Validate file
        validateFile(file);

        const supabase = getSupabaseClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error('User not authenticated. Please log in first.');
        }
        console.log(`👤 Authenticated as: ${user.email}`);

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
