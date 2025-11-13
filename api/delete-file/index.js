/**
 * Delete MCU File API
 * Endpoint: DELETE /api/delete-file
 *
 * Soft deletes a file by setting deletedat timestamp in mcufiles table
 * Does NOT delete from R2 storage (keeps backup)
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    console.log(`🗑️  Deleting file: ${fileId}`);

    // Soft delete - set deletedat timestamp
    const { data, error } = await supabase
      .from('mcufiles')
      .update({ deletedat: new Date().toISOString() })
      .eq('fileid', fileId)
      .select();

    if (error) {
      console.error('❌ Database error:', error.message);
      return res.status(500).json({
        error: `Failed to delete file: ${error.message}`
      });
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️  File not found: ${fileId}`);
      return res.status(404).json({
        error: 'File not found'
      });
    }

    console.log(`✅ File deleted: ${fileId}`);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('❌ Unhandled error:', error.message);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
