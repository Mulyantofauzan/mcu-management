const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin = null;

function normalizeEnvValue(value) {
  if (!value) return '';

  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getValidSupabaseUrl() {
  const candidates = [
    normalizeEnvValue(process.env.VITE_SUPABASE_URL),
    normalizeEnvValue(process.env.SUPABASE_URL)
  ];

  return candidates.find((candidate) => {
    try {
      const url = new URL(candidate);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch (error) {
      return false;
    }
  }) || '';
}

function getSupabaseAdminConfig() {
  return {
    url: getValidSupabaseUrl(),
    serviceRoleKey: normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
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
