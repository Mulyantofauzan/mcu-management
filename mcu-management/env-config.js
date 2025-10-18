// Environment configuration for Netlify deployment
// Load from Netlify environment variables via build plugin

window.ENV = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

// Try to load from Netlify injected script tag (if exists)
if (typeof NETLIFY_ENV !== 'undefined') {
  window.ENV = NETLIFY_ENV;
}
