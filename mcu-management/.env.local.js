/**
 * Development environment variables loaded at runtime
 * This file is injected by the local development server
 * to provide .env.local values to the browser
 */

// These values come from .env.local
window.__ENV_LOADED__ = true;
window.ENV = window.ENV || {};

// Google Drive Configuration
window.ENV.VITE_GOOGLE_CLIENT_ID = '1071964406669-uiq36p5c0m6hq9kufouiiu4q4g6ashnp.apps.googleusercontent.com';
window.ENV.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID = '1_m-UR1_SrEswZ3tJcGDVy5xRdqFJTFMr';
window.ENV.VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT = '/api/uploadToGoogleDrive';

// Supabase Configuration
window.ENV.VITE_SUPABASE_URL = 'https://ygvhixktmnmgqmqfmtlr.supabase.co';
window.ENV.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndmhpeGt0bW5tZ3FtcWZtdGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3OTE5NjIsImV4cCI6MTc0NjM0Mzk2Mn0.1qV_P_nD4eGoKO-I3JFiNGBd_HLNdFdbXwJ5mNK5rrE';

console.log('✅ Development environment variables loaded from .env.local.js');
