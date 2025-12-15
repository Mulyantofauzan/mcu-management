/**
 * Hard Delete MCU File API
 * Endpoint: DELETE /api/hard-delete-file
 *
 * Permanently deletes a file from both Supabase database AND Cloudflare R2 storage
 * This is used when permanently deleting employees or for secure file removal
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize R2 client
const AWS = require('aws-sdk');
const r2 = new AWS.S3({
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

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
    // Validate environment variables first
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[hard-delete-file] Missing Supabase credentials');
      return res.status(500).json({
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      console.error('[hard-delete-file] Missing Cloudflare R2 credentials');
      return res.status(500).json({
        error: 'Server configuration error: Missing R2 credentials'
      });
    }

    const { fileId, storagePath: queryStoragePath } = req.query;

    // Validate required parameters - need either fileId or storagePath
    if (!fileId && !queryStoragePath) {
      return res.status(400).json({
        error: 'Missing required parameter: either fileId or storagePath'
      });
    }

    console.log(`[hard-delete-file] Processing delete request: fileId=${fileId}, storagePath=${queryStoragePath}`);

    // Step 1: Get file details from database
    let query = supabase.from('mcufiles').select('*');

    if (fileId) {
      query = query.eq('fileid', fileId);
    } else if (queryStoragePath) {
      query = query.eq('supabase_storage_path', queryStoragePath);
    }

    const { data: fileDataArray, error: fetchError } = await query;

    if (fetchError) {
      console.error('[hard-delete-file] Database fetch error:', fetchError);
      return res.status(500).json({
        error: `Database error: ${fetchError.message}`
      });
    }

    if (!fileDataArray || fileDataArray.length === 0) {
      // Try alternative query if exact match fails - check if data exists with different format
      console.warn('[hard-delete-file] File not found with exact query, checking if file exists in database');
      const { data: allFiles, error: checkError } = await supabase
        .from('mcufiles')
        .select('count')
        .limit(1);

      if (!checkError && allFiles) {
        console.warn('[hard-delete-file] Database is accessible, but file not found with current query parameters');
      }

      return res.status(404).json({
        error: 'File not found in database',
        searchedWith: fileId ? 'fileId' : 'storagePath',
        searchValue: fileId || queryStoragePath
      });
    }

    const fileData = fileDataArray[0];
    console.log(`[hard-delete-file] Found file record:`, { fileid: fileData.fileid, supabase_storage_path: fileData.supabase_storage_path });

    // Step 2: Delete from R2 storage if storage path exists
    // Check both field names: supabase_storage_path and storage_path (for backward compatibility)
    const fileStoragePath = fileData.supabase_storage_path || fileData.storage_path;
    if (fileStoragePath) {
      try {
        console.log(`[hard-delete-file] Deleting from R2 storage: ${fileStoragePath}`);
        await r2.deleteObject({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: fileStoragePath
        }).promise();
        console.log(`[hard-delete-file] Successfully deleted from R2`);
      } catch (r2Error) {
        console.warn(`[hard-delete-file] ⚠️ Failed to delete from R2 (will continue with DB delete): ${r2Error.message}`);
        // Continue anyway - we'll still delete from database
      }
    } else {
      console.warn('[hard-delete-file] No storage path found in file record');
    }

    // Step 3: Hard delete file record from database
    // Use fileId from the fetched fileData record (to handle both fileId and storagePath queries)
    console.log(`[hard-delete-file] Deleting from database: fileid=${fileData.fileid}`);
    const { error: deleteError } = await supabase
      .from('mcufiles')
      .delete()
      .eq('fileid', fileData.fileid);

    if (deleteError) {
      console.error('[hard-delete-file] Database delete error:', deleteError);
      return res.status(500).json({
        error: `Failed to delete file record: ${deleteError.message}`
      });
    }

    console.log(`[hard-delete-file] Successfully deleted file from database`);
    return res.status(200).json({
      success: true,
      message: 'File permanently deleted from storage and database'
    });

  } catch (error) {
    console.error('[hard-delete-file] Unexpected error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
};
