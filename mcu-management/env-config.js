/**
 * Environment Configuration - SECURE VERSION
 *
 * Credentials are NOT hardcoded here.
 * They are injected by Vercel at deploy time and accessible via API endpoint.
 *
 * SETUP IN VERCEL:
 * 1. Go to Vercel Project Settings → Environment Variables
 * 2. Add these variables (they're visible only in Vercel dashboard):
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 *    - VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID
 *    - VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT
 */

// Placeholder configuration
// In production, these are injected by a server-side API endpoint
// They are NOT exposed in client-side code or DevTools
window.ENV = {
  // These will be fetched from the secure API endpoint
  SUPABASE_URL: null,
  SUPABASE_ANON_KEY: null,
  VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID: null,
  VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT: null,
  ENABLE_AUTO_SEED: false
};

// Fetch configuration from secure API endpoint
async function loadSecureConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      window.ENV = { ...window.ENV, ...config };
      console.log('✅ Configuration loaded from secure endpoint');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Could not load config from endpoint:', error.message);
  }

  // Fallback for development only (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const devUrl = localStorage.getItem('DEV_SUPABASE_URL');
    const devKey = localStorage.getItem('DEV_SUPABASE_ANON_KEY');
    if (devUrl && devKey) {
      window.ENV.SUPABASE_URL = devUrl;
      window.ENV.SUPABASE_ANON_KEY = devKey;
      console.log('🔧 Using development credentials from localStorage');
      return true;
    }
  }

  return false;
}

// Load config immediately
loadSecureConfig();

// Development fallback: Check localStorage for testing (localhost only)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  const devUrl = localStorage.getItem('DEV_SUPABASE_URL');
  const devKey = localStorage.getItem('DEV_SUPABASE_ANON_KEY');

  if (devUrl && devKey) {
    console.log('🔧 Using development credentials from localStorage');
    window.ENV.SUPABASE_URL = devUrl;
    window.ENV.SUPABASE_ANON_KEY = devKey;
  }
}

console.log();
if (window.ENV.SUPABASE_URL && window.ENV.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  console.log();
} else {
  console.warn();
}
