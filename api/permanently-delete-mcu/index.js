/**
 * Permanently Delete MCU API
 * Endpoint: DELETE /api/permanently-delete-mcu?mcuId=XXX
 *
 * Performs PERMANENT deletion of MCU and all associated files:
 * 1. Hard delete files from Cloudflare R2 storage
 * 2. Hard delete file records from mcufiles database table
 * 3. Hard delete MCU record from mcus table
 *
 * NOTE: This is called when user permanently deletes from "Data Terhapus".
 * This is irreversible - files and MCU record are completely removed.
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
    console.log('[permanently-delete-mcu] R2 client initialized successfully');
  } else {
    console.warn('[permanently-delete-mcu] R2 environment variables not set, R2 deletion disabled');
  }
} catch (error) {
  console.warn('[permanently-delete-mcu] Warning: R2 client initialization failed:', error.message);
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

    console.log(`[permanently-delete-mcu] Starting permanent deletion for MCU: ${mcuId}`);

    // Step 1: Get all files associated with this MCU (including deleted ones)
    const { data: files, error: queryError } = await supabase
      .from('mcufiles')
      .select('fileid, supabase_storage_path')
      .eq('mcuid', mcuId); // Include deleted files

    if (queryError) {
      console.error('[permanently-delete-mcu] Query error:', queryError);
      return res.status(500).json({
        error: `Failed to query files: ${queryError.message}`
      });
    }

    console.log(`[permanently-delete-mcu] Found ${files ? files.length : 0} files (including deleted) to permanently delete`);

    // Step 2: Hard delete from R2 and database
    let r2DeletedCount = 0;
    let r2FailedCount = 0;
    let dbDeletedCount = 0;

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          // Hard delete from R2 first (if enabled)
          if (R2_ENABLED && file.supabase_storage_path) {
            try {
              console.log(`[permanently-delete-mcu] Hard-deleting from R2: ${file.supabase_storage_path}`);
              const deleteCommand = new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: file.supabase_storage_path
              });
              await s3Client.send(deleteCommand);
              r2DeletedCount++;
              console.log(`[permanently-delete-mcu] Successfully deleted from R2: ${file.supabase_storage_path}`);
            } catch (r2Error) {
              r2FailedCount++;
              console.warn(`[permanently-delete-mcu] Failed to delete from R2: ${file.supabase_storage_path}`, r2Error.message);
              // Continue with database deletion even if R2 fails
            }
          }

          // Hard delete from database
          const { error: deleteError } = await supabase
            .from('mcufiles')
            .delete()
            .eq('fileid', file.fileid);

          if (!deleteError) {
            dbDeletedCount++;
            console.log(`[permanently-delete-mcu] Successfully hard-deleted from database: ${file.fileid}`);
          } else {
            console.warn(`[permanently-delete-mcu] Failed to hard-delete from database ${file.fileid}:`, deleteError.message);
          }
        } catch (err) {
          console.warn(`[permanently-delete-mcu] Exception processing file ${file.fileid}:`, err.message);
        }
      }
    }

    // Step 3: Hard delete MCU record itself
    console.log(`[permanently-delete-mcu] Hard-deleting MCU record: ${mcuId}`);
    const { error: mcuDeleteError } = await supabase
      .from('mcus')
      .delete()
      .eq('mcu_id', mcuId);

    if (mcuDeleteError) {
      console.error('[permanently-delete-mcu] Failed to hard-delete MCU record:', mcuDeleteError);
      return res.status(500).json({
        error: `Failed to hard-delete MCU: ${mcuDeleteError.message}`
      });
    }

    // Log final status
    console.log(`[permanently-delete-mcu] Permanent deletion complete for MCU ${mcuId}:`);
    console.log(`  - R2 deleted: ${r2DeletedCount}`);
    console.log(`  - R2 failed: ${r2FailedCount}`);
    console.log(`  - Database files hard-deleted: ${dbDeletedCount}`);
    console.log(`  - MCU record hard-deleted: yes`);

    return res.status(200).json({
      success: true,
      message: `Permanently deleted MCU ${mcuId} and ${dbDeletedCount} file(s)`,
      mcuId: mcuId,
      filesDeleted: dbDeletedCount,
      totalFiles: files ? files.length : 0,
      r2DeletedCount: r2DeletedCount,
      r2FailedCount: r2FailedCount,
      r2Enabled: R2_ENABLED
    });

  } catch (error) {
    console.error('[permanently-delete-mcu] Internal error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
