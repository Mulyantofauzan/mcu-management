/**
 * Environment Configuration Module
 *
 * Loads credentials from multiple sources with priority:
 * 1. Production: /api/config endpoint (Vercel env vars injected at runtime)
 * 2. Build-time & Dev: Vite import.meta.env.VITE_* (from .env.production or .env.local)
 * 3. Dev fallback: localStorage for testing
 */

// Initialize configuration object
export const ENV = {
  SUPABASE_URL: null,
  SUPABASE_ANON_KEY: null,
  ENABLE_AUTO_SEED: false
};

/**
 * Load configuration from multiple sources
 */
export async function loadEnvironmentConfig() {
  console.log('[envConfig.js] loadEnvironmentConfig() called');

  // Priority 1: Try API endpoint first (production on Vercel)
  // This loads env vars from Vercel environment variables at runtime
  try {
    console.log('[envConfig.js] Trying /api/config endpoint...');
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const config = await response.json();
      console.log('[envConfig.js] /api/config response:', config);
      if (config.SUPABASE_URL) {
        Object.assign(ENV, {
          SUPABASE_URL: config.SUPABASE_URL,
          SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
          ENABLE_AUTO_SEED: config.ENABLE_AUTO_SEED || false
        });
        console.log('[envConfig.js] Loaded from /api/config');
        return true;
      }
    }
  } catch (error) {
    console.log('[envConfig.js] /api/config not available:', error.message);
    // API endpoint not available (expected in dev without backend)
  }

  // Priority 2: Load from Vite environment variables
  // Vite replaces import.meta.env.VITE_* during build or dev
  // Works for both dev server (.env.local) and production build (.env.production)
  console.log('[envConfig.js] import.meta.env.VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  if (import.meta.env.VITE_SUPABASE_URL) {
    Object.assign(ENV, {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ENABLE_AUTO_SEED: import.meta.env.VITE_ENABLE_AUTO_SEED === 'true'
    });
    console.log('[envConfig.js] Loaded from Vite env vars');
    return true;
  }

  // Priority 3: Development fallback - localStorage
  // Useful for testing without proper env setup
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const devUrl = localStorage.getItem('DEV_SUPABASE_URL');
    const devKey = localStorage.getItem('DEV_SUPABASE_ANON_KEY');
    if (devUrl && devKey) {
      Object.assign(ENV, {
        SUPABASE_URL: devUrl,
        SUPABASE_ANON_KEY: devKey
      });
      return true;
    }
  }
  return false;
}

/**
 * Initialize and set window.ENV for backward compatibility
 */
export async function initializeEnv() {
  console.log('[envConfig.js] initializeEnv() called');
  await loadEnvironmentConfig();
  // Also set on window for legacy code that expects window.ENV
  window.ENV = { ...ENV };
  console.log('[envConfig.js] initializeEnv() completed, window.ENV:', window.ENV);
  return ENV;
}

// Export logging function
export function logEnvStatus() {
  console.log('[envConfig.js] ENV status:', ENV);
}
