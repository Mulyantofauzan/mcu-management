/**
 * Supabase Configuration
 *
 * This file initializes the Supabase client for production deployment.
 * Replace IndexedDB (Dexie) with Supabase for multi-user support.
 */

// Import environment config to ensure credentials are loaded
import { ENV, initializeEnv } from './envConfig.js';

// Initialize env config synchronously (it may already be initialized)
await initializeEnv();

// Load Supabase client from CDN (added in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase credentials - SECURE: Load from environment variables
// Set in Vercel: Settings → Environment Variables or via /api/config endpoint
const SUPABASE_URL = ENV.SUPABASE_URL || window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
}

// Initialize Supabase client
let supabase = null;
let useSupabase = false;

// Function to initialize Supabase when CDN script is loaded
async function initSupabase() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        // Wait for Supabase library to be available (loaded via CDN)
        let attempts = 0;
        while (typeof window.supabase === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            try {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                useSupabase = true;
                console.log('   Client available as: supabase object (imported)');
            } catch (error) {
            }
        } else {
            if (typeof window.supabase !== 'undefined') {
                console.log('   window.supabase keys:', Object.keys(window.supabase || {}).slice(0, 5));
            }
        }
    }
}

// Initialize Supabase immediately
console.log('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set (hidden)' : '❌ Not set');

// ✅ FIX: Create a promise that can be awaited by init() functions
// This prevents race condition where app tries to use Supabase before it's initialized
export const supabaseReady = initSupabase().then(() => {
    if (useSupabase && supabase) {
    } else {
        console.log('📦 Using IndexedDB (Supabase not configured)');
    }
    return { ready: true, enabled: useSupabase };
}).catch(err => {
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
