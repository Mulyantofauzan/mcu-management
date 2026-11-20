/* Sumber data Laporan Periode: MCU pada rentang tanggal, karyawan, lab, dan item lab. */
import { selectAll } from './client.js';
import { listEmployees } from './employees.js';
import { transformMcu } from './transform.js';
import { getDepartments } from './reference.js';

export async function getMcusInRange(from, to) {
  const rows = await selectAll('mcus', query => query.gte('mcu_date', from).lte('mcu_date', to).is('deleted_at', null).order('mcu_date', { ascending: false }));
  return rows.map(row => ({ ...transformMcu(row), doctor: row.doctor }));
}

export async function loadReportSources(from, to) {
  const [mcus, employees] = await Promise.all([getMcusInRange(from, to), listEmployees({ includeInactive: true })]);
  return { mcus, employees };
}

export { getDepartments };

export async function getLabsForMcus(mcuIds) {
  const ids = [...new Set(mcuIds.filter(Boolean))];
  const byMcu = new Map(ids.map(id => [String(id), []]));
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const rows = await selectAll('pemeriksaan_lab', query => query.in('mcu_id', batch).is('deleted_at', null).limit(5000), 'id, mcu_id, lab_item_id, value');
    rows.forEach(row => byMcu.get(String(row.mcu_id))?.push(row));
  }
  return byMcu;
}

export async function getLabItems() {
  return selectAll('lab_items', query => query.is('deleted_at', null).order('id'), 'id, name');
}
