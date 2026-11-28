/* Klien Supabase tunggal. Token sesi dikirim sebagai Authorization; 401 mengakhiri sesi. */
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from './config.js';
import { getAccessToken, clearSession } from '../lib/session.js';

let clientPromise = null;

function endSession() {
  clearSession();
  if (typeof location !== 'undefined' && location.pathname !== '/login') location.assign('/login');
}

/* Token dibaca per permintaan, bukan dibekukan saat klien dibuat: setelah logout atau ganti akun
   tanpa muat ulang halaman, permintaan tidak boleh membawa JWT pengguna sebelumnya.
   Klien ini hanya dipakai setelah login. Tanpa token yang masih berlaku (kedaluwarsa atau sudah
   keluar), sesi berakhir dan pengguna dikembalikan ke halaman masuk, bukan menampilkan "JWT expired". */
export async function sessionAwareFetch(input, init = {}) {
  const token = getAccessToken();
  if (!token) {
    endSession();
    return new Response(JSON.stringify({ message: 'Sesi berakhir. Silakan masuk lagi.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) endSession();
  return response;
}

export function getClient() {
  clientPromise ||= loadConfig().then(({ url, anonKey }) => {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: sessionAwareFetch }
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

export async function selectAll(table, build = query => query, columns = '*') {
  const client = await getClient();
  const { data, error } = await build(client.from(table).select(columns));
  if (error) throw error;
  return data || [];
}
