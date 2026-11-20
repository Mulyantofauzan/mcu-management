/* Catatan audit. Hanya aksi CRUD yang dicatat, sama seperti database.logActivity lama. */
import { getClient } from './client.js';

const ALLOWED = ['create', 'update', 'delete', 'restore'];

export async function logActivity({ action, target, targetId, user, details }) {
  if (!ALLOWED.includes(action)) return null;
  const client = await getClient();
  const { error } = await client.from('activity_log').insert([{
    user_id: user?.userId || null,
    user_name: user?.displayName || user?.username || null,
    action,
    target: target || null,
    target_id: targetId || null,
    details: details || null,
    timestamp: new Date().toISOString()
  }]);
  if (error) throw error;
  return true;
}
