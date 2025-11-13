/**
 * Download File API Endpoint
 * Endpoint: GET /api/download-file
 *
 * Generates signed URL for downloading files from private R2 bucket
 * Includes authorization checks - only file owner can download
 *
 * Query Parameters:
 * - fileId: File ID to download
 * - userId: User ID requesting download (from auth)
 * - mcuId: (optional) MCU ID - returns all files for that MCU
 */

const { getAuthorizedSignedUrl, getAuthorizedMcuFiles } = require('../r2SignedUrlService');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, mcuId, userId } = req.query;

    console.log(`\n📥 Download request received`);
    console.log(`   File ID: ${fileId || 'N/A'}`);
    console.log(`   MCU ID: ${mcuId || 'N/A'}`);
    console.log(`   User ID: ${userId || 'N/A'}`);

    // Require user ID for authorization
    if (!userId) {
      console.log('⚠️ Unauthorized: No user ID provided');
      return res.status(401).json({
        error: 'Unauthorized: User ID required',
        success: false
      });
    }

    // Case 1: Get single file
    if (fileId) {
      console.log(`\n🔓 Generating signed URL for single file`);
      const result = await getAuthorizedSignedUrl(fileId, userId);

      if (!result.success) {
        return res.status(403).json(result);
      }

      console.log(`✅ Signed URL generated`);
      return res.status(200).json(result);
    }

    // Case 2: Get all files for MCU
    if (mcuId) {
      console.log(`\n📦 Getting all signed URLs for MCU`);
      const result = await getAuthorizedMcuFiles(mcuId, userId);

      if (!result.success) {
        return res.status(403).json(result);
      }

      console.log(`✅ ${result.count} signed URL(s) generated`);
      return res.status(200).json(result);
    }

    // No file or MCU ID provided
    console.log('⚠️ Missing parameters: fileId or mcuId required');
    return res.status(400).json({
      error: 'Either fileId or mcuId is required',
      success: false
    });
  } catch (error) {
    console.error('❌ Unhandled error:', error.message);
    console.error('   Stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};
