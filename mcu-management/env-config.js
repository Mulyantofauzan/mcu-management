/**
 * Environment Configuration
 *
 * SECURITY: This file loads environment variables safely.
 *
 * For Netlify deployment:
 * 1. Go to: Site settings → Build & deploy → Environment
 * 2. Add variables:
 *    - SUPABASE_URL = your_supabase_project_url
 *    - SUPABASE_ANON_KEY = your_supabase_anon_key
 * 3. Add build command that generates this file (see netlify.toml)
 *
 * For local development:
 * Set in localStorage (see below)
 */

// Try to load from Netlify's generated env file (if exists)
// This will be generated during build by generate-env.js
window.ENV = window.ENV || {};

// Check if we have pre-generated env (from build script)
if (typeof __NETLIFY_ENV__ !== 'undefined') {
  window.ENV = __NETLIFY_ENV__;
}

// Development fallback: Check localStorage for testing (NEVER use in production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  const devUrl = localStorage.getItem('DEV_SUPABASE_URL');
  const devKey = localStorage.getItem('DEV_SUPABASE_ANON_KEY');

  if (devUrl && devKey) {
    console.log('🔧 Using development credentials from localStorage');
    window.ENV.SUPABASE_URL = devUrl;
    window.ENV.SUPABASE_ANON_KEY = devKey;
  }
}
