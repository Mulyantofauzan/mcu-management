/* Riwayat MCU yang sudah ditinjau (view v_reviewed_mcu_history) untuk Analisis "Semua Tahun". */
import { selectAll } from './client.js';
import { transformEmployee, transformMcu } from './transform.js';

export async function getReviewedHistory() {
  const rows = await selectAll('v_reviewed_mcu_history', query => query.order('mcu_id'));
  return rows.map(row => ({ employee: transformEmployee(row.employee), mcu: transformMcu(row.mcu) }));
}
