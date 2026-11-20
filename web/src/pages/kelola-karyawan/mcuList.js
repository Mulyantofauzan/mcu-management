/* Tab "Data MCU" (murni): baris daftar MCU global, skor Jakarta, dan filter. */
import { jakartaScore, jakartaLevel, hasDiabetesHistory } from '../../lib/jakarta.js';
import { resultOf } from '../../lib/status.js';

export const PAGE_SIZE = 10;
export const LEVEL_LABEL = { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' };

export function buildMcuRows(mcus, employees, historiesByMcu, today = new Date()) {
  const byId = new Map(employees.map(employee => [employee.employeeId, employee]));
  return mcus.map(mcu => {
    const employee = byId.get(mcu.employeeId);
    const { score } = jakartaScore(employee, mcu, hasDiabetesHistory(historiesByMcu.get(mcu.mcuId)), today);
    return {
      mcuId: mcu.mcuId, employeeId: mcu.employeeId, name: employee?.name || 'Unknown', employee, mcu,
      date: mcu.mcuDate, year: new Date(mcu.mcuDate).getFullYear(), type: mcu.mcuType || '-', result: resultOf(mcu),
      score, level: employee ? jakartaLevel(score) : 0
    };
  });
}

export function filterMcuRows(rows, { q = '', year = '', type = '', result = '' } = {}) {
  const term = q.trim().toLowerCase();
  return rows.filter(row => {
    if (year && row.year !== Number(year)) return false;
    if (type && row.type !== type) return false;
    if (result && row.result !== result) return false;
    if (!term) return true;
    return [row.name, row.employeeId, row.mcuId].some(value => String(value || '').toLowerCase().includes(term));
  });
}

export const yearsOfRows = rows => [...new Set(rows.map(row => row.year).filter(Number.isFinite))].sort((a, b) => b - a);
