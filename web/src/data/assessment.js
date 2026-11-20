/* Sumber data Rahma: model analitik, riwayat penyakit, dan lab yang dipakai sindrom metabolik (GDP 7, TG 9, HDL 10). */
import { selectAll } from './client.js';

export async function getMetabolicLabs(mcuIds) {
  const ids = [...new Set(mcuIds.filter(Boolean))];
  const byMcu = new Map(ids.map(id => [String(id), []]));
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const rows = await selectAll('pemeriksaan_lab', query => query.in('mcu_id', batch).in('lab_item_id', [7, 9, 10]).is('deleted_at', null).limit(5000), 'mcu_id, lab_item_id, value');
    rows.forEach(row => byMcu.get(String(row.mcu_id))?.push(row));
  }
  return byMcu;
}
