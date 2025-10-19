/**
 * Environment Configuration
 *
 * TEMPORARY: Hardcoded credentials for testing
 * TODO: Replace with secure environment variable injection
 *
 * INSTRUCTIONS:
 * 1. Replace YOUR_SUPABASE_URL with your actual Supabase URL
 * 2. Replace YOUR_SUPABASE_ANON_KEY with your actual anon key
 * 3. Get these from: Supabase Dashboard → Settings → API
 */

// TEMPORARY HARDCODED CREDENTIALS
// Replace these values with your actual Supabase credentials
window.ENV = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};

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

console.log('📦 env-config.js loaded');
if (window.ENV.SUPABASE_URL && window.ENV.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  console.log('✅ Supabase credentials configured');
} else {
  console.warn('⚠️ Please replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY in env-config.js');
}
