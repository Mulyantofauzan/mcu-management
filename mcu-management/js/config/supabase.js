/**
 * Supabase Configuration
 *
 * This file initializes the Supabase client for production deployment.
 * Replace IndexedDB (Dexie) with Supabase for multi-user support.
 */

// Load Supabase client from CDN (added in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Environment variables (set in Netlify dashboard)
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials not found. Using IndexedDB fallback.');
}

// Initialize Supabase client
let supabase = null;
let useSupabase = false;

if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof window.supabase !== 'undefined') {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useSupabase = true;
        console.log('✅ Supabase client initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        console.log('📦 Falling back to IndexedDB');
    }
}

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
