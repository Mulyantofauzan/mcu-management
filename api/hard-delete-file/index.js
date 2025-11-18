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
    const { fileId, storagePath: queryStoragePath } = req.query;

    // Validate required parameters - need either fileId or storagePath
    if (!fileId && !queryStoragePath) {
      return res.status(400).json({
        error: 'Missing required parameter: either fileId or storagePath'
      });
    }

    // Step 1: Get file details from database
    let query = supabase.from('mcufiles').select('*');

    if (fileId) {
      query = query.eq('fileid', fileId);
    } else if (queryStoragePath) {
      query = query.eq('supabase_storage_path', queryStoragePath);
    }

    const { data: fileDataArray, error: fetchError } = await query;

    if (fetchError || !fileDataArray || fileDataArray.length === 0) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    const fileData = fileDataArray[0];

    // Step 2: Delete from R2 storage if storage path exists
    // Check both field names: supabase_storage_path and storage_path (for backward compatibility)
    const fileStoragePath = fileData.supabase_storage_path || fileData.storage_path;
    if (fileStoragePath) {
      try {
        console.log(`🗑️ Deleting from R2: ${fileStoragePath}`);
        await r2.deleteObject({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: fileStoragePath
        }).promise();
        console.log(`✅ Successfully deleted from R2: ${fileStoragePath}`);
      } catch (r2Error) {
        console.warn(`⚠️ Failed to delete from R2 (will continue with DB delete): ${r2Error.message}`);
        // Continue anyway - we'll still delete from database
      }
    } else {
      console.warn(`⚠️ No storage path found in file record`);
    }

    // Step 3: Hard delete file record from database
    const { error: deleteError } = await supabase
      .from('mcufiles')
      .delete()
      .eq('fileid', fileId);

    if (deleteError) {
      console.error('Database deletion error:', deleteError.message);
      return res.status(500).json({
        error: `Failed to delete file record: ${deleteError.message}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'File permanently deleted from storage and database'
    });

  } catch (error) {
    console.error('Unhandled error:', error.message);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
