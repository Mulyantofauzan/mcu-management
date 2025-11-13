/**
 * Cloudflare R2 Storage Service
 * Handles file uploads to Cloudflare R2 with size validation
 *
 * Features:
 * - Upload files to Cloudflare R2 (S3-compatible)
 * - 2MB file size limit per file
 * - File path structure: /mcu_files/{EmployeeName_EmployeeId}/{MCU-ID}/{filename}
 * - Metadata saved to Supabase database
 * - Public download URLs
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

// Validate R2 configuration on startup
function validateR2Config() {
  const required = {
    'CLOUDFLARE_R2_ENDPOINT': process.env.CLOUDFLARE_R2_ENDPOINT,
    'CLOUDFLARE_R2_ACCESS_KEY_ID': process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY': process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    'CLOUDFLARE_R2_BUCKET_NAME': process.env.CLOUDFLARE_R2_BUCKET_NAME,
    'CLOUDFLARE_ACCOUNT_ID': process.env.CLOUDFLARE_ACCOUNT_ID
  };

  const missing = [];
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ R2 Config Error - Missing:', missing.join(', '));
    throw new Error(`Missing R2 environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ R2 configuration loaded and validated');
  return true;
}

// Initialize Supabase client for metadata and employee name lookups
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate and initialize R2 configuration
let s3Client = null;
let R2_CONFIG_VALID = false;

try {
  console.log('🔍 Validating R2 configuration...');
  validateR2Config();
  console.log('✅ R2 configuration validated');

  // Initialize R2 S3 Client with proper error handling
  console.log('🔧 Initializing S3Client...');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    },
    logger: {
      debug: (msg) => console.debug(`[R2 Debug] ${msg}`),
      info: (msg) => console.info(`[R2 Info] ${msg}`),
      warn: (msg) => console.warn(`[R2 Warn] ${msg}`),
      error: (msg) => console.error(`[R2 Error] ${msg}`)
    }
  });

  console.log('✅ S3Client initialized successfully');
  R2_CONFIG_VALID = true;
} catch (error) {
  console.error('❌ R2 Client initialization failed:', error.message);
  console.error('❌ Stack trace:', error.stack);
  console.error('❌ This means files will FAIL to upload to R2!');
}

const STORAGE_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-dd28e3fca9424669a25f4edf5ae53f1a.r2.dev';
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
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
 * Generate public URL for R2 file
 */
function generatePublicUrl(filePath) {
  // Format: https://pub-{deployment-id}.r2.dev/{path}
  // Uses public development URL for R2 bucket
  return `${R2_PUBLIC_URL}/${filePath}`;
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
 * Upload file to Cloudflare R2
 */
async function uploadFileToStorage(fileBuffer, fileName, employeeId, mcuId, mimeType) {
  try {
    // Check R2 configuration
    if (!R2_CONFIG_VALID || !s3Client) {
      throw new Error('R2 client not initialized. Check environment variables.');
    }

    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File terlalu besar (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB). Maksimal 3MB per file`
      );
    }

    // Validate inputs
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    if (!fileName) {
      throw new Error('File name is required');
    }

    if (!employeeId || !mcuId) {
      throw new Error('Employee ID and MCU ID are required');
    }

    // Generate file path with correct structure
    const { folderPath, filePath } = await generateStoragePath(employeeId, mcuId, fileName);

    console.log(`📤 Uploading to Cloudflare R2: ${fileName}`);
    console.log(`   Size: ${(fileBuffer.length / 1024).toFixed(1)}KB`);
    console.log(`   Path: ${filePath}`);
    console.log(`   Bucket: ${STORAGE_BUCKET}`);
    console.log(`   Endpoint: ${R2_ENDPOINT}`);

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: filePath,
      Body: fileBuffer,
      ContentType: mimeType
    });

    console.log(`🔄 Sending upload command to R2...`);
    const uploadResult = await s3Client.send(uploadCommand);

    // Validate upload response
    if (!uploadResult) {
      throw new Error('R2 upload returned no response');
    }

    console.log(`✅ Upload command succeeded`);
    console.log(`   ETag: ${uploadResult.$metadata?.httpHeaders?.etag || 'N/A'}`);
    console.log(`   Status Code: ${uploadResult.$metadata?.httpStatusCode || 'N/A'}`);

    // Generate public URL
    const publicUrl = generatePublicUrl(filePath);

    console.log(`✅ File uploaded successfully to R2`);
    console.log(`   Folder: ${folderPath}`);
    console.log(`   R2 path: ${filePath}`);
    console.log(`   Public URL: ${publicUrl}`);

    // Save metadata
    const metadataResult = await saveFileMetadata(
      fileName,
      employeeId,
      mcuId,
      fileBuffer.length,
      mimeType,
      filePath,
      publicUrl
    );

    if (!metadataResult) {
      console.warn('⚠️ File uploaded but metadata save failed');
    }

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
    console.error('   Stack:', error.stack);
    throw error;
  }
}

module.exports = {
  uploadFileToStorage,
  generateStoragePath,
  getEmployeeName,
  generatePublicUrl,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  STORAGE_BUCKET
};
