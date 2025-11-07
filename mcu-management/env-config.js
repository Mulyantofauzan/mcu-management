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

// PRODUCTION CONFIGURATION
window.ENV = {
  // Supabase credentials
  SUPABASE_URL: 'https://xqyuktsfjvdqfhulobai.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeXVrdHNmanZkcWZodWxvYmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjkxNzQsImV4cCI6MjA3NjQwNTE3NH0.8_lmNISdJ7AMi0QgAqBoPathoiUeH_WZRDqFaAiRDwY',

  // Google Drive Configuration
  VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID: '1XJ2utC4aWHUdhdqerfRr96E3SSILmntH',
  VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT: 'https://mcu-management.vercel.app/api/uploadToGoogleDrive',

  // Production mode: Disable auto-seeding (prevent dummy data)
  // Set to true ONLY for development/testing
  ENABLE_AUTO_SEED: false
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

console.log();
if (window.ENV.SUPABASE_URL && window.ENV.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  console.log();
} else {
  console.warn();
}
