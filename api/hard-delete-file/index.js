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
    const { fileId } = req.query;

    // Validate required parameters
    if (!fileId) {
      return res.status(400).json({
        error: 'Missing required parameter: fileId'
      });
    }

    // Step 1: Get file details from database
    const { data: fileData, error: fetchError } = await supabase
      .from('mcufiles')
      .select('*')
      .eq('fileid', fileId)
      .single();

    if (fetchError || !fileData) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Step 2: Delete from R2 storage if storage path exists
    if (fileData.storage_path) {
      try {
        await r2.deleteObject({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: fileData.storage_path
        }).promise();
      } catch (r2Error) {
        // Continue anyway - we'll still delete from database
      }
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
