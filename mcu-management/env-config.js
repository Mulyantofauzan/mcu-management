/**
 * Environment Configuration
 *
 * Loads credentials from multiple sources with priority:
 * 1. Production: /api/config endpoint (Vercel env vars injected at runtime)
 * 2. Build-time: Vite embeds VITE_* vars from .env.production
 * 3. Dev fallback: localStorage or .env.local (via Vite dev server)
 */

// Initialize window.ENV object
window.ENV = {
  SUPABASE_URL: null,
  SUPABASE_ANON_KEY: null,
  VITE_GOOGLE_CLIENT_ID: null,
  VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID: null,
  VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT: null,
  ENABLE_AUTO_SEED: false
};

/**
 * Load configuration from multiple sources
 */
async function loadConfig() {
  // Priority 1: Try API endpoint first (production)
  // This loads env vars from Vercel at runtime
  try {
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const config = await response.json();
      if (config.SUPABASE_URL) {
        window.ENV = { ...window.ENV, ...config };
        console.log('✅ Configuration loaded from /api/config endpoint');
        return true;
      }
    }
  } catch (error) {
    // API endpoint not available (expected in dev without backend)
    console.debug('API endpoint not available, trying alternatives...');
  }

  // Priority 2: Check for Vite-injected globals (from .env.production build)
  // Vite replaces import.meta.env.VITE_* with actual values during build
  // Check if values were injected into window during build
  if (window.__VITE_SUPABASE_URL__) {
    window.ENV.SUPABASE_URL = window.__VITE_SUPABASE_URL__;
    window.ENV.SUPABASE_ANON_KEY = window.__VITE_SUPABASE_ANON_KEY__;
    window.ENV.VITE_GOOGLE_CLIENT_ID = window.__VITE_GOOGLE_CLIENT_ID__;
    window.ENV.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID = window.__VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID__;
    window.ENV.VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT = window.__VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT__;
    console.log('✅ Configuration loaded from build-time globals');
    return true;
  }

  // Priority 3: Development - try to load from injected runtime env variables
  // For static file serving, we load from script variables if available
  if (window.__ENV_LOADED__) {
    // Already loaded from external config, use what's in window.ENV
    if (window.ENV.SUPABASE_URL || window.ENV.VITE_GOOGLE_CLIENT_ID) {
      console.log('✅ Configuration loaded from runtime injection');
      return true;
    }
  }

  // Priority 4: Development fallback - localStorage
  // Useful for local development when Vite dev server is running
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const devUrl = localStorage.getItem('DEV_SUPABASE_URL');
    const devKey = localStorage.getItem('DEV_SUPABASE_ANON_KEY');
    const devClientId = localStorage.getItem('DEV_GOOGLE_CLIENT_ID');
    const devRootFolderId = localStorage.getItem('DEV_GOOGLE_DRIVE_ROOT_FOLDER_ID');
    const devUploadEndpoint = localStorage.getItem('DEV_GOOGLE_DRIVE_UPLOAD_ENDPOINT');

    if (devUrl && devKey) {
      window.ENV.SUPABASE_URL = devUrl;
      window.ENV.SUPABASE_ANON_KEY = devKey;
    }
    if (devClientId) {
      window.ENV.VITE_GOOGLE_CLIENT_ID = devClientId;
    }
    if (devRootFolderId) {
      window.ENV.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID = devRootFolderId;
    }
    if (devUploadEndpoint) {
      window.ENV.VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT = devUploadEndpoint;
    }

    if (devUrl && devKey) {
      console.log('🔧 Using development credentials from localStorage');
      return true;
    }
  }

  return false;
}

// Load configuration immediately
loadConfig();

// Debug: Log loaded configuration
console.log('═══════════════════════════════════════');
console.log('📋 Environment Configuration Loaded');
console.log('═══════════════════════════════════════');
console.log('SUPABASE_URL:', window.ENV.SUPABASE_URL ? '✓ Loaded' : '✗ Missing');
console.log('VITE_GOOGLE_CLIENT_ID:', window.ENV.VITE_GOOGLE_CLIENT_ID ? '✓ Loaded' : '✗ Missing');
console.log('VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID:', window.ENV.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID ? '✓ Loaded' : '✗ Missing');
console.log('═══════════════════════════════════════');
