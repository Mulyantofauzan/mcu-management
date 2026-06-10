const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin = null;

function getSupabaseAdminConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

function hasSupabaseAdminConfig() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  return Boolean(url && serviceRoleKey);
}

function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are not configured');
  }

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdmin;
}

module.exports = {
  getSupabaseAdmin,
  hasSupabaseAdminConfig
};
