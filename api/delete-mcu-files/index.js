/**
 * Delete MCU Files API
 * Endpoint: DELETE /api/delete-mcu-files?mcuId=XXX
 *
 * Soft deletes all files associated with an MCU by setting deleted_at timestamp.
 * Files can be restored later as part of MCU/Employee restoration.
 *
 * NOTE: This soft-deletes files (NOT hard-delete) so they can be restored.
 * Permanent deletion happens when user permanently deletes from "Data Terhapus".
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
          // Soft delete in database (set deleted_at timestamp for restoration later)
          // NOTE: R2 files are NOT deleted here - they're only deleted on permanent delete
          const { error: deleteError } = await supabase
            .from('mcufiles')
            .update({ deletedat: now })
            .eq('fileid', file.fileid);

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
    console.log(`[delete-mcu-files] Soft deletion complete for MCU ${mcuId}:`);
    console.log(`  - Database soft-deleted: ${dbDeletedCount}`);
    console.log(`  - R2 files preserved for later restoration`);

    return res.status(200).json({
      success: true,
      message: `Soft deleted ${dbDeletedCount} file(s) for MCU ${mcuId}. Files in R2 preserved.`,
      deletedCount: dbDeletedCount,
      totalFiles: files ? files.length : 0,
      r2Preserved: true
    });

  } catch (error) {
    console.error('[delete-mcu-files] Internal error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
