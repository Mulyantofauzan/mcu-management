/* Konfigurasi Supabase: endpoint server lebih dulu (produksi), lalu variabel Vite. */
let pending = null;

async function fromServer(fetcher) {
  try {
    const response = await fetcher('/api/config', { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) return null;
    const config = await response.json();
    return config.SUPABASE_URL ? { url: config.SUPABASE_URL, anonKey: config.SUPABASE_ANON_KEY } : null;
  } catch {
    return null;
  }
}

function fromBuildEnv(env) {
  return env.VITE_SUPABASE_URL ? { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY } : null;
}

export function loadConfig({ fetcher = globalThis.fetch, env = import.meta.env } = {}) {
  pending ||= (async () => {
    const config = (await fromServer(fetcher)) || fromBuildEnv(env);
    if (!config?.url || !config?.anonKey) {
      pending = null;
      throw new Error('Konfigurasi database belum diatur (SUPABASE_URL dan SUPABASE_ANON_KEY).');
    }
    return config;
  })();
  return pending;
}
