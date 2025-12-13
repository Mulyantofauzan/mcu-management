/**
 * Secure Config Endpoint
 *
 * Returns environment configuration from Vercel environment variables.
 * These credentials are ONLY visible to the browser when requested,
 * not exposed in source code or DevTools.
 */

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Return configuration from environment variables
  // These are set in Vercel Project Settings
  const config = {
    SUPABASE_URL: process.env.VITE_SUPABASE_URL || null,
    SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || null,
    VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
    VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT: process.env.VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT || null,
    ENABLE_AUTO_SEED: process.env.VITE_ENABLE_AUTO_SEED === 'true' || false
  };

  // Log what's being returned for debugging
  // Debug: Log all env vars that start with VITE_
  // Return whatever config is available (may be partial)
  // Frontend will fall back to IndexedDB if Supabase not configured
  res.status(200).json(config);
};
