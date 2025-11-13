/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage with size validation
 *
 * Features:
 * - Upload files to Supabase Storage bucket
 * - 2MB file size limit per file
 * - File path structure: /mcu_files/{EmployeeName_EmployeeId}/{MCU-ID}/{filename}
 * - Metadata saved to Supabase database
 * - Public download URLs
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STORAGE_BUCKET = 'mcu-files';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image'
};

/**
 * Helper function to get employee name by ID
 */
async function getEmployeeName(employeeId) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('name')
      .eq('employeeid', employeeId)
      .single();

    if (error || !data) {
      console.warn(`⚠️ Could not find employee name for ID: ${employeeId}`);
      return employeeId; // Fallback to ID if name not found
    }

    return data.name || employeeId;
  } catch (error) {
    console.warn(`⚠️ Error fetching employee name: ${error.message}`);
    return employeeId; // Fallback to ID
  }
}

/**
 * Generate folder path for file storage
 * Format: mcu_files/{EmployeeName_EmployeeId}/{MCU-ID}
 */
async function generateStoragePath(employeeId, mcuId, fileName) {
  const employeeName = await getEmployeeName(employeeId);
  // Sanitize employee name (remove special characters, spaces to underscores)
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
  const folderPath = `mcu_files/${sanitizedName}_${employeeId}/${mcuId}`;
  const filePath = `${folderPath}/${fileName}`;
  return { folderPath, filePath };
}

/**
 * Save file metadata to database
 */
async function saveFileMetadata(fileName, employeeId, mcuId, fileSize, mimeType, storagePath, publicUrl) {
  try {
    const { data, error } = await supabase
      .from('mcufiles')
      .insert([{
        fileid: `${mcuId}-${Date.now()}`,
        mcuid: mcuId,
        employeeid: employeeId,
        filename: fileName,
        filetype: mimeType,
        filesize: fileSize,
        supabase_storage_path: storagePath,
        google_drive_link: publicUrl,
        google_drive_folder_id: STORAGE_BUCKET,
        uploadedat: new Date().toISOString(),
        uploadedby: 'system',
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('⚠️ Database insert failed:', error.message);
      return null;
    }

    console.log(`✅ Metadata saved: ${fileName}`);
    return data?.[0] || null;
  } catch (error) {
    console.error('⚠️ Metadata save error:', error.message);
    return null;
  }
}

/**
 * Upload file to Supabase Storage
 */
async function uploadFileToStorage(fileBuffer, fileName, employeeId, mcuId, mimeType) {
  try {
    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File terlalu besar (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB). Maksimal 2MB per file`
      );
    }

    // Generate file path with correct structure
    const { folderPath, filePath } = await generateStoragePath(employeeId, mcuId, fileName);

    console.log(`📤 Uploading to Supabase Storage: ${fileName}`);
    console.log(`   Size: ${(fileBuffer.length / 1024).toFixed(1)}KB`);
    console.log(`   Path: ${filePath}`);

    // Upload to storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl;

    console.log(`✅ File uploaded successfully`);
    console.log(`   Folder: ${folderPath}`);
    console.log(`   Storage path: ${filePath}`);
    console.log(`   Public URL: ${publicUrl}`);

    // Save metadata
    await saveFileMetadata(
      fileName,
      employeeId,
      mcuId,
      fileBuffer.length,
      mimeType,
      filePath,
      publicUrl
    );

    return {
      success: true,
      fileName: fileName,
      fileSize: fileBuffer.length,
      fileType: ALLOWED_TYPES[mimeType] || 'file',
      storagePath: filePath,
      publicUrl: publicUrl
    };
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    throw error;
  }
}

module.exports = {
  uploadFileToStorage,
  generateStoragePath,
  getEmployeeName,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  STORAGE_BUCKET
};
