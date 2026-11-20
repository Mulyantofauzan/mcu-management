/* Logika halaman Follow-Up (murni). Daftar = MCU terkini dengan hasil awal Follow-Up yang belum selesai. */
import { needsFollowUp } from '../dashboard/stats/filter.js';

export const PAGE_SIZE = 10;
const DAY = 24 * 60 * 60 * 1000;

export const followUpRows = models => models.filter(({ employee, mcu }) => employee?.isActive && needsFollowUp(mcu));

export function followUpStats(models, now = new Date()) {
  const rows = followUpRows(models);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completed = models.filter(({ employee, mcu }) => {
    if (!employee?.isActive || mcu.initialResult !== 'Follow-Up' || !mcu.finalResult || mcu.finalResult === 'Follow-Up') return false;
    const finishedAt = new Date(mcu.updatedAt || mcu.mcuDate);
    return finishedAt >= monthStart && finishedAt <= now;
  }).length;
  const cutoff = now.getTime() - 14 * DAY;
  const critical = rows.filter(({ mcu }) => new Date(mcu.mcuDate).getTime() < cutoff).length;
  return { total: rows.length, completed, critical };
}

export function searchRows(rows, { q = '', department = '' } = {}) {
  const term = q.trim().toLowerCase();
  return rows.filter(({ employee }) => {
    if (department && employee.department !== department) return false;
    return !term || String(employee.name).toLowerCase().includes(term) || String(employee.employeeId).toLowerCase().includes(term);
  });
}

export const departmentsOf = rows => [...new Set(rows.map(({ employee }) => employee.department))].filter(Boolean).sort();

export const shortNotes = (notes, max = 100) => {
  const text = String(notes || '');
  if (!text) return '-';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};
