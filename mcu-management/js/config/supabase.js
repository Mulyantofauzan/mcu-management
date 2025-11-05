/**
 * Supabase Configuration
 *
 * This file initializes the Supabase client for production deployment.
 * Replace IndexedDB (Dexie) with Supabase for multi-user support.
 */

// Load Supabase client from CDN (added in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase credentials - SECURE: Load from environment variables
// Set in Netlify: Settings → Environment variables → SUPABASE_URL and SUPABASE_ANON_KEY
const SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials not found. Using IndexedDB fallback.');
    console.warn('To use Supabase: Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables');
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

        if (typeof window.supabase !== 'undefined') {
            try {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                useSupabase = true;
                console.log('✅ Supabase client initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Supabase:', error);
                console.log('📦 Falling back to IndexedDB');
            }
        } else {
            console.warn('⚠️ Supabase library failed to load from CDN');
            console.log('📦 Falling back to IndexedDB');
        }
    }
}

// Initialize Supabase immediately
console.log('🔍 Supabase initialization starting...');
console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set (hidden)' : '❌ Not set');

// ✅ FIX: Create a promise that can be awaited by init() functions
// This prevents race condition where app tries to use Supabase before it's initialized
export const supabaseReady = initSupabase().then(() => {
    console.log('✅ Supabase initialization complete');
    if (useSupabase && supabase) {
        console.log('✅ Supabase client is ready and enabled');
    } else {
        console.log('📦 Using IndexedDB (Supabase not configured)');
    }
    return { ready: true, enabled: useSupabase };
}).catch(err => {
    console.error('❌ Supabase initialization failed:', err);
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
