/**
 * Delete MCU File API
 * Endpoint: DELETE /api/delete-file
 *
 * Soft deletes a file by setting deletedat timestamp in mcufiles table
 * Does NOT delete from R2 storage (keeps backup)
 */

const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, requireAuth } = require('../auth-utils');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  setCorsHeaders(req, res, 'DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { fileId } = req.query;

    // Validate required parameters
    if (!fileId) {
      return res.status(400).json({
        error: 'Missing required parameter: fileId'
      });
    }
    // Soft delete - set deletedat timestamp
    const { data, error } = await supabase
      .from('mcufiles')
      .update({ deletedat: new Date().toISOString() })
      .eq('fileid', fileId)
      .select();

    if (error) {
      return res.status(500).json({
        error: `Failed to delete file: ${error.message}`
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'File not found'
      });
    }
    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
