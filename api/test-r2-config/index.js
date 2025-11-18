/**
 * Diagnostic endpoint untuk test R2 configuration
 */

module.exports = async (req, res) => {
  try {
    // Check environment variables
    const envVars = {
      'CLOUDFLARE_R2_ENDPOINT': process.env.CLOUDFLARE_R2_ENDPOINT,
      'CLOUDFLARE_R2_ACCESS_KEY_ID': process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY': process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      'CLOUDFLARE_R2_BUCKET_NAME': process.env.CLOUDFLARE_R2_BUCKET_NAME,
      'CLOUDFLARE_ACCOUNT_ID': process.env.CLOUDFLARE_ACCOUNT_ID,
      'SUPABASE_URL': process.env.SUPABASE_URL,
      'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    const status = {};
    for (const [key, value] of Object.entries(envVars)) {
      const isSet = !!value;
      const display = isSet ? `✅ SET (first 20 chars)` : '❌ MISSING';
      status[key] = isSet;
    }

    // Try to load r2StorageService
    try {
      const { uploadFileToStorage, MAX_FILE_SIZE, STORAGE_BUCKET } = require('../r2StorageService');
    } catch (error) {
    }

    // Return status
    return res.status(200).json({
      status: 'Diagnostic Complete',
      environmentVariables: status,
      timestamp: new Date().toISOString(),
      message: 'Check Vercel logs for detailed output'
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
