/**
 * Supabase Configuration
 *
 * This file initializes the Supabase client for production deployment.
 * Replace IndexedDB (Dexie) with Supabase for multi-user support.
 */

// Load Supabase client from CDN (added in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase credentials - Hardcoded for deployment
const SUPABASE_URL = 'https://gbbpzbpfzzsmghciulse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYnB6YnBmenpzbWdoY2l1bHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzgyMTIsImV4cCI6MjA3NjM1NDIxMn0.y-8csC6vjcpEl8D9nKwKfTItoLL8_fY4Q-dRDFHL3GM';

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
