/* Semua MCU yang belum dihapus untuk tab "Data MCU" (kolom secukupnya; daftar bisa ribuan baris). */
import { selectAll } from './client.js';
import { listEmployees } from './employees.js';
import { getMedicalHistories } from './reference.js';
import { transformMcu } from './transform.js';

const COLUMNS = 'mcu_id, employee_id, mcu_type, mcu_date, initial_result, final_result, status, blood_pressure, bmi, smoking_status, exercise_frequency';

export async function loadMcuListSources() {
  const [rows, employees, histories] = await Promise.all([
    selectAll('mcus', query => query.is('deleted_at', null).order('mcu_date', { ascending: false }).limit(20000), COLUMNS),
    listEmployees({ includeInactive: true }),
    getMedicalHistories().catch(() => [])
  ]);
  return { mcus: rows.map(transformMcu), employees, histories };
}
