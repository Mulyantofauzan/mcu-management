/* Memuat semua data Dashboard. Hanya model analitik yang wajib; sisanya boleh gagal tanpa menjatuhkan halaman. */
import { getCurrentModels, getExpiryOverview } from '../../data/analytics.js';
import { getDepartments, getRecentActivity, getMedicalHistories, getMcuOwners } from '../../data/reference.js';
import { groupHistories } from './stats/jakartaCounts.js';

const soft = (promise, fallback) => promise.catch(() => fallback);

export async function loadDashboardData() {
  const [models, departments, histories, expiry, activities] = await Promise.all([
    getCurrentModels(),
    soft(getDepartments(), []),
    soft(getMedicalHistories(), []),
    soft(getExpiryOverview(), []),
    soft(getRecentActivity(5), [])
  ]);
  const owners = await soft(getMcuOwners(activities.filter(a => a.target === 'MCU').map(a => a.targetId)), new Map());
  return { models, departments, historiesByMcu: groupHistories(histories), expiry, activities, owners };
}
