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
  // Priority 1: Try API endpoint first (production on Vercel)
  // This loads env vars from Vercel environment variables at runtime
  try {
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const config = await response.json();
      if (config.SUPABASE_URL) {
        Object.assign(ENV, {
          SUPABASE_URL: config.SUPABASE_URL,
          SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
          ENABLE_AUTO_SEED: config.ENABLE_AUTO_SEED || false
        });
        return true;
      }
    }
  } catch (error) {
    // API endpoint not available (expected in dev without backend)
  }

  // Priority 2: Load from Vite environment variables
  // Vite replaces import.meta.env.VITE_* during build or dev
  // Works for both dev server (.env.local) and production build (.env.production)
  if (import.meta.env.VITE_SUPABASE_URL) {
    Object.assign(ENV, {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ENABLE_AUTO_SEED: import.meta.env.VITE_ENABLE_AUTO_SEED === 'true'
    });
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
  await loadEnvironmentConfig();
  // Also set on window for legacy code that expects window.ENV
  window.ENV = { ...ENV };
  return ENV;
}

// Export logging function
export function logEnvStatus() {
}
