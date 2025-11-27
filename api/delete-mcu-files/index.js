/**
 * Delete MCU Files API
 * Endpoint: DELETE /api/delete-mcu-files?mcuId=XXX
 *
 * Performs two-step deletion:
 * 1. Hard delete files from Cloudflare R2 storage using storage path
 * 2. Soft delete files in database by setting deleted_at timestamp
 *
 * Queries mcufiles table for files linked to the MCU, gets their R2 paths,
 * deletes from R2 first, then marks as deleted in database
 */

const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize R2 S3 Client
let s3Client = null;
let R2_ENABLED = false;
try {
  if (process.env.CLOUDFLARE_R2_ENDPOINT &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      }
    });
    R2_ENABLED = true;
    console.log('[delete-mcu-files] R2 client initialized successfully');
  } else {
    console.warn('[delete-mcu-files] R2 environment variables not set, R2 deletion disabled');
  }
} catch (error) {
  console.warn('[delete-mcu-files] Warning: R2 client initialization failed:', error.message);
}

const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mcuId } = req.query;

    // Validate required parameters
    if (!mcuId) {
      return res.status(400).json({
        error: 'Missing required parameter: mcuId'
      });
    }

    console.log(`[delete-mcu-files] Starting deletion for MCU: ${mcuId}`);

    // Step 1: Get all files associated with this MCU (including storage path for R2 deletion)
    const { data: files, error: queryError } = await supabase
      .from('mcufiles')
      .select('fileid, supabase_storage_path')
      .eq('mcuid', mcuId)
      .is('deletedat', null); // Only get non-deleted files

    if (queryError) {
      console.error('[delete-mcu-files] Query error:', queryError);
      return res.status(500).json({
        error: `Failed to query files: ${queryError.message}`
      });
    }

    console.log(`[delete-mcu-files] Found ${files ? files.length : 0} files to delete`);

    // Step 2: Delete from Cloudflare R2 and database
    let r2DeletedCount = 0;
    let dbDeletedCount = 0;
    let r2FailedCount = 0;
    const now = new Date().toISOString();

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          // Try to delete from R2 first (if enabled)
          if (R2_ENABLED && file.supabase_storage_path) {
            try {
              console.log(`[delete-mcu-files] Deleting from R2: ${file.supabase_storage_path}`);
              const deleteCommand = new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: file.supabase_storage_path
              });
              await s3Client.send(deleteCommand);
              r2DeletedCount++;
              console.log(`[delete-mcu-files] Successfully deleted from R2: ${file.supabase_storage_path}`);
            } catch (r2Error) {
              r2FailedCount++;
              console.warn(`[delete-mcu-files] Failed to delete from R2: ${file.supabase_storage_path}`, r2Error.message);
              // Continue with database deletion even if R2 fails
            }
          }

          // Soft delete in database
          const { error: deleteError } = await supabase
            .from('mcufiles')
            .update({ deletedat: now })
            .eq('fileid', file.fileid)
            .select();

          if (!deleteError) {
            dbDeletedCount++;
            console.log(`[delete-mcu-files] Successfully soft-deleted in database: ${file.fileid}`);
          } else {
            console.warn(`[delete-mcu-files] Failed to soft-delete in database ${file.fileid}:`, deleteError.message);
          }
        } catch (err) {
          console.warn(`[delete-mcu-files] Exception processing file ${file.fileid}:`, err.message);
        }
      }
    }

    // Log final status
    console.log(`[delete-mcu-files] Deletion complete for MCU ${mcuId}:`);
    console.log(`  - R2 deleted: ${r2DeletedCount}`);
    console.log(`  - R2 failed: ${r2FailedCount}`);
    console.log(`  - Database soft-deleted: ${dbDeletedCount}`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${dbDeletedCount} file(s) for MCU ${mcuId}`,
      deletedCount: dbDeletedCount,
      totalFiles: files ? files.length : 0,
      r2DeletedCount: r2DeletedCount,
      r2FailedCount: r2FailedCount,
      r2Enabled: R2_ENABLED
    });

  } catch (error) {
    console.error('[delete-mcu-files] Internal error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
