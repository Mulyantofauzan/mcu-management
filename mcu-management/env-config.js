/**
 * Environment Configuration
 *
 * SECURITY: This file loads environment variables safely.
 *
 * For Netlify deployment:
 * 1. Go to: Site settings → Environment variables
 * 2. Add variables:
 *    - SUPABASE_URL = your_supabase_project_url
 *    - SUPABASE_ANON_KEY = your_supabase_anon_key
 * 3. Netlify will inject these at build time
 *
 * For local development:
 * Set in .env file (NOT committed to git):
 *   VITE_SUPABASE_URL=your_url
 *   VITE_SUPABASE_ANON_KEY=your_key
 */

// Initialize with empty values (will be replaced by Netlify)
window.ENV = window.ENV || {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

// Netlify will replace %%ENV%% placeholders during build
// This happens via Netlify's environment variable injection
if (typeof NETLIFY_ENV !== 'undefined') {
  window.ENV = NETLIFY_ENV;
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
