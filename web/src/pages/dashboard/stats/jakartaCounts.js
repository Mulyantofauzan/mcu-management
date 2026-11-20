/* Sebaran risiko kardiovaskular (Skor Jakarta) untuk karyawan pada hasil filter. */
import { jakartaScore, jakartaLevel, hasDiabetesHistory } from '../../../lib/jakarta.js';

export function jakartaCounts(models, historiesByMcu, today = new Date()) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  models.forEach(({ employee, mcu }) => {
    const diabetes = hasDiabetesHistory(historiesByMcu.get(mcu.mcuId));
    const level = jakartaLevel(jakartaScore(employee, mcu, diabetes, today).score);
    if (level) counts[level]++;
  });
  return [
    { label: 'Rendah <10%', value: counts[1] },
    { label: 'Sedang 10-20%', value: counts[2] },
    { label: 'Tinggi >20%', value: counts[3] }
  ];
}

export function groupHistories(histories) {
  const grouped = new Map();
  histories.forEach(history => {
    if (!grouped.has(history.mcuId)) grouped.set(history.mcuId, []);
    grouped.get(history.mcuId).push(history);
  });
  return grouped;
}
