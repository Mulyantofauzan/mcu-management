/* Klien Supabase tunggal. Token sesi dikirim sebagai Authorization; 401 mengakhiri sesi. */
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from './config.js';
import { getAccessToken, clearSession } from '../lib/session.js';

let clientPromise = null;

async function sessionAwareFetch(input, init) {
  const response = await fetch(input, init);
  if (response.status === 401 && getAccessToken()) {
    clearSession();
    location.assign('/login');
  }
  return response;
}

export function getClient() {
  clientPromise ||= loadConfig().then(({ url, anonKey }) => {
    const token = getAccessToken();
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: sessionAwareFetch, headers: token ? { Authorization: `Bearer ${token}` } : {} }
    });
  }).catch(error => {
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}

export function resetClient() {
  clientPromise = null;
}

export async function selectAll(table, build = query => query) {
  const client = await getClient();
  const { data, error } = await build(client.from(table).select('*'));
  if (error) throw error;
  return data || [];
}
