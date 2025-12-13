/**
 * Cloudflare R2 Signed URL Service
 * Generates temporary signed URLs for private R2 bucket access
 *
 * Features:
 * - Generate signed URLs for secure file access
 * - URL expires after specified time (default 1 hour)
 * - Only authenticated users can download
 * - Server-side authorization checks
 * - Works with private R2 buckets
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize R2 S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  }
});

const STORAGE_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Generate a signed URL for downloading a file from private R2 bucket
 * @param {string} filePath - File path in R2 (e.g., mcu_files/John_Doe_EMP001/MCU-2024-001/file.pdf)
 * @param {number} expirySeconds - URL expiry time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL
 */
async function generateSignedUrl(filePath, expirySeconds = SIGNED_URL_EXPIRY_SECONDS) {
  try {
    if (!filePath) {
      throw new Error('File path is required');
    }
    // Create GetObject command for the file
    const getObjectCommand = new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: filePath
    });

    // Generate signed URL
    const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: expirySeconds
    });
    return signedUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Get signed URL for a file with authorization check
 * Verifies that the user owns the MCU or file before generating URL
 * @param {string} fileId - File ID from mcufiles table
 * @param {string} userId - User ID requesting the download
 * @returns {Promise<Object>} { success, signedUrl, fileName }
 */
async function getAuthorizedSignedUrl(fileId, userId) {
  try {
    if (!fileId || !userId) {
      throw new Error('File ID and User ID are required');
    }
    // Get file from database
    const { data: file, error: fileError } = await supabase
      .from('mcufiles')
      .select('fileid, filename, supabase_storage_path, mcuid, employeeid')
      .eq('fileid', fileId)
      .single();

    if (fileError || !file) {
      throw new Error('File not found');
    }
    // Get MCU details
    const { data: mcu, error: mcuError } = await supabase
      .from('mcu')
      .select('employeeId')
      .eq('mcuId', file.mcuid)
      .single();

    if (mcuError || !mcu) {
      throw new Error('MCU not found for this file');
    }

    // Get employee details
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('employeeId, userId')
      .eq('employeeId', mcu.employeeId)
      .single();

    if (empError || !employee) {
      throw new Error('Employee not found');
    }

    // Check authorization: user must be employee owner or admin
    // For now, simple check - you can enhance with role-based access
    const isOwner = employee.userId === userId;

    if (!isOwner) {
      // Could add admin check here
      throw new Error('Unauthorized: You do not have access to this file');
    }
    // Generate signed URL
    const signedUrl = await generateSignedUrl(file.supabase_storage_path);

    return {
      success: true,
      signedUrl,
      fileName: file.filename,
      expiresIn: SIGNED_URL_EXPIRY_SECONDS
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all signed URLs for files in an MCU
 * @param {string} mcuId - MCU ID
 * @param {string} userId - User ID requesting access
 * @returns {Promise<Object>} { success, files: [{filename, signedUrl, expiresIn}] }
 */
async function getAuthorizedMcuFiles(mcuId, userId) {
  try {
    if (!mcuId || !userId) {
      throw new Error('MCU ID and User ID are required');
    }
    // Get all files for MCU
    const { data: files, error: filesError } = await supabase
      .from('mcufiles')
      .select('fileid, filename, supabase_storage_path, employeeid')
      .eq('mcuid', mcuId);

    if (filesError) {
      throw new Error(`Database error: ${filesError.message}`);
    }

    if (!files || files.length === 0) {
      return {
        success: true,
        files: [],
        count: 0
      };
    }
    // Check authorization - get employee ID from first file
    const firstFile = files[0];
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('userId')
      .eq('employeeId', firstFile.employeeid)
      .single();

    if (empError || !employee) {
      throw new Error('Employee not found');
    }

    const isOwner = employee.userId === userId;
    if (!isOwner) {
      throw new Error('Unauthorized: You do not have access to these files');
    }

    // Generate signed URLs for all files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const signedUrl = await generateSignedUrl(file.supabase_storage_path);
          return {
            fileId: file.fileid,
            filename: file.filename,
            signedUrl,
            expiresIn: SIGNED_URL_EXPIRY_SECONDS
          };
        } catch (error) {
          return {
            fileId: file.fileid,
            filename: file.filename,
            error: 'Failed to generate download URL'
          };
        }
      })
    );

    return {
      success: true,
      files: filesWithUrls,
      count: filesWithUrls.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateSignedUrl,
  getAuthorizedSignedUrl,
  getAuthorizedMcuFiles,
  SIGNED_URL_EXPIRY_SECONDS
};
