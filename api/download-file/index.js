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

const { getAuthorizedSignedUrl, getAuthorizedMcuFiles } = require('../../server/r2SignedUrlService');
const { setCorsHeaders, requireAuth } = require('../../server/auth-utils');
const { loadActiveUser } = require('../../server/workflow/authorization');
const { getSupabaseAdmin } = require('../../server/supabaseAdmin');

module.exports = async (req, res) => {
  setCorsHeaders(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { fileId, mcuId, userId } = req.query;
    const activeUser = await loadActiveUser(auth, getSupabaseAdmin());
    const authenticatedUserId = activeUser.userId;

    if (userId && userId !== authenticatedUserId) {
      return res.status(403).json({
        error: 'Forbidden: user mismatch',
        success: false
      });
    }

    // Case 1: Get single file
    if (fileId) {
      const result = await getAuthorizedSignedUrl(fileId, activeUser);

      if (!result.success) {
        return res.status(403).json(result);
      }
      return res.status(200).json(result);
    }

    // Case 2: Get all files for MCU
    if (mcuId) {
      const result = await getAuthorizedMcuFiles(mcuId, activeUser);

      if (!result.success) {
        return res.status(403).json(result);
      }

      console.log(`✅ ${result.count} signed URL(s) generated`);
      return res.status(200).json(result);
    }

    // No file or MCU ID provided
    return res.status(400).json({
      error: 'Either fileId or mcuId is required',
      success: false
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};
