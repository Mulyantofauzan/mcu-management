/* Kelola user lewat /api/users (validasi, hash password, dan aturan Admin terakhir ada di server). */
import { selectAll } from './client.js';
import { getAccessToken } from '../lib/session.js';

const COLUMNS = 'user_id, username, display_name, role, active, created_at';

export async function listUsers() {
  const rows = await selectAll('users', query => query.order('created_at', { ascending: false }), COLUMNS);
  return rows.map(row => ({ userId: row.user_id, username: row.username, displayName: row.display_name, role: row.role, active: row.active !== false, createdAt: row.created_at }));
}

async function callUsersApi(payload, fetcher = globalThis.fetch) {
  const token = getAccessToken();
  if (!token) throw new Error('Sesi tidak valid. Silakan login kembali.');
  const response = await fetcher('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) throw new Error(result?.error || 'Permintaan ke server gagal');
  return result.user;
}

export const createUser = ({ username, displayName, role, password }) => callUsersApi({ action: 'create', username: username.trim(), displayName: displayName.trim(), role, password });
export const updateUser = (userId, { username, displayName, role, active, password }) => callUsersApi({ action: 'update', userId, username: username?.trim(), displayName: displayName?.trim(), role, active, password });
export const deleteUser = userId => callUsersApi({ action: 'delete', userId });
