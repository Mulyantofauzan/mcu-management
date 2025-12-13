/**
 * Supabase Configuration
 *
 * This file initializes the Supabase client for production deployment.
 * Replace IndexedDB (Dexie) with Supabase for multi-user support.
 */

// Import environment config to ensure credentials are loaded
import { ENV, initializeEnv } from './envConfig.js';

console.log('[supabase.js] Module loading...');

// Initialize env config synchronously (it may already be initialized)
console.log('[supabase.js] Calling initializeEnv()...');
await initializeEnv();
console.log('[supabase.js] initializeEnv() completed');

// Load Supabase client from CDN (added in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase credentials - SECURE: Load from environment variables
// Set in Vercel: Settings → Environment Variables or via /api/config endpoint
const SUPABASE_URL = ENV.SUPABASE_URL || window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || '';
console.log('[supabase.js] SUPABASE_URL:', SUPABASE_URL ? 'loaded' : 'NOT LOADED');
console.log('[supabase.js] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'loaded' : 'NOT LOADED');

// Initialize Supabase client
let supabase = null;
let useSupabase = false;

// Check if credentials are available
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    // Will be initialized asynchronously in initSupabase()
}

// Function to initialize Supabase when CDN script is loaded
async function initSupabase() {
    console.log('[supabase.js] initSupabase() called');
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        console.log('[supabase.js] Credentials available, waiting for window.supabase...');
        // Wait for Supabase library to be available (loaded via CDN)
        let attempts = 0;
        while (typeof window.supabase === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        console.log('[supabase.js] Waited', attempts, 'attempts for window.supabase');

        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            try {
                console.log('[supabase.js] Creating Supabase client...');
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                useSupabase = true;
                console.log('[supabase.js] Supabase client created successfully');
            } catch (error) {
                console.error('[supabase.js] Error creating Supabase client:', error);
            }
        } else {
            console.error('[supabase.js] window.supabase or createClient not available');
            if (typeof window.supabase !== 'undefined') {
                console.log('[supabase.js] window.supabase exists but createClient missing');
            }
        }
    } else {
        console.warn('[supabase.js] No credentials available for Supabase');
    }
}

// Initialize Supabase immediately

// ✅ FIX: Create a promise that can be awaited by init() functions
// This prevents race condition where app tries to use Supabase before it's initialized
console.log('[supabase.js] Setting up supabaseReady promise...');
export const supabaseReady = initSupabase().then(() => {
    console.log('[supabase.js] supabaseReady resolved, useSupabase:', useSupabase);
    if (useSupabase && supabase) {
        console.log('[supabase.js] Supabase is enabled and ready');
    } else {
        console.warn('[supabase.js] Supabase not enabled or client not available');
    }
    return { ready: true, enabled: useSupabase };
}).catch(err => {
    console.error('[supabase.js] supabaseReady error:', err);
    return { ready: true, enabled: false };
});

/**
 * Check if Supabase is available and configured
 */
export function isSupabaseEnabled() {
    return useSupabase && supabase !== null;
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient() {
    if (!isSupabaseEnabled()) {
        throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
    return supabase;
}

/**
 * Test Supabase connection
 */
export async function testConnection() {
    if (!isSupabaseEnabled()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, message: 'Supabase connection successful' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export { supabase };

// Also expose globally for debugging
if (typeof window !== 'undefined') {
    window._supabaseClient = supabase;
}
