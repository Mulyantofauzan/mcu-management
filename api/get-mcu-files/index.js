/**
 * Get MCU Files API
 * Endpoint: GET /api/get-mcu-files?mcuId=xxx
 *
 * Retrieves all files associated with an MCU from the mcufiles table
 */

const { setCorsHeaders, requireAuth } = require('../../server/auth-utils');
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
    const supabase = getSupabaseAdmin();
    const { mcuId } = req.query;
    const userId = auth.app_user_id || auth.sub;
    const isAdmin = auth.app_role === 'Admin';

    // Validate required parameters
    if (!mcuId) {
      return res.status(400).json({
        error: 'Missing required parameter: mcuId'
      });
    }
    // Query mcufiles table for this MCU
    let query = supabase
      .from('mcufiles')
      .select('*')
      .eq('mcuid', mcuId)
      .is('deletedat', null);

    if (!isAdmin) {
      query = query.eq('uploadedby', userId);
    }

    const { data, error } = await query.order('uploadedat', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: `Failed to fetch files: ${error.message}`
      });
    }

    console.log(`✅ Found ${data?.length || 0} file(s) for MCU ${mcuId}`);

    return res.status(200).json({
      success: true,
      files: data || [],
      count: data?.length || 0,
      message: `Retrieved ${data?.length || 0} file(s) for MCU`
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
