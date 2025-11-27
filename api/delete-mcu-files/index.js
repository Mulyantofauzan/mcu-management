/**
 * Delete MCU Files API
 * Endpoint: DELETE /api/delete-mcu-files?mcuId=XXX
 *
 * Soft deletes all files associated with an MCU by setting deleted_at timestamp
 * Queries mcufiles table for files linked to the MCU, then soft deletes each
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
    const { mcuId } = req.query;

    // Validate required parameters
    if (!mcuId) {
      return res.status(400).json({
        error: 'Missing required parameter: mcuId'
      });
    }

    // Step 1: Get all files associated with this MCU
    const { data: files, error: queryError } = await supabase
      .from('mcufiles')
      .select('fileid')
      .eq('mcuid', mcuId)
      .is('deletedat', null); // Only get non-deleted files

    if (queryError) {
      console.error('[delete-mcu-files] Query error:', queryError);
      return res.status(500).json({
        error: `Failed to query files: ${queryError.message}`
      });
    }

    // Step 2: Soft delete each file
    let deletedCount = 0;
    const now = new Date().toISOString();

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const { error: deleteError } = await supabase
            .from('mcufiles')
            .update({ deletedat: now })
            .eq('fileid', file.fileid)
            .select();

          if (!deleteError) {
            deletedCount++;
          } else {
            console.warn(`[delete-mcu-files] Failed to delete file ${file.fileid}:`, deleteError.message);
          }
        } catch (err) {
          console.warn(`[delete-mcu-files] Exception deleting file ${file.fileid}:`, err.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} file(s) for MCU ${mcuId}`,
      deletedCount: deletedCount,
      totalFiles: files ? files.length : 0
    });

  } catch (error) {
    console.error('[delete-mcu-files] Internal error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
