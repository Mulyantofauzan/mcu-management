/* Log aktivitas dengan filter dan halaman di sisi server (ActivityLog.getFiltered lama). */
import { getClient } from './client.js';
import { transformActivity } from './transform.js';
import { dayStartIso, dayEndIso } from '../lib/dates.js';

export function applyFilters(query, filters = {}) {
  let next = query;
  if (filters.action) next = next.eq('action', filters.action);
  if (filters.target) next = next.eq('target', filters.target);
  if (filters.userName) next = next.ilike('user_name', `%${filters.userName}%`);
  if (filters.fromDate) next = next.gte('timestamp', dayStartIso(filters.fromDate));
  if (filters.toDate) next = next.lte('timestamp', dayEndIso(filters.toDate));
  return next;
}

export async function getActivities(filters, page = 1, limit = 20) {
  const client = await getClient();
  const { data, error, count } = await applyFilters(client.from('activity_log').select('*', { count: 'exact' }), filters)
    .order('timestamp', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) throw error;
  const total = count || 0;
  return { data: (data || []).map(transformActivity), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAllActivities(filters, pageSize = 100) {
  const first = await getActivities(filters, 1, pageSize);
  let all = [...first.data];
  for (let page = 2; page <= first.totalPages; page++) {
    all = all.concat((await getActivities(filters, page, pageSize)).data);
  }
  return all;
}
