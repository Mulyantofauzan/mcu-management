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
const { getSupabaseAdmin } = require('./supabaseAdmin');

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

function getUserId(claimsOrUserId) {
  if (!claimsOrUserId) return null;
  if (typeof claimsOrUserId === 'string') return claimsOrUserId;
  return claimsOrUserId.app_user_id || claimsOrUserId.sub || null;
}

function isAdmin(claimsOrUserId) {
  return Boolean(claimsOrUserId && typeof claimsOrUserId === 'object' && claimsOrUserId.app_role === 'Admin');
}

function canAccessFile(file, claimsOrUserId) {
  if (isAdmin(claimsOrUserId)) return true;

  const userId = getUserId(claimsOrUserId);
  if (!userId || !file?.uploadedby) return false;

  return String(file.uploadedby) === String(userId);
}

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
 * Requires a validated application user before generating URL.
 * @param {string} fileId - File ID from mcufiles table
 * @param {string} userId - User ID requesting the download
 * @returns {Promise<Object>} { success, signedUrl, fileName }
 */
async function getAuthorizedSignedUrl(fileId, claimsOrUserId) {
  try {
    const userId = getUserId(claimsOrUserId);
    if (!fileId || !userId) {
      throw new Error('File ID and User ID are required');
    }
    // Get file from database
    const supabase = getSupabaseAdmin();
    const { data: file, error: fileError } = await supabase
      .from('mcufiles')
      .select('fileid, filename, supabase_storage_path, mcuid, employeeid, uploadedby')
      .eq('fileid', fileId)
      .is('deletedat', null)
      .single();

    if (fileError || !file) {
      throw new Error('File not found');
    }
    if (!file.supabase_storage_path) {
      throw new Error('File storage path not found');
    }
    if (!canAccessFile(file, claimsOrUserId)) {
      throw new Error('Forbidden: file access denied');
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
async function getAuthorizedMcuFiles(mcuId, claimsOrUserId) {
  try {
    const userId = getUserId(claimsOrUserId);
    if (!mcuId || !userId) {
      throw new Error('MCU ID and User ID are required');
    }
    // Get all files for MCU
    const supabase = getSupabaseAdmin();
    const { data: files, error: filesError } = await supabase
      .from('mcufiles')
      .select('fileid, filename, supabase_storage_path, employeeid, uploadedby')
      .eq('mcuid', mcuId)
      .is('deletedat', null);

    if (filesError) {
      throw new Error(`Database error: ${filesError.message}`);
    }

    const accessibleFiles = (files || []).filter(file => canAccessFile(file, claimsOrUserId));

    if (accessibleFiles.length === 0) {
      return {
        success: true,
        files: [],
        count: 0
      };
    }
    // Generate signed URLs for all files
    const filesWithUrls = await Promise.all(
      accessibleFiles.map(async (file) => {
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
