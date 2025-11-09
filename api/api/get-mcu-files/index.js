/**
 * Get MCU Files API
 * Endpoint: GET /api/get-mcu-files?mcuId=xxx
 *
 * Retrieves all files associated with an MCU from the mcufiles table
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    console.log(`📂 Fetching files for MCU: ${mcuId}`);

    // Query mcufiles table for this MCU
    const { data, error } = await supabase
      .from('mcufiles')
      .select('*')
      .eq('mcuid', mcuId)
      .is('deletedat', null)
      .order('uploadedat', { ascending: false });

    if (error) {
      console.error('❌ Database query error:', error.message);
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
    console.error('❌ Unhandled error:', error.message);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};
